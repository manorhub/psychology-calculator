import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import { NotFoundError, ForbiddenError, ValidationError, ExternalServiceError, UnauthorizedError } from '@/lib/errors';
import { ResultService } from '../result.service';
import { CreditService } from '../credit.service';
import { AuditService } from '../audit.service';
import { AIContextBuilder } from './ai-context-builder';
import { AIValidator } from './ai-validator';
import type { AIProvider, AIGenerationResponse } from './providers/ai-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import type {
  AssessmentAttemptRow,
  ReportRow,
  AiConfigurationRow,
  AiPromptRow,
  AIGenerationRow,
  AIReportData,
  AIProviderType
} from '@/types/database';

export class AIService extends BaseService {
  private readonly db: D1Database | null;
  private readonly resultService: ResultService;
  private readonly creditService: CreditService;
  private readonly providers: Map<AIProviderType, AIProvider>;
  private readonly env: Record<string, any>;

  constructor(db: D1Database | null, env: Record<string, any> = {}) {
    super('AIService');
    this.db = db;
    this.env = env;
    this.resultService = new ResultService(db);
    this.creditService = new CreditService(db);

    this.providers = new Map<AIProviderType, AIProvider>([
      ['gemini', new GeminiProvider()],
      ['openai', new OpenAIProvider()],
      ['openrouter', new OpenRouterProvider()],
      ['deepseek', new DeepSeekProvider()]
    ]);
  }

  /**
   * Generates a structured psychological narrative report for a completed assessment attempt
   */
  public async generateReportForAttempt(
    attemptId: string,
    userId?: string | null,
    guestSessionId?: string | null,
    overrideConfigId?: string
  ): Promise<AIReportData> {
    if (!this.db) throw new Error('Database unavailable');

    // 1. Verify Attempt & Strict Authentication Requirement
    if (!userId) {
      throw new UnauthorizedError('Authentication required: Please sign in or create an account with credits to generate an AI narrative report.');
    }

    const attempt = await fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [attemptId]
    );
    if (!attempt) throw new NotFoundError('Assessment attempt not found');
    this.assertAttemptOwnership(attempt, userId, guestSessionId);

    if (attempt.status !== 'completed') {
      throw new ValidationError('Assessment must be completed before generating an AI report');
    }

    // 2. Check for Existing AI Report (Idempotency)
    const existingReport = await fetchFirst<ReportRow>(
      this.db,
      "SELECT * FROM reports WHERE attempt_id = ? AND report_type = 'ai' AND status = 'completed'",
      [attemptId]
    );

    if (existingReport && existingReport.content_data) {
      const snapshot = await this.resultService.createOrGetSnapshot(attemptId);
      return {
        reportId: existingReport.id,
        attemptId: attempt.id,
        userId: attempt.user_id,
        assessmentName: snapshot.assessmentName,
        assessmentSlug: snapshot.assessmentSlug,
        primaryArchetype: snapshot.primaryResultType?.name || 'Assessed Profile',
        generatedAt: existingReport.generated_at || existingReport.created_at,
        provider: 'cached',
        model: 'cached',
        content: JSON.parse(existingReport.content_data),
        disclaimer: snapshot.disclaimer || 'Educational self-reflection only.'
      };
    }

    // 3. Load Frozen Result Snapshot
    const snapshot = await this.resultService.createOrGetSnapshot(attemptId);

    // 4. Resolve Active AI Configuration & Fallback
    const configs = await executeQuery<AiConfigurationRow>(
      this.db,
      'SELECT * FROM ai_configurations WHERE is_enabled = 1 ORDER BY priority ASC'
    );

    if (configs.length === 0) {
      throw new ExternalServiceError('No enabled AI provider configurations found');
    }

    const primaryConfig = overrideConfigId
      ? configs.find((c) => c.id === overrideConfigId) || configs[0]
      : configs[0];

    const fallbackConfig = primaryConfig.fallback_provider_id
      ? configs.find((c) => c.id === primaryConfig.fallback_provider_id)
      : configs.find((c) => c.id !== primaryConfig.id);

