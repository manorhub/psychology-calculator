import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import { ValidationError, NotFoundError, ExternalServiceError } from '@/lib/errors';
import { DeepSeekProvider } from './ai/providers/deepseek.provider';
import { AuditService } from './audit.service';
import {
  type SupportedLocale,
  SUPPORTED_LANGUAGES,
  isValidLocale
} from '@/i18n';

export interface AssessmentSourceContent {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  long_description: string | null;
  instructions: string | null;
  disclaimer: string | null;
  seo_title: string | null;
  seo_description: string | null;
  category_id: string | null;
  category_name: string | null;
  dimensions: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  questions: Array<{
    id: string;
    dimension_id: string | null;
    question_text: string;
    question_order: number;
    options: Array<{
      id: string;
      option_text: string;
      option_value: number;
    }>;
  }>;
}

export interface TranslatedAssessmentPayload {
  name: string;
  short_description: string;
  long_description: string | null;
  instructions: string | null;
  disclaimer: string | null;
  seo_title: string | null;
  seo_description: string | null;
  dimensions: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  questions: Array<{
    id: string;
    question_text: string;
    options?: Array<{
      id: string;
      option_text: string;
    }>;
  }>;
}

export interface TranslationStatusMap {
  [locale: string]: {
    locale: string;
    languageName: string;
    nativeName: string;
    status: 'published' | 'draft' | 'missing';
    updatedAt: string | null;
  };
}

export class AssessmentTranslationService extends BaseService {
  private readonly db: D1Database | null;
  private readonly env: Record<string, any>;
  private readonly auditService: AuditService;
  private readonly deepSeekProvider: DeepSeekProvider;

  constructor(db: D1Database | null, env: Record<string, any> = {}) {
    super('AssessmentTranslationService');
    this.db = db;
    this.env = env;
    this.auditService = new AuditService(db);
    this.deepSeekProvider = new DeepSeekProvider();
  }

  /**
   * Fetches complete English source content for an assessment
   */
  public async getAssessmentSourceContent(assessmentId: string): Promise<AssessmentSourceContent> {
    if (!this.db) throw new Error('Database unavailable');

    const asm = await fetchFirst<{
      id: string;
      slug: string;
      name: string;
      short_description: string;
      long_description: string | null;
      instructions: string | null;
      disclaimer: string | null;
      category_id: string | null;
      category_name: string | null;
    }>(
      this.db,
      `SELECT a.id, a.slug, a.name, a.short_description, a.long_description, a.instructions, a.disclaimer,
              a.category_id, c.name as category_name
       FROM assessments a
       LEFT JOIN assessment_categories c ON a.category_id = c.id
       WHERE a.id = ? OR a.slug = ?`,
      [assessmentId, assessmentId]
    );

    if (!asm) {
      throw new NotFoundError(`Assessment not found: ${assessmentId}`);
    }

    const dimensions = await executeQuery<{
      id: string;
      name: string;
      description: string | null;
    }>(
      this.db,
      'SELECT id, name, description FROM assessment_dimensions WHERE assessment_id = ? ORDER BY display_order ASC, id ASC',
      [asm.id]
    );

    const questions = await executeQuery<{
      id: string;
      question_text: string;
      display_order: number;
    }>(
      this.db,
      'SELECT id, question_text, display_order FROM assessment_questions WHERE assessment_id = ? ORDER BY display_order ASC, id ASC',
      [asm.id]
    );

    const questionIds = questions.map((q) => q.id);
    let options: Array<{ id: string; question_id: string; option_text: string; option_value: string }> = [];

    if (questionIds.length > 0) {
      const placeholders = questionIds.map(() => '?').join(',');
      options = await executeQuery<{ id: string; question_id: string; option_text: string; option_value: string }>(
        this.db,
        `SELECT id, question_id, option_text, option_value FROM question_options WHERE question_id IN (${placeholders}) ORDER BY display_order ASC, id ASC`,
        questionIds
      );
    }

    const optionsByQ = new Map<string, Array<{ id: string; option_text: string; option_value: string }>>();
    for (const opt of options) {
      if (!optionsByQ.has(opt.question_id)) {
        optionsByQ.set(opt.question_id, []);
      }
      optionsByQ.get(opt.question_id)!.push({
        id: opt.id,
        option_text: opt.option_text,
        option_value: opt.option_value
      });
    }

    return {
      ...asm,
      seo_title: `${asm.name} | PsychologyCalculator.com`,
      seo_description: asm.short_description,
      dimensions,
      questions: questions.map((q) => ({
        ...q,
        dimension_id: null,
        question_order: q.display_order || 0,
        options: optionsByQ.get(q.id) || []
      }))
    };
  }

