import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import { NotFoundError, ForbiddenError, ValidationError, ExternalServiceError } from '@/lib/errors';
import { ResultService } from '../result.service';
import { CreditService } from '../credit.service';
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

    // 1. Verify Attempt & Ownership
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

    // 8. Execute LLM Call with Automatic Fallback
    const genId = crypto.randomUUID();
    const startTime = Date.now();
    let generationResponse: AIGenerationResponse | null = null;
    let usedConfig = primaryConfig;
    let errorCategory: string | null = null;
    let errorMessage: string | null = null;

    try {
      generationResponse = await this.executeProviderCall(primaryConfig, fullUserPrompt, systemPrompt);
    } catch (primaryErr: any) {
      this.logger.warn(`Primary provider (${primaryConfig.provider}) failed: ${primaryErr.message}. Trying fallback...`);
      if (fallbackConfig) {
        try {
          usedConfig = fallbackConfig;
          generationResponse = await this.executeProviderCall(fallbackConfig, fullUserPrompt, systemPrompt);
        } catch (fallbackErr: any) {
          errorCategory = 'provider_fallback_failure';
          errorMessage = `Both primary (${primaryErr.message}) and fallback (${fallbackErr.message}) failed`;
        }
      } else {
        errorCategory = 'primary_provider_failure';
        errorMessage = primaryErr.message;
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

    const apiKey = this.env[config.api_key_reference] || process.env[config.api_key_reference];

    // Mock response fallback for local development or testing when API key is not present
    if (!apiKey) {
      return this.generateMockResponse(config.provider as AIProviderType, config.model);
    }

    return provider.generateStructured(prompt, systemPrompt, {
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.token_limit,
      apiKey
    });
  }

  /**
   * Deterministic mock generator for testing & dev when no external keys are present
   */
  private generateMockResponse(provider: AIProviderType, model: string): AIGenerationResponse {
    const mockJson = JSON.stringify({
      summary:
        'Your comprehensive psychometric evaluation reveals a balanced and reflective psychological profile. You exhibit strong cognitive clarity, healthy self-regulation, and an aptitude for synthesizing complex emotional and analytical signals in daily interactions.',
      key_traits: [
        'Strategic and structured thinking',
        'Grounded emotional composure under acute stress',
        'Empathetic and active interpersonal listening'
      ],
      strengths: [
        'High capacity for abstract conceptualization and innovative problem solving',
        'Resilient boundary setting while preserving positive relationships',
        'Deliberate, goal-oriented milestone execution'
      ],
      challenges: [
        'Tendency to over-analyze straightforward decisions during fatigue',
        'Occasional reluctance to delegate mission-critical tasks'
      ],
      communication:
        'You communicate with calm assertiveness and transparent clarity. You prefer direct, evidence-based dialogue while honoring the perspectives and emotional boundaries of your interlocutors.',
      relationships:
        'In close interpersonal dynamics, you value deep mutual trust, consistent follow-through, and emotional safety. You provide steady stability during relational turbulence.',
      work_style:
        'Your professional approach combines methodical organization with creative experimentation. You thrive in autonomous environments where you can establish clear milestones.',
      growth_opportunities: [
        'Practice rapid low-stakes decision making to reduce cognitive fatigue',
        'Incorporate intentional collaborative delegation in complex workflows'
      ],
      practical_suggestions: [
        'Dedicate 10 minutes each morning to reflective goal prioritization',
        'Conduct a weekly boundary audit to preserve personal cognitive bandwidth',
        'Engage in active perspective-taking during high-stakes discussions'
      ]
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