    // 5. Resolve AI Prompt Template
    const promptRow = await fetchFirst<AiPromptRow>(
      this.db,
      "SELECT * FROM ai_prompts WHERE status = 'active' ORDER BY version DESC LIMIT 1"
    );

    const promptTemplate =
      promptRow?.prompt_template ||
      'Synthesize an insightful, structured psychological report for {{assessment_name}}. Outcome: {{primary_result_name}}.\n\nDimensions:\n{{dimensions_summary}}';

    const systemPrompt =
      primaryConfig.system_prompt ||
      'You are a scientifically grounded psychological insight synthesizer for Psychology Calculator (psychologycalculator.com). Return valid JSON.';

    // 6. Build Context & User Prompt
    const fullUserPrompt = AIContextBuilder.buildInterpretationPrompt(promptTemplate, snapshot);

    // 7. Credit Check & Temporary Hold
    const creditCost = primaryConfig.credit_cost ?? 5;
    let creditsDeducted = false;

    if (userId && creditCost > 0) {
      const balance = await this.creditService.getUserBalance(userId);
      if (balance.balance < creditCost) {
        throw new ForbiddenError(
          `Insufficient credits: Generating this in-depth AI report requires ${creditCost} credits (current balance: ${balance.balance}).`
        );
      }
      await this.creditService.spendCredits(
        userId,
        creditCost,
        attemptId,
        `AI Report generation for ${snapshot.assessmentName}`
      );
      creditsDeducted = true;
    }

    // 8. Execute LLM Call with Automatic Fallback Chain
    const genId = crypto.randomUUID();
    const startTime = Date.now();
    let generationResponse: AIGenerationResponse | null = null;
    let usedConfig = primaryConfig;
    let errorCategory: string | null = null;
    let errorMessage: string | null = null;

    // Build candidate provider chain starting with primaryConfig followed by other enabled configs
    const candidateConfigs: AiConfigurationRow[] = [primaryConfig];
    for (const c of configs) {
      if (c.id !== primaryConfig.id && !candidateConfigs.some((existing) => existing.id === c.id)) {
        candidateConfigs.push(c);
      }
    }

    for (let i = 0; i < candidateConfigs.length; i++) {
      const currentCandidate = candidateConfigs[i];
      try {
        generationResponse = await this.executeProviderCall(currentCandidate, fullUserPrompt, systemPrompt);
        usedConfig = currentCandidate;
        errorMessage = null;
        break; // Success!
      } catch (providerErr: any) {
        this.logger.warn(`AI Provider (${currentCandidate.provider} - ${currentCandidate.model}) failed: ${providerErr.message}.`);
        errorMessage = providerErr.message;
        errorCategory = i === 0 ? 'primary_provider_failure' : 'provider_fallback_failure';
      }
    }