  /**
   * Retrieves translation status across all 5 target locales for an assessment
   */
  public async getTranslationStatusMap(assessmentId: string): Promise<TranslationStatusMap> {
    const targetLocales: SupportedLocale[] = ['es', 'fr', 'de', 'pt', 'hi'];
    const result: TranslationStatusMap = {};

    for (const loc of targetLocales) {
      const langConfig = SUPPORTED_LANGUAGES[loc];
      result[loc] = {
        locale: loc,
        languageName: langConfig.name,
        nativeName: langConfig.nativeName,
        status: 'missing',
        updatedAt: null
      };
    }

    if (!this.db) return result;

    const rows = await executeQuery<{
      locale: string;
      status: string | null;
      updated_at: string | null;
    }>(
      this.db,
      'SELECT locale, status, updated_at FROM assessment_translations WHERE assessment_id = ?',
      [assessmentId]
    );

    for (const r of rows) {
      if (result[r.locale]) {
        result[r.locale].status = (r.status as any) === 'draft' ? 'draft' : 'published';
        result[r.locale].updatedAt = r.updated_at;
      }
    }

    return result;
  }

  /**
   * Generates a complete AI translation draft for an assessment using DeepSeek API
   */
  public async generateAiTranslation(
    assessmentId: string,
    targetLocale: string,
    adminId?: string
  ): Promise<{
    source: AssessmentSourceContent;
    translation: TranslatedAssessmentPayload;
    meta: {
      model: string;
      latencyMs: number;
      inputTokens: number;
      outputTokens: number;
      targetLocale: string;
      targetLanguageName: string;
    };
  }> {
    if (targetLocale === 'en') {
      throw new ValidationError('English is the source language and cannot be selected as a translation target.');
    }

    if (!isValidLocale(targetLocale) || !['es', 'fr', 'de', 'pt', 'hi'].includes(targetLocale)) {
      throw new ValidationError(`Unsupported target language: ${targetLocale}. Supported target languages: es, fr, de, pt, hi.`);
    }

    const source = await this.getAssessmentSourceContent(assessmentId);
    const langInfo = SUPPORTED_LANGUAGES[targetLocale as SupportedLocale];

    // Build dedicated psychological translation prompt
    const systemPrompt = `You are a senior professional psychological-content translator, psychometrics editor, and localization specialist for PsychologyCalculator.com.

Translate the provided psychological assessment from English into ${langInfo.name} (${langInfo.nativeName} [${targetLocale}]).

CRITICAL INSTRUCTIONS:
1. Preserve exact psychological meaning, nuance, clinical empathy, and scientific tone.
2. NEVER modify scoring logic, option IDs, question IDs, dimension IDs, or order.
3. Use culturally fluent, native phrasing (not mechanical word-for-word translation).
4. Preserve established psychometric proper names and acronyms where appropriate (e.g. Big Five, OCEAN, Rosenberg, Thomas-Kilmann, EQ, etc.).
5. Maintain strict terminological consistency across title, descriptions, dimensions, questions, and options.
6. OUTPUT STRICTLY VALID JSON matching the specified JSON schema. Do not include markdown code fences or conversational text.`;

    const userPromptPayload = {
      target_language: {
        code: targetLocale,
        name: langInfo.name,
        native_name: langInfo.nativeName
      },
      assessment: {
        id: source.id,
        name: source.name,
        short_description: source.short_description,
        long_description: source.long_description,
        instructions: source.instructions,
        disclaimer: source.disclaimer,
        seo_title: source.seo_title || `${source.name} | PsychologyCalculator.com`,
        seo_description: source.seo_description || source.short_description,
        dimensions: source.dimensions.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description
        })),
        questions: source.questions.map((q) => ({
          id: q.id,
          question_text: q.question_text
        }))
      },
      required_json_format: {
        name: `Translated title in ${langInfo.name}`,
        short_description: `Translated short summary in ${langInfo.name}`,
        long_description: `Translated comprehensive description in ${langInfo.name}`,
        instructions: `Translated assessment instructions in ${langInfo.name}`,
        disclaimer: `Translated disclaimer in ${langInfo.name}`,
        seo_title: `SEO title in ${langInfo.name}`,
        seo_description: `SEO meta description in ${langInfo.name}`,
        dimensions: [
          {
            id: 'Exact dimension ID matching source',
            name: `Translated dimension name in ${langInfo.name}`,
            description: `Translated dimension description in ${langInfo.name}`
          }
        ],
        questions: [
          {
            id: 'Exact question ID matching source',
            question_text: `Translated question text in ${langInfo.name}`
          }
        ]
      }
    };

    const apiKey = await this.resolveDeepSeekApiKey();

    if (adminId && this.db) {
      await this.auditService.record({
        actorId: adminId,
        actorRole: 'admin',
        action: 'ASSESSMENT_TRANSLATION_STARTED',
        entityType: 'assessment_translation',
        entityId: `${source.id}_${targetLocale}`,
        details: { assessmentId: source.id, targetLocale }
      });
    }

    let genResponse;
    if (apiKey) {
      genResponse = await this.deepSeekProvider.generateStructured(
        JSON.stringify(userPromptPayload),
        systemPrompt,
        {
          apiKey,
          model: 'deepseek-chat',
          temperature: 0.3,
          maxTokens: 8192,
          timeoutMs: 120000
        }
      );
    } else {
      // Graceful fallback for local development without API key
      genResponse = this.generateFallbackDraft(source, targetLocale, langInfo);
    }

    let parsed: any;
    try {
      parsed = this.parseAndRepairJson(genResponse.contentJson);
    } catch (err) {
      throw new ExternalServiceError(`Failed to parse DeepSeek JSON translation response: ${String(err)}`);
    }

    // QA Validation
    const validatedTranslation = this.validateAndNormalizeTranslation(source, parsed, targetLocale);

    if (adminId && this.db) {
      await this.auditService.record({
        actorId: adminId,
        actorRole: 'admin',
        action: 'ASSESSMENT_TRANSLATION_COMPLETED',
        entityType: 'assessment_translation',
        entityId: `${source.id}_${targetLocale}`,
        details: {
          assessmentId: source.id,
          targetLocale,
          tokens: genResponse.totalTokens,
          latencyMs: genResponse.latencyMs
        }
      });
    }

    return {
      source,
      translation: validatedTranslation,
      meta: {
        model: genResponse.model,
        latencyMs: genResponse.latencyMs,
        inputTokens: genResponse.inputTokens,
        outputTokens: genResponse.outputTokens,
        targetLocale,
        targetLanguageName: langInfo.name
      }
    };
  }

  /**
   * Saves and approves / drafts the reviewed translation into D1
   */
  public async saveTranslation(
    assessmentId: string,
    targetLocale: string,
    payload: TranslatedAssessmentPayload,
    status: 'draft' | 'published' = 'published',
    adminId: string = 'admin'
  ): Promise<{ success: boolean; translationId: string }> {
    if (!this.db) throw new Error('Database unavailable');

    if (targetLocale === 'en') {
      throw new ValidationError('English is the source language and cannot be saved as a translation.');
    }

    if (!isValidLocale(targetLocale)) {
      throw new ValidationError(`Invalid target locale: ${targetLocale}`);
    }

    const source = await this.getAssessmentSourceContent(assessmentId);
    const validated = this.validateAndNormalizeTranslation(source, payload, targetLocale);
    const translationId = `trans_${source.id}_${targetLocale}`;

    // 1. Insert or Replace Assessment Translation
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO assessment_translations (
          id, assessment_id, locale, name, short_description, long_description,
          instructions, disclaimer, seo_title, seo_description, status, updated_at, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )`
      )
      .bind(
        translationId,
        source.id,
        targetLocale,
        validated.name,
        validated.short_description,
        validated.long_description || null,
        validated.instructions || null,
        validated.disclaimer || null,
        validated.seo_title || null,
        validated.seo_description || null,
        status
      )
      .run();

    // 2. Insert or Replace Dimension Translations
    for (const dim of validated.dimensions) {
      const dimTransId = `trans_${dim.id}_${targetLocale}`;
      await this.db
        .prepare(
          `INSERT OR REPLACE INTO assessment_dimension_translations (
            id, dimension_id, locale, name, description
          ) VALUES (?, ?, ?, ?, ?)`
        )
        .bind(dimTransId, dim.id, targetLocale, dim.name, dim.description || null)
        .run();
    }

    // 3. Insert or Replace Question Translations
    for (const q of validated.questions) {
      const qTransId = `trans_${q.id}_${targetLocale}`;
      await this.db
        .prepare(
          `INSERT OR REPLACE INTO assessment_question_translations (
            id, question_id, locale, question_text
          ) VALUES (?, ?, ?, ?)`
        )
        .bind(qTransId, q.id, targetLocale, q.question_text)
        .run();

      // Options
      if (q.options && q.options.length > 0) {
        for (const opt of q.options) {
          const optTransId = `trans_${opt.id}_${targetLocale}`;
          await this.db
            .prepare(
              `INSERT OR REPLACE INTO question_option_translations (
                id, option_id, locale, option_text
              ) VALUES (?, ?, ?, ?)`
            )
            .bind(optTransId, opt.id, targetLocale, opt.option_text)
            .run();
        }
      }
    }

    await this.auditService.record({
      actorId: adminId,
      actorRole: 'admin',
      action: status === 'published' ? 'ASSESSMENT_TRANSLATION_APPROVED' : 'ASSESSMENT_TRANSLATION_SAVED',
      entityType: 'assessment_translation',
      entityId: translationId,
      details: { assessmentId: source.id, targetLocale, status }
    });

    return { success: true, translationId };
  }

  /**
   * Strict validation ensuring zero scoring manipulation and ID matching
   */
  private validateAndNormalizeTranslation(
    source: AssessmentSourceContent,
    raw: any,
    targetLocale: string
  ): TranslatedAssessmentPayload {
    if (!raw.name || typeof raw.name !== 'string') {
      throw new ValidationError('Translation payload must contain a valid translated name/title.');
    }
    if (!raw.short_description || typeof raw.short_description !== 'string') {
      throw new ValidationError('Translation payload must contain a valid short_description.');
    }

    // Dimensions QA
    const rawDims: any[] = Array.isArray(raw.dimensions) ? raw.dimensions : [];
    const normalizedDimensions = source.dimensions.map((srcDim) => {
      const matched = rawDims.find((d) => d.id === srcDim.id);
      return {
        id: srcDim.id,
        name: matched?.name || srcDim.name,
        description: matched?.description || srcDim.description
      };
    });

    // Questions QA
    const rawQuestions: any[] = Array.isArray(raw.questions) ? raw.questions : [];
    const normalizedQuestions = source.questions.map((srcQ) => {
      const matchedQ = rawQuestions.find((q) => q.id === srcQ.id);
      const translatedQText = matchedQ?.question_text || srcQ.question_text;

      // Options QA
      const matchedOptions: any[] = Array.isArray(matchedQ?.options) ? matchedQ.options : [];
      const normalizedOptions = srcQ.options.map((srcOpt) => {
        const matchedOpt = matchedOptions.find((o) => o.id === srcOpt.id);
        return {
          id: srcOpt.id,
          option_text: matchedOpt?.option_text || srcOpt.option_text
        };
      });

      return {
        id: srcQ.id,
        question_text: translatedQText,
        options: normalizedOptions
      };
    });

    return {
      name: raw.name.trim(),
      short_description: raw.short_description.trim(),
      long_description: raw.long_description || source.long_description,
      instructions: raw.instructions || source.instructions,
      disclaimer: raw.disclaimer || source.disclaimer,
      seo_title: raw.seo_title || `${raw.name.trim()} | PsychologyCalculator.com`,
      seo_description: raw.seo_description || raw.short_description.trim(),
      dimensions: normalizedDimensions,
      questions: normalizedQuestions
    };
  }

  /**
   * Cleans and defensively parses / repairs JSON from DeepSeek output
   */
  public parseAndRepairJson(raw: string): any {
    let cleaned = (raw || '').trim();

    // 1. Remove markdown backticks if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    // 2. Try parsing directly
    try {
      return JSON.parse(cleaned);
    } catch (initialErr) {
      // 3. Clean trailing commas and non-printable control characters
      try {
        const sanitized = cleaned
          .replace(/[\u0000-\u001F\u007F-\u009F]+/g, ' ')
          .replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(sanitized);
      } catch {
        // 4. Attempt heuristic closure of cut-off strings/arrays/objects
        try {
          let fixed = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]+/g, ' ');
          
          // Remove incomplete trailing key/value pair up to last valid comma or bracket
          const lastValidDelimiter = Math.max(
            fixed.lastIndexOf('},'),
            fixed.lastIndexOf('"],'),
            fixed.lastIndexOf('",'),
            fixed.lastIndexOf('}')
          );

          if (lastValidDelimiter > fixed.length * 0.7) {
            fixed = fixed.substring(0, lastValidDelimiter + 1);
          }

          // Count open and close brackets
          const openBraces = (fixed.match(/{/g) || []).length;
          const closeBraces = (fixed.match(/}/g) || []).length;
          const openBrackets = (fixed.match(/\[/g) || []).length;
          const closeBrackets = (fixed.match(/\]/g) || []).length;
          const quotes = (fixed.match(/(?<!\\)"/g) || []).length;

          if (quotes % 2 !== 0) {
            fixed += '"';
          }

          for (let i = 0; i < openBrackets - closeBrackets; i++) {
            fixed += ']';
          }
          for (let i = 0; i < openBraces - closeBraces; i++) {
            fixed += '}';
          }

          return JSON.parse(fixed);
        } catch {
          throw initialErr;
        }
      }
    }
  }

  private async resolveDeepSeekApiKey(): Promise<string | undefined> {
    if (this.db) {
      try {
        const setting = await fetchFirst<{ value: string }>(
          this.db,
          'SELECT value FROM site_settings WHERE key = ?',
          ['deepseek_api_key']
        );
        if (setting?.value) return setting.value;
      } catch (err) {
        this.logger.warn('Failed to query site_settings for deepseek_api_key', { error: String(err) });
      }
    }
    return this.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
  }

  private generateFallbackDraft(
    source: AssessmentSourceContent,
    targetLocale: string,
    langInfo: { name: string; nativeName: string }
  ) {
    const mockJson = JSON.stringify({
      name: `${source.name} (${langInfo.nativeName})`,
      short_description: `${source.short_description} [${langInfo.name}]`,
      long_description: source.long_description,
      instructions: source.instructions,
      disclaimer: source.disclaimer,
      seo_title: `${source.name} | PsychologyCalculator.com`,
      seo_description: source.short_description,
      dimensions: source.dimensions.map((d) => ({
        id: d.id,
        name: `${d.name} (${langInfo.nativeName})`,
        description: d.description
      })),
      questions: source.questions.map((q) => ({
        id: q.id,
        question_text: `${q.question_text} [${langInfo.nativeName}]`,
        options: q.options.map((o) => ({
          id: o.id,
          option_text: o.option_text
        }))
      }))
    });

    return {
      contentJson: mockJson,
      inputTokens: 500,
      outputTokens: 600,
      totalTokens: 1100,
      provider: 'deepseek' as const,
      model: 'deepseek-chat (mock/dev)',
      latencyMs: 150
    };
  }
}