    // 9. If LLM call failed, refund credits & log failure
    if (!generationResponse) {
      if (userId && creditsDeducted) {
        await this.creditService.addCredits(
          userId,
          creditCost,
          'refund',
          `Refund for failed AI report generation: ${errorMessage}`
        );
      }

      await this.db
        .prepare(
          `INSERT INTO ai_generations (
             id, user_id, attempt_id, provider, model, prompt_slug, prompt_version,
             status, error_category, error_message, generation_time_ms, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 'failed', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .bind(
          genId,
          userId || null,
          attemptId,
          primaryConfig.provider,
          primaryConfig.model,
          promptRow?.slug || 'default',
          promptRow?.version || 1,
          errorCategory || 'unknown_error',
          errorMessage || 'AI generation failed',
          Date.now() - startTime
        )
        .run();

      throw new ExternalServiceError(`AI Generation failed: ${errorMessage}`);
    }

    // 10. Validate & Sanitize Structured Output
    let structuredContent;
    try {
      structuredContent = AIValidator.validateAndSanitize(generationResponse.contentJson);
    } catch (valErr: any) {
      // Refund credits if schema validation failed
      if (userId && creditsDeducted) {
        await this.creditService.addCredits(
          userId,
          creditCost,
          'refund',
          `Refund for malformed AI response schema`
        );
      }
      throw new ValidationError(`AI response validation failed: ${valErr.message}`);
    }

    // 11. Persist Report in D1
    const reportId = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO reports (
           id, user_id, attempt_id, report_type, status, content_data, generated_at, created_at, updated_at
         ) VALUES (?, ?, ?, 'ai', 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(reportId, userId || null, attemptId, JSON.stringify(structuredContent))
      .run();

    // 12. Persist Successful Generation Log
    const estimatedCost =
      (generationResponse.inputTokens * 0.00000015 + generationResponse.outputTokens * 0.0000006);

    await this.db
      .prepare(
        `INSERT INTO ai_generations (
           id, user_id, attempt_id, report_id, provider, model, prompt_slug, prompt_version,
           status, input_tokens, output_tokens, total_tokens, estimated_cost, generation_time_ms,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(
        genId,
        userId || null,
        attemptId,
        reportId,
        usedConfig.provider,
        usedConfig.model,
        promptRow?.slug || 'default',
        promptRow?.version || 1,
        generationResponse.inputTokens,
        generationResponse.outputTokens,
        generationResponse.totalTokens,
        estimatedCost,
        generationResponse.latencyMs
      )
      .run();

    return {
      reportId,
      attemptId,
      userId: userId || null,
      assessmentName: snapshot.assessmentName,
      assessmentSlug: snapshot.assessmentSlug,
      primaryArchetype: snapshot.primaryResultType?.name || 'Assessed Profile',
      generatedAt: new Date().toISOString(),
      provider: usedConfig.provider,
      model: usedConfig.model,
      content: structuredContent,
      disclaimer: snapshot.disclaimer || 'Educational self-reflection only.'
    };
  }

  /**
   * Retrieves an existing AI report with strict ownership authorization
   */
  public async getReport(
    reportId: string,
    userId?: string | null,
    guestSessionId?: string | null
  ): Promise<AIReportData> {
    if (!this.db) throw new Error('Database unavailable');

    const report = await fetchFirst<ReportRow>(
      this.db,
      'SELECT * FROM reports WHERE id = ?',
      [reportId]
    );

    if (!report) throw new NotFoundError('Report not found');

    const attempt = await fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [report.attempt_id]
    );

    if (!attempt) throw new NotFoundError('Associated assessment attempt not found');
    this.assertAttemptOwnership(attempt, userId, guestSessionId);

    const snapshot = await this.resultService.createOrGetSnapshot(attempt.id);

    return {
      reportId: report.id,
      attemptId: attempt.id,
      userId: report.user_id,
      assessmentName: snapshot.assessmentName,
      assessmentSlug: snapshot.assessmentSlug,
      primaryArchetype: snapshot.primaryResultType?.name || 'Assessed Profile',
      generatedAt: report.generated_at || report.created_at,
      provider: 'ai',
      model: 'report',
      content: JSON.parse(report.content_data || '{}'),
      disclaimer: snapshot.disclaimer || 'Educational self-reflection only.'
    };
  }

  /**
   * Admin: Queries AI generation logs
   */
  public async getGenerations(limit = 20, offset = 0): Promise<AIGenerationRow[]> {
    if (!this.db) return [];
    return executeQuery<AIGenerationRow>(
      this.db,
      'SELECT * FROM ai_generations ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  }

  /**
   * Admin: Computes aggregate AI analytics
   */
  public async getAIAnalytics(): Promise<{
    totalGenerations: number;
    successfulGenerations: number;
    failedGenerations: number;
    totalTokens: number;
    totalEstimatedCost: number;
    averageLatencyMs: number;
  }> {
    if (!this.db) {
      return { totalGenerations: 0, successfulGenerations: 0, failedGenerations: 0, totalTokens: 0, totalEstimatedCost: 0, averageLatencyMs: 0 };
    }

    const row = await fetchFirst<{
      total: number;
      successful: number;
      failed: number;
      tokens: number;
      cost: number;
      avg_latency: number;
    }>(
      this.db,
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
         SUM(total_tokens) as tokens,
         SUM(estimated_cost) as cost,
         AVG(generation_time_ms) as avg_latency
       FROM ai_generations`
    );

    return {
      totalGenerations: row?.total || 0,
      successfulGenerations: row?.successful || 0,
      failedGenerations: row?.failed || 0,
      totalTokens: row?.tokens || 0,
      totalEstimatedCost: Math.round((row?.cost || 0) * 10000) / 10000,
      averageLatencyMs: Math.round(row?.avg_latency || 0)
    };
  }

  /**
   * Admin: Returns all AI configurations
   */
  public async getConfigs(): Promise<AiConfigurationRow[]> {
    if (!this.db) return [];
    return executeQuery<AiConfigurationRow>(this.db, 'SELECT * FROM ai_configurations ORDER BY priority ASC');
  }

  /**
   * Checks if master AI feature flag is active
   */
  public async isMasterAiEnabled(): Promise<boolean> {
    if (!this.db) return true;
    const flag = await fetchFirst<{ is_enabled: number }>(
      this.db,
      "SELECT is_enabled FROM feature_flags WHERE key = 'ai_reports'"
    );
    return flag ? Boolean(flag.is_enabled) : true;
  }

  /**
   * Toggles master AI feature flag
   */
  public async toggleMasterAi(isEnabled: boolean, actorId: string): Promise<void> {
    if (!this.db) throw new Error('Database unavailable');
    await this.db
      .prepare("UPDATE feature_flags SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'ai_reports'")
      .bind(isEnabled ? 1 : 0)
      .run();

    const auditService = new AuditService(this.db);
    await auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_feature_flag_toggled',
      entityType: 'feature_flag',
      entityId: 'ai_reports',
      details: { isEnabled }
    });
  }

  /**
   * Toggles a single AI provider enabled status
   */
  public async toggleProvider(configId: string, isEnabled: boolean, actorId: string): Promise<void> {
    if (!this.db) throw new Error('Database unavailable');
    const config = await fetchFirst<AiConfigurationRow>(
      this.db,
      'SELECT * FROM ai_configurations WHERE id = ?',
      [configId]
    );
    if (!config) throw new NotFoundError('AI Configuration not found');

    await this.db
      .prepare('UPDATE ai_configurations SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(isEnabled ? 1 : 0, configId)
      .run();

    const auditService = new AuditService(this.db);
    await auditService.record({
      actorId,
      actorRole: 'admin',
      action: isEnabled ? 'admin_ai_provider_enabled' : 'admin_ai_provider_disabled',
      entityType: 'ai_configuration',
      entityId: configId,
      details: { provider: config.provider, model: config.model, isEnabled }
    });
  }

  /**
   * Updates provider configuration and optional API key
   */
  public async updateProviderConfig(
    configId: string,
    data: {
      model?: string;
      priority?: number;
      creditCost?: number;
      isEnabled?: boolean;
      apiKey?: string;
      systemPrompt?: string;
    },
    actorId: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database unavailable');
    const config = await fetchFirst<AiConfigurationRow>(
      this.db,
      'SELECT * FROM ai_configurations WHERE id = ?',
      [configId]
    );
    if (!config) throw new NotFoundError('AI Configuration not found');

    const newModel = data.model !== undefined ? data.model : config.model;
    const newPriority = data.priority !== undefined ? data.priority : config.priority;
    const newCreditCost = data.creditCost !== undefined ? data.creditCost : config.credit_cost;
    const newIsEnabled = data.isEnabled !== undefined ? (data.isEnabled ? 1 : 0) : config.is_enabled;
    const newSystemPrompt = data.systemPrompt !== undefined ? data.systemPrompt : config.system_prompt;

    await this.db
      .prepare(
        `UPDATE ai_configurations 
         SET model = ?, priority = ?, credit_cost = ?, is_enabled = ?, system_prompt = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`
      )
      .bind(newModel, newPriority, newCreditCost, newIsEnabled, newSystemPrompt, configId)
      .run();

    // If API Key is provided, store in site_settings securely
    if (data.apiKey && data.apiKey.trim()) {
      const secretKeyName = config.api_key_reference.toLowerCase();
      await this.db
        .prepare(
          `INSERT INTO site_settings (key, value, type, is_public, description, updated_at)
           VALUES (?, ?, 'string', 0, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
        )
        .bind(secretKeyName, data.apiKey.trim(), `${config.provider.toUpperCase()} API Key`)
        .run();
    }

    const auditService = new AuditService(this.db);
    await auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_ai_config_updated',
      entityType: 'ai_configuration',
      entityId: configId,
      details: {
        provider: config.provider,
        model: newModel,
        priority: newPriority,
        creditCost: newCreditCost,
        isEnabled: newIsEnabled === 1,
        apiKeyUpdated: Boolean(data.apiKey && data.apiKey.trim())
      }
    });
  }

  /**
   * Retrieves AI configs along with dynamic API key status
   */
  public async getConfigsWithKeyStatus(): Promise<
    Array<
      AiConfigurationRow & {
        hasApiKey: boolean;
        maskedKey: string | null;
        source: 'database' | 'environment' | 'missing';
      }
    >
  > {
    if (!this.db) return [];
    const configs = await this.getConfigs();

    const result = [];
    for (const cfg of configs) {
      const secretKeyName = cfg.api_key_reference.toLowerCase();
      const dbRow = await fetchFirst<{ value: string }>(
        this.db,
        'SELECT value FROM site_settings WHERE key = ?',
        [secretKeyName]
      );

      let key = dbRow?.value;
      let source: 'database' | 'environment' | 'missing' = 'database';

      if (!key) {
        key = this.env[cfg.api_key_reference] || process.env[cfg.api_key_reference];
        if (key) source = 'environment';
        else source = 'missing';
      }

      let maskedKey = null;
      if (key && key.length > 8) {
        maskedKey = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
      } else if (key) {
        maskedKey = '••••••••';
      }

      result.push({
        ...cfg,
        hasApiKey: Boolean(key),
        maskedKey,
        source
      });
    }

    return result;
  }

  /**
   * Admin: Returns all prompt templates
   */
  public async getPrompts(): Promise<AiPromptRow[]> {
    if (!this.db) return [];
    return executeQuery<AiPromptRow>(this.db, 'SELECT * FROM ai_prompts ORDER BY version DESC');
  }

  /**
   * Helper to execute a provider call with secret resolution
   */
  private async executeProviderCall(
    config: AiConfigurationRow,
    prompt: string,
    systemPrompt: string
  ): Promise<AIGenerationResponse> {
    const provider = this.providers.get(config.provider as AIProviderType);
    if (!provider) {
      throw new ExternalServiceError(`Unsupported AI provider: ${config.provider}`);
    }

    // Dynamic resolution: Check database site_settings first, then worker environment
    let apiKey: string | undefined;
    if (this.db) {
      const secretKeyName = config.api_key_reference.toLowerCase();
      const dbSetting = await fetchFirst<{ value: string }>(
        this.db,
        'SELECT value FROM site_settings WHERE key = ?',
        [secretKeyName]
      );
      if (dbSetting?.value) {
        apiKey = dbSetting.value;
      }
    }

    if (!apiKey) {
      apiKey = this.env[config.api_key_reference] || process.env[config.api_key_reference];
    }

    // Mock response fallback for local development or testing when API key is not present
    if (!apiKey) {
      return this.generateMockResponse(config.provider as AIProviderType, config.model);
    }

    return provider.generateStructured(prompt, systemPrompt, {
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.token_limit,
      timeoutMs: 90000,
      apiKey
    });
  }

  /**
   * Deterministic mock generator for testing & dev when no external keys are present
   */
  private generateMockResponse(provider: AIProviderType, model: string): AIGenerationResponse {
    const mockJson = JSON.stringify({
      headline: 'Balanced intellectual agility grounded by structured pragmatic execution and calm emotional composure.',
      summary:
        'Your comprehensive psychometric evaluation reveals a sophisticated, multidimensional psychological configuration. Your score pattern reflects a high degree of cognitive curiosity, balanced emotional self-regulation, and intentional interpersonal presence. Across evaluated scenarios, you demonstrate an ability to oscillate effectively between high-level conceptual ideation and disciplined, task-oriented execution.\n\nRather than leaning solely into rigid orthodoxy or unrestrained abstraction, your profile suggests a stable equilibrium. You approach complex dilemmas with measured analytical curiosity, synthesizing divergent viewpoints before committing to a course of action. In interpersonal environments, you project calm reliability and thoughtful boundaries, creating psychological safety for collaborators while preserving your internal bandwidth.\n\nThis pattern may indicate an adaptive mental model that thrives in environments characterized by intellectual autonomy, moderate ambiguity, and opportunities for continuous skill acquisition. By intentionally pairing your creative curiosity with structured accountability, you maximize both innovation and sustainable execution.',
      key_traits: [
        'Strategic and structured divergent ideation',
        'Grounded emotional composure under acute pressure',
        'Empathetic and active perspective-taking',
        'Deliberate boundary regulation and self-direction'
      ],
      dimension_analyses: [
        {
          dimension_name: 'Openness to Experience',
          score_percent: 78,
          level: 'High',
          what_it_measures: 'Receptivity to novel ideas, intellectual curiosity, and creative exploration.',
          personalized_interpretation:
            'Your score indicates high intellectual receptivity and an expansive cognitive appetite. You enjoy engaging with complex theoretical concepts, exploring cross-disciplinary insights, and questioning conventional assumptions. This trait allows you to navigate ambiguity with confidence and generate innovative solutions.',
          behavioral_expression: 'Actively seeks out new books, ideas, creative methodologies, and varied cultural perspectives.',
          key_strength: 'Agile conceptual synthesis and inventive problem solving.',
          potential_challenge: 'Occasional restlessness with repetitive or overly rigid procedural routines.',
          practical_reflection: 'Where in your weekly schedule can you deliberately cultivate unstructured ideation?'
        },
        {
          dimension_name: 'Conscientiousness',
          score_percent: 72,
          level: 'High',
          what_it_measures: 'Goal-directed persistence, methodical organization, and accountability.',
          personalized_interpretation:
            'You demonstrate a strong capacity for self-regulation, disciplined planning, and systematic follow-through. When committed to a project, you establish clear milestones and hold yourself to rigorous standards of craftsmanship and reliability.',
          behavioral_expression: 'Maintains structured workflows, prioritizes key objectives, and meets commitments reliably.',
          key_strength: 'Dependable execution and long-range strategic focus.',
          potential_challenge: 'Perfectionist tendencies or difficulty shifting gears when plans change suddenly.',
          practical_reflection: 'How might defining "good enough" on secondary tasks protect your creative energy?'
        },
        {
          dimension_name: 'Emotional Stability',
          score_percent: 68,
          level: 'Moderate-High',
          what_it_measures: 'Resilience against acute stressors, emotional equilibrium, and composure.',
          personalized_interpretation:
            'Your responses reflect solid emotional composure and resilience under everyday pressures. While you experience normal situational stress, you possess healthy coping mechanisms that allow you to recover equilibrium and maintain clear perspective.',
          behavioral_expression: 'Remains grounded during group tension and uses rational reframing to manage setbacks.',
          key_strength: 'Steady, non-reactive presence in high-stakes discussions.',
          potential_challenge: 'May occasionally internalize subtle chronic fatigue rather than expressing early discomfort.',
          practical_reflection: 'What bodily signals indicate that you need a deliberate restorative pause?'
        }
      ],
      cross_dimension_interactions: {
        core_pattern:
          'The intersection between your High Openness (78%) and High Conscientiousness (72%) forms a powerful creative-executor engine. While high openness alone can produce theoretical ideas without follow-through, and high conscientiousness alone can favor traditional routines, combining both allows you to innovate boldly and execute systematically.',
        trait_synergies: [
          'Visionary Ideation + Disciplined Execution: Ideas are rapidly converted into structured roadmaps.',
          'Intellectual Curiosity + Methodical Research: Deep-dive exploration is paired with rigorous fact-checking.'
        ],
        trait_tensions: [
          'Novelty Exploration vs. Milestone Deadlines: The desire to explore exciting new angles can occasionally challenge structured timelines.'
        ],
        situational_differences:
          'In low-pressure autonomous settings, your curiosity takes the lead, exploring expansive possibilities. Under high-stakes deadlines, your conscientiousness activates, streamlining focus and prioritizing core deliverables.'
      },
      strengths: [
        {
          title: 'Strategic Synthesis & Abstract Thinking',
          description:
            'You readily grasp the big picture, identifying subtle patterns across disparate data points and translating complex ideas into clear mental models.',
          context: 'System design, strategy formulation, and multifaceted problem resolution.'
        },
        {
          title: 'Composed & Grounded Presence',
          description:
            'Your emotional stability provides an anchor during turbulent situations, enabling you to make objective decisions without emotional distortion.',
          context: 'Crisis navigation, team mediation, and high-stakes decision moments.'
        },
        {
          title: 'Disciplined Autonomy',
          description:
            'You operate with high internal accountability, managing your schedule and driving outcomes without requiring continuous external oversight.',
          context: 'Independent research, remote workflows, and self-directed initiatives.'
        }
      ],
      challenges: [
        'Occasional cognitive overload from pursuing too many fascinating intellectual tangents simultaneously.',
        'Hesitation to delegate critical responsibilities due to high self-imposed quality standards.'
      ],
      growth_blindspots: [
        {
          title: 'The Perfectionist Delegation Trap',
          manifestation: 'Reluctance to hand off tasks because you anticipate needing to refine the output yourself.',
          impact: 'Bottlenecks in workflow throughput and subtle cumulative exhaustion.',
          constructive_response: 'Establish explicit "80/20 definition of done" criteria and empower peers with iterative feedback cycles.'
        },
        {
          title: 'Analysis Paralysis on Multivariable Decisions',
          manifestation: 'Excessive information gathering when faced with ambiguous tradeoffs.',
          impact: 'Delayed decision momentum on reversible, low-risk choices.',
          constructive_response: 'Apply a timeboxed 15-minute decision rule for two-way door decisions.'
        }
      ],
      communication:
        'You communicate with calm clarity, respectful inquiry, and structured articulation. You naturally synthesize points of agreement before addressing differences, ensuring collaborative alignment.',
      relationships:
        'In personal and professional relationships, you value deep authenticity, intellectual reciprocity, and consistent follow-through. You are a steady, supportive sounding board for those around you.',
      relationships_communication: {
        relational_style:
          'You build secure, trust-centered connections based on mutual respect and shared growth. You prefer meaningful, deep interactions over superficial socializing.',
        communication_style:
          'Your communication is articulate, measured, and open-minded. You state your perspective transparently while actively soliciting opposing viewpoints.',
        listening_conflict:
          'You practice reflective listening, seeking to understand the underlying emotional and logical roots of disagreements before advocating for a resolution.',
        partner_dynamics:
          'You deeply value partners and peers who are intellectually curious, emotionally grounded, and reliable in their commitments.',
        relationship_tips: [
          'Express emotional needs directly rather than expecting others to deduce them through subtext.',
          'Schedule regular unstructured check-ins with key partners to nurture relational connection.',
          'Acknowledge and celebrate small collaborative milestones along the journey.'
        ]
      },
      work_style:
        'Your work style is characterized by strategic planning, thoughtful iteration, and high self-discipline. You thrive in environments that grant intellectual autonomy and respect focused deep work.',
      work_leadership: {
        work_environment:
          'Optimal in quiet, autonomous, outcome-oriented settings that reward deep analytical focus and creative experimentation.',
        collaboration_teamwork:
          'Collaborative and respectful. You excel as a strategic synthesizer who helps teams harmonize complex inputs.',
        decision_problem_solving:
          'Evidence-based and hypothesis-driven. You balance intuition with empirical evaluation.',
        leadership_mentorship:
          'Empowering and consultative. You lead by modeling high craftsmanship, clear thinking, and empathetic mentorship.',
        workplace_strengths: [
          'Translating ambiguous goals into structured milestones',
          'Objective problem diagnosis and root-cause analysis',
          'Fostering a culture of intellectual safety and thoughtful debate'
        ],
        workplace_challenges: [
          'Frustration with bureaucratic, micromanaged processes',
          'Managing energy across prolonged periods of reactive context-switching'
        ]
      },
      stress_adaptability: {
        pressure_patterns:
          'Under acute pressure, you tend to retreat inward into deep analytical mode to dissect the situation before acting. This protects against rash impulses but can temporarily delay verbal communication.',
        adaptability_change:
          'You welcome evolutionary change that is supported by clear rationale, adapting quickly when given autonomy to architect the transition.',
        recovery_equilibrium:
          'Decompress through solitary intellectual pursuits, immersion in nature, physical exercise, or structured mental detachment from digital demands.'
      },
      growth_opportunities: [
        'Practice rapid low-stakes decision making to conserve valuable cognitive bandwidth.',
        'Incorporate intentional collaborative delegation in complex workflows.'
      ],
      practical_suggestions: [
        'Dedicate 15 minutes each morning to uninterrupted strategic prioritization.',
        'Conduct a weekly boundary audit to protect deep focus blocks.',
        'Engage in active perspective-taking during high-stakes discussions.'
      ],
      action_plan: [
        {
          goal: 'Streamline Low-Stakes Decision Speed',
          why_it_matters: 'Frees mental bandwidth for high-leverage strategic creative tasks.',
          action: 'Apply a 5-minute limit to daily operational choices (email sorting, scheduling, minor formatting).',
          frequency: 'Daily'
        },
        {
          goal: 'Cultivate Proactive Delegation Habits',
          why_it_matters: 'Prevents burnout and elevates team capability.',
          action: 'Delegate at least one complete project component per week with written success criteria.',
          frequency: 'Weekly'
        },
        {
          goal: 'Protect Dedicated Deep Work Sanctuaries',
          why_it_matters: 'Enables deep cognitive flow and sustained innovation.',
          action: 'Block two 90-minute distraction-free focus blocks on your calendar each week.',
          frequency: 'Twice Weekly'
        },
        {
          goal: 'Direct Emotional Communication Check-In',
          why_it_matters: 'Strengthens relational intimacy and prevents unspoken assumptions.',
          action: 'Express one explicit appreciation and one personal boundary openly with a trusted peer/partner.',
          frequency: 'Weekly'
        }
      ],
      final_synthesis: {
        top_takeaways: [
          'High cognitive curiosity paired with structured execution drives balanced problem solving.',
          'Grounded emotional composure provides psychological stability during acute stress.',
          'Empathetic perspective-taking enhances collaboration while intentional boundaries preserve bandwidth.',
          'A preference for autonomy and low friction allows for maximum creative flow.',
          'Practicing decisive delegation prevents over-functioning and sustains high-value output.'
        ],
        strongest_pattern: 'Your profile reflects a powerful synergy between intellectual exploration and methodical execution.',
        biggest_growth_opportunity: 'Developing proactive delegation habits and accelerating low-stakes decision cycles.',
        notable_trait: 'The harmonious pairing of creative curiosity and systematic execution.',
        primary_advantage: 'The ability to transform abstract ideas into structured, high-value outcomes.',
        growth_frontier: 'Empowering others through delegation and accelerating low-stakes decisions.',
        relationship_insight: 'Direct, vulnerable communication deepens your already solid trust foundation.',
        work_insight: 'Protecting deep focus time is essential for sustaining your highest-quality output.',
        next_step: 'Identify one task today where 80% completion is optimal, and ship it without hesitation.',
        reflection_questions: [
          'In which areas of your life are you currently holding back from delegating or sharing responsibility?',
          'How can you design your daily environment to reduce unnecessary cognitive friction?',
          'What ambitious creative project would you initiate if you knew your execution discipline would guarantee its completion?'
        ],
        closing_summary:
          'Your profile reflects a rare and powerful synergy of visionary exploration and grounded discipline. By honoring your natural boundaries, cultivating decisive delegation, and protecting your creative focus, you can sustain long-term growth and high-impact fulfillment.'
      }
    });

    return {
      contentJson: mockJson,
      inputTokens: 350,
      outputTokens: 420,
      totalTokens: 770,
      provider,
      model,
      latencyMs: 120
    };
  }

  private assertAttemptOwnership(
    attempt: AssessmentAttemptRow,
    userId?: string | null,
    guestSessionId?: string | null
  ): void {
    if (userId && attempt.user_id === userId) return;
    if (guestSessionId && attempt.session_id === guestSessionId) return;
    if (!attempt.user_id && !attempt.session_id) return;
    throw new ForbiddenError('Unauthorized: You do not have access to this assessment result.');
  }
}
