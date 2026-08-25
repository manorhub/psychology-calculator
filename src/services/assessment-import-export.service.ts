import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import { executeQuery, executeMutation, fetchFirst } from '@/lib/db/query';
import { ValidationError, NotFoundError } from '@/lib/errors';

export interface AssessmentOptionSchema {
  text: string;
  value: string;
  score?: number;
  order?: number;
}

export interface AssessmentQuestionSchema {
  id?: string;
  text: string;
  type?: 'likert' | 'multiple_choice' | 'yes_no' | 'ranking';
  dimension_key: string;
  order?: number;
  required?: boolean | number;
  reverse_scored?: boolean | number;
  options: AssessmentOptionSchema[];
}

export interface AssessmentDimensionSchema {
  key: string;
  name: string;
  description?: string;
  display_order?: number;
}

export interface AssessmentResultContentSchema {
  section_type: 'overview' | 'strengths' | 'challenges' | 'communication' | 'relationships' | 'work_style' | 'growth_suggestions' | 'recommendations' | 'custom';
  title: string;
  content: string;
  display_order?: number;
}

export interface AssessmentResultProfileSchema {
  name: string;
  slug?: string;
  description?: string;
  dimension_key?: string;
  minimum_score?: number;
  maximum_score?: number;
  display_order?: number;
  content_sections?: AssessmentResultContentSchema[];
}

export interface AssessmentFaqSchema {
  question: string;
  answer: string;
  display_order?: number;
}

export interface AssessmentSeoSchema {
  title?: string;
  description?: string;
  canonical_url?: string;
  og_image_url?: string;
  noindex?: boolean;
}

export interface AssessmentExportSchema {
  schema_version: '1.0';
  assessment: {
    name: string;
    slug: string;
    short_description: string;
    long_description?: string;
    instructions?: string;
    category_slug: string;
    access_type?: 'free' | 'premium' | 'credit_only';
    estimated_minutes?: number;
    status?: 'draft' | 'published' | 'archived';
    featured?: number | boolean;
    disclaimer?: string;
  };
  dimensions?: AssessmentDimensionSchema[];
  questions: AssessmentQuestionSchema[];
  result_profiles?: AssessmentResultProfileSchema[];
  faqs?: AssessmentFaqSchema[];
  seo?: AssessmentSeoSchema;
  settings?: {
    allow_guest_taking?: boolean;
    instant_results?: boolean;
  };
}

export interface ValidationIssue {
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  schemaVersion: string;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  preview: {
    title: string;
    slug: string;
    categorySlug: string;
    categoryName?: string;
    questionCount: number;
    dimensionCount: number;
    dimensions: string[];
    resultProfileCount: number;
    resultProfiles: string[];
    accessType: string;
    estimatedMinutes: number;
    seoTitle?: string;
    faqCount: number;
  };
  slugConflict: {
    exists: boolean;
    existingAssessmentId?: string;
    existingAssessmentName?: string;
    existingStatus?: string;
  };
}

export interface ImportOptions {
  mode: 'create_new' | 'create_with_new_slug' | 'update_existing';
  newSlug?: string;
  fileName?: string;
  actorId?: string;
}

export interface ImportHistoryRow {
  id: string;
  file_name: string;
  assessment_id: string | null;
  assessment_name: string;
  assessment_slug: string;
  status: 'success' | 'failed' | 'partial_blocked';
  imported_by: string | null;
  schema_version: string;
  error_count: number;
  warning_count: number;
  errors_json: string | null;
  warnings_json: string | null;
  metadata_json: string | null;
  created_at: string;
  importer_name?: string;
  importer_email?: string;
}

export const REQUIRED_CSV_HEADERS = [
  'assessment_slug',
  'assessment_title',
  'category_slug',
  'question_id',
  'question_order',
  'question_text',
  'question_type',
  'required',
  'dimension',
  'weight',
  'reverse',
  'option_1',
  'option_2',
  'option_3',
  'option_4',
  'option_5',
  'score_1',
  'score_2',
  'score_3',
  'score_4',
  'score_5'
];

export interface CsvParsedRow {
  assessment_slug: string;
  assessment_title: string;
  category_slug: string;
  question_id: string;
  question_order: number;
  question_text: string;
  question_type: string;
  required: boolean;
  dimension: string;
  weight: number;
  reverse: boolean;
  options: { text: string; score: number }[];
  _rowIndex: number;
}

export interface CsvAssessmentGroup {
  slug: string;
  title: string;
  categorySlug: string;
  categoryName?: string;
  questionCount: number;
  dimensions: { key: string; name: string }[];
  rows: CsvParsedRow[];
  slugConflict: {
    exists: boolean;
    existingAssessmentId?: string;
    existingAssessmentName?: string;
    existingStatus?: string;
  };
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface CsvValidationResult {
  valid: boolean;
  format: 'csv';
  assessmentCount: number;
  assessments: CsvAssessmentGroup[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface CsvImportOptions {
  assessmentModes: Record<string, 'create_new' | 'create_with_new_slug' | 'update_existing'>;
  customSlugs?: Record<string, string>;
  fileName?: string;
  actorId?: string;
}

export class AssessmentImportExportService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('AssessmentImportExportService');
    this.db = db;
  }

  /**
   * Comprehensive validation of raw JSON (Structure, Types, and Semantic Relationships)
   */
  public async validateJson(raw: unknown): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    if (!raw || typeof raw !== 'object') {
      errors.push({ field: 'root', message: 'Input must be a valid non-empty JSON object.' });
      return this.buildInvalidResult(errors, warnings);
    }

    const data = raw as Partial<AssessmentExportSchema>;

    // 1. Schema Version Check
    if (!data.schema_version) {
      errors.push({ field: 'schema_version', message: 'Missing required field: "schema_version" (e.g. "1.0").' });
    } else if (data.schema_version !== '1.0') {
      errors.push({
        field: 'schema_version',
        message: `Unsupported schema version "${data.schema_version}". Current supported version is "1.0".`
      });
    }

    // 2. Assessment Root Meta Validation
    if (!data.assessment || typeof data.assessment !== 'object') {
      errors.push({ field: 'assessment', message: 'Missing required object: "assessment".' });
    }

    const asm = data.assessment || ({} as any);

    if (!asm.name || typeof asm.name !== 'string' || asm.name.trim().length === 0) {
      errors.push({ field: 'assessment.name', message: 'Assessment title/name is required.' });
    }

    if (!asm.slug || typeof asm.slug !== 'string' || asm.slug.trim().length === 0) {
      errors.push({ field: 'assessment.slug', message: 'Assessment URL slug is required.' });
    } else if (!/^[a-z0-9-]+$/.test(asm.slug)) {
      errors.push({
        field: 'assessment.slug',
        message: `Invalid slug format "${asm.slug}". Slugs must contain only lowercase letters, numbers, and hyphens.`
      });
    }

    if (!asm.short_description || typeof asm.short_description !== 'string') {
      errors.push({ field: 'assessment.short_description', message: 'Short description is required.' });
    } else if (asm.short_description.length < 20) {
      warnings.push({
        field: 'assessment.short_description',
        message: 'Short description is very short (under 20 characters).'
      });
    }

    if (!asm.category_slug || typeof asm.category_slug !== 'string') {
      errors.push({ field: 'assessment.category_slug', message: 'Assessment category slug is required.' });
    }

    const validAccessTypes = ['free', 'premium', 'credit_only'];
    if (asm.access_type && !validAccessTypes.includes(asm.access_type)) {
      errors.push({
        field: 'assessment.access_type',
        message: `Invalid access_type "${asm.access_type}". Must be one of: ${validAccessTypes.join(', ')}.`
      });
    }

    // 3. Category Verification in Database
    let categoryRow: { id: string; name: string } | null = null;
    if (this.db && asm.category_slug) {
      categoryRow = await fetchFirst<{ id: string; name: string }>(
        this.db,
        `SELECT id, name FROM assessment_categories WHERE slug = ?`,
        [asm.category_slug]
      );
      if (!categoryRow) {
        errors.push({
          field: 'assessment.category_slug',
          message: `Category with slug "${asm.category_slug}" does not exist in the database.`
        });
      }
    }

    // 4. Dimensions Validation
    const dimensionKeySet = new Set<string>();
    const dimensionList = Array.isArray(data.dimensions) ? data.dimensions : [];

    for (let i = 0; i < dimensionList.length; i++) {
      const dim = dimensionList[i];
      if (!dim.key || typeof dim.key !== 'string') {
        errors.push({ field: `dimensions[${i}].key`, message: `Dimension at index ${i} requires a unique "key".` });
      } else {
        const cleanKey = dim.key.toLowerCase().trim();
        if (dimensionKeySet.has(cleanKey)) {
          errors.push({ field: `dimensions[${i}].key`, message: `Duplicate dimension key found: "${cleanKey}".` });
        }
        dimensionKeySet.add(cleanKey);
      }

      if (!dim.name || typeof dim.name !== 'string') {
        errors.push({ field: `dimensions[${i}].name`, message: `Dimension at index ${i} requires a "name".` });
      }
    }

    if (dimensionList.length === 0) {
      warnings.push({
        field: 'dimensions',
        message: 'No distinct psychological dimensions specified. Default unipolar scoring will be applied.'
      });
    }

    // 5. Questions Validation
    const questions = Array.isArray(data.questions) ? data.questions : [];
    if (questions.length === 0) {
      errors.push({ field: 'questions', message: 'Assessment must contain at least one question.' });
    }

    const questionIdSet = new Set<string>();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qRef = q.id || `Question #${i + 1}`;

      if (q.id) {
        if (questionIdSet.has(q.id)) {
          errors.push({ field: `questions[${i}].id`, message: `Duplicate question ID detected: "${q.id}".` });
        }
        questionIdSet.add(q.id);
      }

      if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) {
        errors.push({ field: `questions[${i}].text`, message: `${qRef}: Question prompt text cannot be empty.` });
      }

      // Semantic Check: Question Dimension Reference
      if (q.dimension_key) {
        const cleanDimKey = q.dimension_key.toLowerCase().trim();
        if (dimensionKeySet.size > 0 && !dimensionKeySet.has(cleanDimKey)) {
          errors.push({
            field: `questions[${i}].dimension_key`,
            message: `${qRef}: References dimension "${q.dimension_key}", but that dimension is not declared in dimensions.`
          });
        }
      }

      // Options validation
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push({
          field: `questions[${i}].options`,
          message: `${qRef}: Must have at least 2 selectable answer options.`
        });
      } else {
        const optionValueSet = new Set<string>();
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j];
          if (!opt.text || typeof opt.text !== 'string') {
            errors.push({
              field: `questions[${i}].options[${j}].text`,
              message: `${qRef} Option #${j + 1}: Option text is required.`
            });
          }
          if (opt.value === undefined || opt.value === null || String(opt.value).trim() === '') {
            errors.push({
              field: `questions[${i}].options[${j}].value`,
              message: `${qRef} Option #${j + 1}: Option value is required.`
            });
          } else {
            const vStr = String(opt.value);
            if (optionValueSet.has(vStr)) {
              errors.push({
                field: `questions[${i}].options[${j}].value`,
                message: `${qRef}: Duplicate option value "${vStr}".`
              });
            }
            optionValueSet.add(vStr);
          }
        }
      }
    }

    // 6. Result Profiles & Archetypes Validation
    const profiles = Array.isArray(data.result_profiles) ? data.result_profiles : [];
    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];
      if (!p.name || typeof p.name !== 'string') {
        errors.push({ field: `result_profiles[${i}].name`, message: `Result profile #${i + 1}: Name is required.` });
      }

      if (p.dimension_key && dimensionKeySet.size > 0) {
        const cleanDimKey = p.dimension_key.toLowerCase().trim();
        if (!dimensionKeySet.has(cleanDimKey)) {
          errors.push({
            field: `result_profiles[${i}].dimension_key`,
            message: `Result profile "${p.name}" references undeclared dimension "${p.dimension_key}".`
          });
        }
      }

      if (p.minimum_score !== undefined && p.maximum_score !== undefined) {
        if (Number(p.minimum_score) > Number(p.maximum_score)) {
          errors.push({
            field: `result_profiles[${i}]`,
            message: `Result profile "${p.name}": minimum_score (${p.minimum_score}) cannot be greater than maximum_score (${p.maximum_score}).`
          });
        }
      }
    }

    if (profiles.length === 0) {
      warnings.push({
        field: 'result_profiles',
        message: 'No result archetypes or score ranges defined. Generic baseline scoring will be generated.'
      });
    }

    // 7. SEO & FAQs Warnings
    if (!data.seo?.og_image_url) {
      warnings.push({ field: 'seo.og_image_url', message: 'No OpenGraph social share image URL specified.' });
    }
    if (!data.faqs || data.faqs.length === 0) {
      warnings.push({ field: 'faqs', message: 'No FAQs provided. Assessment FAQ accordion will remain empty.' });
    }

    // 8. Slug Conflict Check in Database
    let slugConflict = {
      exists: false,
      existingAssessmentId: undefined as string | undefined,
      existingAssessmentName: undefined as string | undefined,
      existingStatus: undefined as string | undefined
    };

    if (this.db && asm.slug) {
      const existing = await fetchFirst<{ id: string; name: string; status: string }>(
        this.db,
        `SELECT id, name, status FROM assessments WHERE slug = ?`,
        [asm.slug]
      );
      if (existing) {
        slugConflict = {
          exists: true,
          existingAssessmentId: existing.id,
          existingAssessmentName: existing.name,
          existingStatus: existing.status
        };
      }
    }

    const preview = {
      title: asm.name || 'Untitled Assessment',
      slug: asm.slug || '',
      categorySlug: asm.category_slug || '',
      categoryName: categoryRow?.name || asm.category_slug || 'General',
      questionCount: questions.length,
      dimensionCount: dimensionList.length,
      dimensions: dimensionList.map((d) => d.name || d.key),
      resultProfileCount: profiles.length,
      resultProfiles: profiles.map((p) => p.name),
      accessType: asm.access_type || 'free',
      estimatedMinutes: Number(asm.estimated_minutes) || Math.ceil(questions.length * 0.5) || 5,
      seoTitle: data.seo?.title || `${asm.name} | Psychology Calculator`,
      faqCount: Array.isArray(data.faqs) ? data.faqs.length : 0
    };

    return {
      valid: errors.length === 0,
      schemaVersion: data.schema_version || '1.0',
      errors,
      warnings,
      preview,
      slugConflict
    };
  }

  /**
   * Atomically executes the import or update into Cloudflare D1
   */
  public async importAssessment(
    data: AssessmentExportSchema,
    options: ImportOptions
  ): Promise<{ assessmentId: string; slug: string; mode: string; status: string }> {
    if (!this.db) throw new Error('Database unavailable');

    const validation = await this.validateJson(data);
    if (!validation.valid) {
      await this.logImportHistory({
        fileName: options.fileName || 'unknown.json',
        assessmentId: null,
        assessmentName: data.assessment?.name || 'Invalid Payload',
        assessmentSlug: data.assessment?.slug || 'invalid',
        status: 'failed',
        importedBy: options.actorId || null,
        schemaVersion: data.schema_version || '1.0',
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
        errorsJson: JSON.stringify(validation.errors),
        warningsJson: JSON.stringify(validation.warnings),
        metadataJson: JSON.stringify(validation.preview)
      });
      throw new ValidationError(`Assessment JSON validation failed with ${validation.errors.length} error(s)`);
    }

    let targetSlug = data.assessment.slug;
    if (options.mode === 'create_with_new_slug' && options.newSlug) {
      targetSlug = options.newSlug.trim().toLowerCase();
    }

    // Resolve Category ID
    const category = await fetchFirst<{ id: string }>(
      this.db,
      `SELECT id FROM assessment_categories WHERE slug = ?`,
      [data.assessment.category_slug]
    );
    if (!category) {
      throw new ValidationError(`Category "${data.assessment.category_slug}" not found in database`);
    }

    const assessmentId =
      options.mode === 'update_existing' && validation.slugConflict.existingAssessmentId
        ? validation.slugConflict.existingAssessmentId
        : `asm_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

    try {
      // 1. If updating existing, remove old dependent records cleanly to prevent orphans
      if (options.mode === 'update_existing') {
        this.logger.info('Performing safe replacement for existing assessment', { assessmentId, slug: targetSlug });
        await executeMutation(this.db, `DELETE FROM scoring_rules WHERE assessment_id = ?`, [assessmentId]);
        await executeMutation(this.db, `DELETE FROM question_options WHERE question_id IN (SELECT id FROM assessment_questions WHERE assessment_id = ?)`, [assessmentId]);
        await executeMutation(this.db, `DELETE FROM assessment_questions WHERE assessment_id = ?`, [assessmentId]);
        await executeMutation(this.db, `DELETE FROM result_contents WHERE result_type_id IN (SELECT id FROM result_types WHERE assessment_id = ?)`, [assessmentId]);
        await executeMutation(this.db, `DELETE FROM result_types WHERE assessment_id = ?`, [assessmentId]);
        await executeMutation(this.db, `DELETE FROM assessment_dimensions WHERE assessment_id = ?`, [assessmentId]);
        await executeMutation(this.db, `DELETE FROM faqs WHERE entity_type = 'assessment' AND entity_id = ?`, [assessmentId]);
        await executeMutation(this.db, `DELETE FROM seo_metadata WHERE page_type = 'assessment' AND entity_id = ?`, [assessmentId]);
      }

      // 2. Upsert Assessment Core Record (DEFAULT TO DRAFT)
      const estimatedMinutes = Number(data.assessment.estimated_minutes) || Math.ceil(data.questions.length * 0.5) || 10;
      const accessType = data.assessment.access_type || 'free';
      const isFeatured = data.assessment.featured ? 1 : 0;
      const initialStatus = 'draft'; // Always default to draft for safety

      await executeMutation(
        this.db,
        `INSERT INTO assessments (
          id, category_id, name, slug, short_description, long_description, instructions,
          estimated_minutes, question_count, access_type, status, featured, disclaimer, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          category_id = excluded.category_id,
          name = excluded.name,
          slug = excluded.slug,
          short_description = excluded.short_description,
          long_description = excluded.long_description,
          instructions = excluded.instructions,
          estimated_minutes = excluded.estimated_minutes,
          question_count = excluded.question_count,
          access_type = excluded.access_type,
          featured = excluded.featured,
          disclaimer = excluded.disclaimer,
          updated_at = CURRENT_TIMESTAMP`,
        [
          assessmentId,
          category.id,
          data.assessment.name.trim(),
          targetSlug,
          data.assessment.short_description.trim(),
          data.assessment.long_description || null,
          data.assessment.instructions || null,
          estimatedMinutes,
          data.questions.length,
          accessType,
          initialStatus,
          isFeatured,
          data.assessment.disclaimer || null
        ]
      );

      // 3. Insert Dimensions
      const dimensionMap = new Map<string, string>(); // key -> id
      const dimensions = Array.isArray(data.dimensions) ? data.dimensions : [];

      for (let i = 0; i < dimensions.length; i++) {
        const dim = dimensions[i];
        const dimId = `dim_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        const cleanKey = dim.key.toLowerCase().trim();

        await executeMutation(
          this.db,
          `INSERT INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [dimId, assessmentId, dim.name.trim(), cleanKey, dim.description || null, dim.display_order ?? i + 1]
        );
        dimensionMap.set(cleanKey, dimId);
      }

      // 4. Insert Questions, Options, and Scoring Rules
      for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];
        const questionId = `q_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        const qType = q.type || 'likert';
        const isRequired = q.required === false ? 0 : 1;
        const isReverse = q.reverse_scored ? 1 : 0;
        const dimKey = q.dimension_key ? q.dimension_key.toLowerCase().trim() : null;
        const dimensionId = dimKey && dimensionMap.has(dimKey) ? dimensionMap.get(dimKey)! : null;

        await executeMutation(
          this.db,
          `INSERT INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [questionId, assessmentId, q.text.trim(), qType, q.order ?? i + 1, isRequired]
        );

        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j];
          const optionId = `opt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
          const optValue = String(opt.value);
          const optScore = opt.score !== undefined ? Number(opt.score) : Number(optValue) || j + 1;

          await executeMutation(
            this.db,
            `INSERT INTO question_options (id, question_id, option_text, option_value, display_order)
             VALUES (?, ?, ?, ?, ?)`,
            [optionId, questionId, opt.text.trim(), optValue, opt.order ?? j + 1]
          );

          // If dimension is associated, generate scoring rule
          if (dimensionId) {
            const ruleId = `sr_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
            await executeMutation(
              this.db,
              `INSERT INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight, reverse_scoring)
               VALUES (?, ?, ?, ?, ?, ?, 1.0, ?)`,
              [ruleId, assessmentId, questionId, dimensionId, optionId, optScore, isReverse]
            );
          }
        }
      }

      // 5. Insert Result Profiles & Content Sections
      const profiles = Array.isArray(data.result_profiles) ? data.result_profiles : [];
      for (let i = 0; i < profiles.length; i++) {
        const prof = profiles[i];
        const resultTypeId = `rt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        const profSlug = prof.slug || prof.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const dimKey = prof.dimension_key ? prof.dimension_key.toLowerCase().trim() : null;
        const dimensionId = dimKey && dimensionMap.has(dimKey) ? dimensionMap.get(dimKey)! : null;

        await executeMutation(
          this.db,
          `INSERT INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            resultTypeId,
            assessmentId,
            dimensionId,
            prof.name.trim(),
            profSlug,
            prof.description || null,
            prof.minimum_score ?? 0,
            prof.maximum_score ?? 100,
            prof.display_order ?? i + 1
          ]
        );

        const sections = Array.isArray(prof.content_sections) ? prof.content_sections : [];
        for (let s = 0; s < sections.length; s++) {
          const sec = sections[s];
          const contentId = `rc_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
          await executeMutation(
            this.db,
            `INSERT INTO result_contents (id, result_type_id, section_type, title, content, display_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [contentId, resultTypeId, sec.section_type || 'overview', sec.title.trim(), sec.content.trim(), sec.display_order ?? s + 1]
          );
        }
      }

      // 6. Insert FAQs
      if (Array.isArray(data.faqs)) {
        for (let i = 0; i < data.faqs.length; i++) {
          const faq = data.faqs[i];
          const faqId = `faq_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
          await executeMutation(
            this.db,
            `INSERT INTO faqs (id, entity_type, entity_id, category, question, answer, display_order, status)
             VALUES (?, 'assessment', ?, ?, ?, ?, ?, 'active')`,
            [faqId, assessmentId, targetSlug, faq.question.trim(), faq.answer.trim(), faq.display_order ?? i + 1]
          );
        }
      }

      // 7. Insert SEO Metadata
      if (data.seo) {
        const seoId = `seo_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        const robotsDirective = data.seo.noindex ? 'noindex, nofollow' : 'index, follow';
        await executeMutation(
          this.db,
          `INSERT INTO seo_metadata (id, page_type, entity_id, title, description, canonical_url, og_image, robots)
           VALUES (?, 'assessment', ?, ?, ?, ?, ?, ?)
           ON CONFLICT(page_type, entity_id) DO UPDATE SET
             title = excluded.title,
             description = excluded.description,
             canonical_url = excluded.canonical_url,
             og_image = excluded.og_image,
             robots = excluded.robots,
             updated_at = CURRENT_TIMESTAMP`,
          [
            seoId,
            assessmentId,
            data.seo.title || `${data.assessment.name} | Psychology Calculator`,
            data.seo.description || data.assessment.short_description,
            data.seo.canonical_url || null,
            data.seo.og_image_url || null,
            robotsDirective
          ]
        );
      }

      // 8. Log Import History & Admin Audit Log
      await this.logImportHistory({
        fileName: options.fileName || 'import.json',
        assessmentId,
        assessmentName: data.assessment.name,
        assessmentSlug: targetSlug,
        status: 'success',
        importedBy: options.actorId || null,
        schemaVersion: data.schema_version || '1.0',
        errorCount: 0,
        warningCount: validation.warnings.length,
        errorsJson: null,
        warningsJson: JSON.stringify(validation.warnings),
        metadataJson: JSON.stringify(validation.preview)
      });

      if (options.actorId) {
        await executeMutation(
          this.db,
          `INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
           VALUES (?, ?, 'admin', ?, 'assessment', ?, ?)`,
          [
            `aud_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
            options.actorId,
            options.mode === 'update_existing' ? 'assessment_updated_from_import' : 'assessment_imported',
            assessmentId,
            JSON.stringify({
              name: data.assessment.name,
              slug: targetSlug,
              schemaVersion: data.schema_version,
              questionsCount: data.questions.length,
              mode: options.mode
            })
          ]
        );
      }

      this.logger.info('Assessment imported successfully as draft', { assessmentId, slug: targetSlug });

      return {
        assessmentId,
        slug: targetSlug,
        mode: options.mode,
        status: initialStatus
      };
    } catch (err: any) {
      this.logger.error('Failed to import assessment, rolling back state', { error: err.message });
      await this.logImportHistory({
        fileName: options.fileName || 'import.json',
        assessmentId: null,
        assessmentName: data.assessment?.name || 'Failed Import',
        assessmentSlug: targetSlug,
        status: 'failed',
        importedBy: options.actorId || null,
        schemaVersion: data.schema_version || '1.0',
        errorCount: 1,
        warningCount: validation.warnings.length,
        errorsJson: JSON.stringify([{ field: 'db', message: err.message }]),
        warningsJson: JSON.stringify(validation.warnings),
        metadataJson: JSON.stringify(validation.preview)
      });
      throw err;
    }
  }

  /**
   * Exports an existing assessment with 100% round-trip fidelity in Schema v1.0
   */
  public async exportAssessment(assessmentIdOrSlug: string, actorId?: string): Promise<AssessmentExportSchema> {
    if (!this.db) throw new Error('Database unavailable');

    const asm = await fetchFirst<{
      id: string;
      category_id: string;
      name: string;
      slug: string;
      short_description: string;
      long_description: string | null;
      instructions: string | null;
      estimated_minutes: number;
      access_type: 'free' | 'premium' | 'credit_only';
      status: 'draft' | 'published' | 'archived';
      featured: number;
      disclaimer: string | null;
      category_slug?: string;
    }>(
      this.db,
      `SELECT a.*, c.slug as category_slug
       FROM assessments a
       JOIN assessment_categories c ON a.category_id = c.id
       WHERE a.id = ? OR a.slug = ?`,
      [assessmentIdOrSlug, assessmentIdOrSlug]
    );

    if (!asm) throw new NotFoundError(`Assessment "${assessmentIdOrSlug}" not found`);

    // Dimensions
    const dimensions = await executeQuery<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      display_order: number;
    }>(
      this.db,
      `SELECT id, slug, name, description, display_order
       FROM assessment_dimensions
       WHERE assessment_id = ?
       ORDER BY display_order ASC`,
      [asm.id]
    );

    const dimIdToKey = new Map<string, string>();
    const exportDimensions: AssessmentDimensionSchema[] = dimensions.map((d) => {
      dimIdToKey.set(d.id, d.slug);
      return {
        key: d.slug,
        name: d.name,
        description: d.description || undefined,
        display_order: d.display_order
      };
    });

    // Questions and Options
    const questions = await executeQuery<{
      id: string;
      question_text: string;
      question_type: 'likert' | 'multiple_choice' | 'yes_no' | 'ranking';
      display_order: number;
      required: number;
    }>(
      this.db,
      `SELECT id, question_text, question_type, display_order, required
       FROM assessment_questions
       WHERE assessment_id = ?
       ORDER BY display_order ASC`,
      [asm.id]
    );

    const scoringRules = await executeQuery<{
      question_id: string;
      dimension_id: string;
      option_id: string | null;
      score: number;
      reverse_scoring: number;
    }>(
      this.db,
      `SELECT question_id, dimension_id, option_id, score, reverse_scoring
       FROM scoring_rules
       WHERE assessment_id = ?`,
      [asm.id]
    );

    const exportQuestions: AssessmentQuestionSchema[] = [];

    for (const q of questions) {
      const options = await executeQuery<{
        id: string;
        option_text: string;
        option_value: string;
        display_order: number;
      }>(
        this.db,
        `SELECT id, option_text, option_value, display_order
         FROM question_options
         WHERE question_id = ?
         ORDER BY display_order ASC`,
        [q.id]
      );

      const qRules = scoringRules.filter((sr) => sr.question_id === q.id);
      const dimensionKey = qRules.length > 0 && dimIdToKey.has(qRules[0].dimension_id)
        ? dimIdToKey.get(qRules[0].dimension_id)!
        : exportDimensions[0]?.key || 'general';

      const isReverse = qRules.length > 0 ? qRules[0].reverse_scoring === 1 : false;

      const exportOptions: AssessmentOptionSchema[] = options.map((opt) => {
        const rule = qRules.find((r) => r.option_id === opt.id);
        return {
          text: opt.option_text,
          value: opt.option_value,
          score: rule ? rule.score : Number(opt.option_value) || undefined,
          order: opt.display_order
        };
      });

      exportQuestions.push({
        id: q.id,
        text: q.question_text,
        type: q.question_type,
        dimension_key: dimensionKey,
        order: q.display_order,
        required: q.required === 1,
        reverse_scored: isReverse,
        options: exportOptions
      });
    }

    // Result Profiles & Sections
    const resultTypes = await executeQuery<{
      id: string;
      dimension_id: string | null;
      name: string;
      slug: string;
      description: string | null;
      minimum_score: number;
      maximum_score: number;
      display_order: number;
    }>(
      this.db,
      `SELECT id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order
       FROM result_types
       WHERE assessment_id = ?
       ORDER BY display_order ASC`,
      [asm.id]
    );

    const exportProfiles: AssessmentResultProfileSchema[] = [];

    for (const rt of resultTypes) {
      const contents = await executeQuery<{
        section_type: any;
        title: string;
        content: string;
        display_order: number;
      }>(
        this.db,
        `SELECT section_type, title, content, display_order
         FROM result_contents
         WHERE result_type_id = ?
         ORDER BY display_order ASC`,
        [rt.id]
      );

      exportProfiles.push({
        name: rt.name,
        slug: rt.slug,
        description: rt.description || undefined,
        dimension_key: rt.dimension_id && dimIdToKey.has(rt.dimension_id) ? dimIdToKey.get(rt.dimension_id) : undefined,
        minimum_score: rt.minimum_score,
        maximum_score: rt.maximum_score,
        display_order: rt.display_order,
        content_sections: contents.map((c) => ({
          section_type: c.section_type,
          title: c.title,
          content: c.content,
          display_order: c.display_order
        }))
      });
    }

    // FAQs
    const faqs = await executeQuery<{
      question: string;
      answer: string;
      display_order: number;
    }>(
      this.db,
      `SELECT question, answer, display_order
       FROM faqs
       WHERE entity_type = 'assessment' AND entity_id = ?
       ORDER BY display_order ASC`,
      [asm.id]
    );

    // SEO
    const seo = await fetchFirst<{
      title: string;
      description: string;
      canonical_url: string | null;
      og_image: string | null;
      robots: string | null;
    }>(
      this.db,
      `SELECT title, description, canonical_url, og_image, robots
       FROM seo_metadata
       WHERE page_type = 'assessment' AND entity_id = ?`,
      [asm.id]
    );

    if (actorId) {
      await executeMutation(
        this.db,
        `INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
         VALUES (?, ?, 'admin', 'assessment_exported', 'assessment', ?, ?)`,
        [
          `aud_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
          actorId,
          asm.id,
          JSON.stringify({ name: asm.name, slug: asm.slug, schemaVersion: '1.0' })
        ]
      );
    }

    return {
      schema_version: '1.0',
      assessment: {
        name: asm.name,
        slug: asm.slug,
        short_description: asm.short_description,
        long_description: asm.long_description || undefined,
        instructions: asm.instructions || undefined,
        category_slug: asm.category_slug || 'general',
        access_type: asm.access_type,
        estimated_minutes: asm.estimated_minutes,
        status: asm.status,
        featured: asm.featured === 1,
        disclaimer: asm.disclaimer || undefined
      },
      dimensions: exportDimensions,
      questions: exportQuestions,
      result_profiles: exportProfiles,
      faqs: faqs.map((f) => ({
        question: f.question,
        answer: f.answer,
        display_order: f.display_order
      })),
      seo: seo
        ? {
            title: seo.title,
            description: seo.description,
            canonical_url: seo.canonical_url || undefined,
            og_image_url: seo.og_image || undefined,
            noindex: seo.robots?.includes('noindex') || false
          }
        : undefined,
      settings: {
        allow_guest_taking: true,
        instant_results: true
      }
    };
  }

  /**
   * Generates a sample ready-to-run demo assessment JSON template
   */
  public generateDemoTemplate(): AssessmentExportSchema {
    return {
      schema_version: '1.0',
      assessment: {
        name: 'Workplace Stress & Resilience Inventory',
        slug: 'workplace-stress-resilience-inventory',
        short_description: 'Evaluate your cognitive endurance, workplace stress boundaries, and occupational recovery profile.',
        long_description: 'The Workplace Stress & Resilience Inventory assesses emotional regulation under deadline pressure, interpersonal boundary setting, and cognitive recharge strategies.',
        instructions: 'Read each prompt carefully and select the response that best reflects your habitual workplace experiences over the past 30 days.',
        category_slug: 'mental-wellbeing',
        access_type: 'free',
        estimated_minutes: 8,
        status: 'draft',
        featured: 0,
        disclaimer: 'This assessment is for educational reflection and occupational self-discovery purposes only and does not constitute clinical psychological diagnosis.'
      },
      dimensions: [
        {
          key: 'cognitive_endurance',
          name: 'Cognitive Endurance',
          description: 'Ability to maintain mental stamina, strategic focus, and calm under tight deadlines.',
          display_order: 1
        },
        {
          key: 'boundary_management',
          name: 'Boundary Management',
          description: 'Effectiveness in setting clear limits regarding workload, overtime, and work-life boundaries.',
          display_order: 2
        }
      ],
      questions: [
        {
          id: 'q1',
          text: 'I can easily disconnect from work-related concerns during my personal evening hours.',
          type: 'likert',
          dimension_key: 'boundary_management',
          order: 1,
          required: true,
          reverse_scored: false,
          options: [
            { text: 'Strongly Disagree', value: '1', score: 1 },
            { text: 'Disagree', value: '2', score: 2 },
            { text: 'Neutral', value: '3', score: 3 },
            { text: 'Agree', value: '4', score: 4 },
            { text: 'Strongly Agree', value: '5', score: 5 }
          ]
        },
        {
          id: 'q2',
          text: 'When high-pressure crises arise at work, I remain composed and methodically prioritize solutions.',
          type: 'likert',
          dimension_key: 'cognitive_endurance',
          order: 2,
          required: true,
          reverse_scored: false,
          options: [
            { text: 'Strongly Disagree', value: '1', score: 1 },
            { text: 'Disagree', value: '2', score: 2 },
            { text: 'Neutral', value: '3', score: 3 },
            { text: 'Agree', value: '4', score: 4 },
            { text: 'Strongly Agree', value: '5', score: 5 }
          ]
        },
        {
          id: 'q3',
          text: 'I struggle to say no to new tasks even when my calendar is already overloaded.',
          type: 'likert',
          dimension_key: 'boundary_management',
          order: 3,
          required: true,
          reverse_scored: true,
          options: [
            { text: 'Strongly Disagree', value: '1', score: 1 },
            { text: 'Disagree', value: '2', score: 2 },
            { text: 'Neutral', value: '3', score: 3 },
            { text: 'Agree', value: '4', score: 4 },
            { text: 'Strongly Agree', value: '5', score: 5 }
          ]
        }
      ],
      result_profiles: [
        {
          name: 'The Resilient Strategist',
          slug: 'resilient-strategist',
          description: 'Exceptional emotional regulation and disciplined boundary management under workplace complexity.',
          dimension_key: 'cognitive_endurance',
          minimum_score: 75,
          maximum_score: 100,
          display_order: 1,
          content_sections: [
            {
              section_type: 'overview',
              title: 'Executive Psychological Profile',
              content: 'You possess robust psychological boundaries and exceptional self-regulation under professional stress.'
            },
            {
              section_type: 'strengths',
              title: 'Key Operational Strengths',
              content: 'Decisive boundary setting, steady focus during volatile deadlines, and rapid cognitive decompression.'
            }
          ]
        },
        {
          name: 'The Strained Over-Extender',
          slug: 'strained-over-extender',
          description: 'High dedication with elevated vulnerability to burnout due to permeable workload boundaries.',
          dimension_key: 'boundary_management',
          minimum_score: 0,
          maximum_score: 74,
          display_order: 2,
          content_sections: [
            {
              section_type: 'overview',
              title: 'Executive Psychological Profile',
              content: 'You exhibit deep loyalty and work dedication, but risk chronic depletion if limits are not established.'
            },
            {
              section_type: 'growth_suggestions',
              title: 'Recommended Boundary Interventions',
              content: 'Institute non-negotiable end-of-day shutdown rituals and communicate bandwidth limits proactively.'
            }
          ]
        }
      ],
      faqs: [
        {
          question: 'How does this assessment calculate workplace resilience?',
          answer: 'It combines standardized psychometric scores across cognitive endurance and boundary management constructs.',
          display_order: 1
        }
      ],
      seo: {
        title: 'Workplace Stress & Resilience Inventory | Psychology Calculator',
        description: 'Take the scientific Workplace Stress & Resilience assessment to uncover your boundary management and cognitive endurance score.',
        og_image_url: '/images/og-default.png',
        noindex: false
      },
      settings: {
        allow_guest_taking: true,
        instant_results: true
      }
    };
  }

  /**
   * Retrieves import audit history with pagination
   */
  public async getImportHistory(limit = 50, offset = 0): Promise<ImportHistoryRow[]> {
    if (!this.db) return [];

    return executeQuery<ImportHistoryRow>(
      this.db,
      `SELECT h.*, u.email as importer_email, p.display_name as importer_name
       FROM assessment_import_history h
       LEFT JOIN users u ON h.imported_by = u.id
       LEFT JOIN profiles p ON h.imported_by = p.user_id
       ORDER BY h.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }

  private async logImportHistory(data: {
    fileName: string;
    assessmentId: string | null;
    assessmentName: string;
    assessmentSlug: string;
    status: 'success' | 'failed' | 'partial_blocked';
    importedBy: string | null;
    schemaVersion: string;
    errorCount: number;
    warningCount: number;
    errorsJson: string | null;
    warningsJson: string | null;
    metadataJson: string | null;
  }): Promise<void> {
    if (!this.db) return;

    const id = `imh_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    await executeMutation(
      this.db,
      `INSERT INTO assessment_import_history (
        id, file_name, assessment_id, assessment_name, assessment_slug,
        status, imported_by, schema_version, error_count, warning_count,
        errors_json, warnings_json, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.fileName,
        data.assessmentId,
        data.assessmentName,
        data.assessmentSlug,
        data.status,
        data.importedBy,
        data.schemaVersion,
        data.errorCount,
        data.warningCount,
        data.errorsJson,
        data.warningsJson,
        data.metadataJson
      ]
    );
  }

  // =========================================================================
  // CSV Assessment Import / Export System
  // =========================================================================

  /**
   * Safe RFC 4180 CSV parser supporting multiline quoted strings,
   * escaped quotes, UTF-8 BOM, and Unicode characters.
   */
  public parseRawCsv(csvContent: string): string[][] {
    let content = csvContent;
    // Strip UTF-8 BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentCell += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          currentCell += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentCell.trim());
          currentCell = '';
        } else if (char === '\r') {
          if (nextChar === '\n') {
            i++;
          }
          currentRow.push(currentCell.trim());
          if (currentRow.some((c) => c.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        } else if (char === '\n') {
          currentRow.push(currentCell.trim());
          if (currentRow.some((c) => c.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Escape spreadsheet formula injection for values starting with =, +, -, @, tab, or newline
   */
  public escapeCsvCell(value: any): string {
    if (value === null || value === undefined) return '';
    let str = String(value);

    // Formula injection defense
    const firstChar = str.trimStart().charAt(0);
    if (['=', '+', '-', '@'].includes(firstChar)) {
      str = `'${str}`;
    }

    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Validate CSV assessment input against the 21-column tabular schema.
   * Supports multi-assessment batching grouped by assessment_slug.
   */
  public async validateCsv(csvContent: string): Promise<CsvValidationResult> {
    const globalErrors: ValidationIssue[] = [];
    const globalWarnings: ValidationIssue[] = [];

    if (!csvContent || !csvContent.trim()) {
      return {
        valid: false,
        format: 'csv',
        assessmentCount: 0,
        assessments: [],
        errors: [{ field: 'file', message: 'CSV file is empty or blank.' }],
        warnings: []
      };
    }

    const rawRows = this.parseRawCsv(csvContent);
    if (rawRows.length === 0) {
      return {
        valid: false,
        format: 'csv',
        assessmentCount: 0,
        assessments: [],
        errors: [{ field: 'file', message: 'CSV content contains no data rows.' }],
        warnings: []
      };
    }

    // 1. Header Validation
    const headerRow = rawRows[0].map((h) => h.toLowerCase().trim().replace(/['"]/g, ''));
    const missingHeaders = REQUIRED_CSV_HEADERS.filter((rh) => !headerRow.includes(rh));
    if (missingHeaders.length > 0) {
      return {
        valid: false,
        format: 'csv',
        assessmentCount: 0,
        assessments: [],
        errors: [
          {
            field: 'headers',
            message: `Missing required CSV headers: ${missingHeaders.join(', ')}`
          }
        ],
        warnings: []
      };
    }

    // Create index lookup for headers
    const headerIdx: Record<string, number> = {};
    REQUIRED_CSV_HEADERS.forEach((h) => {
      headerIdx[h] = headerRow.indexOf(h);
    });

    // 2. Row Parsing & Grouping by assessment_slug
    const groupsMap = new Map<string, {
      slug: string;
      title: string;
      categorySlug: string;
      rows: CsvParsedRow[];
      dimensionsSet: Set<string>;
      questionIdsSet: Set<string>;
      errors: ValidationIssue[];
      warnings: ValidationIssue[];
    }>();

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (row.length === 0 || row.every((c) => c.length === 0)) continue; // skip blank rows

      const getCell = (colName: string) => (row[headerIdx[colName]] || '').trim();

      const assessmentSlug = getCell('assessment_slug').toLowerCase();
      const assessmentTitle = getCell('assessment_title');
      const categorySlug = getCell('category_slug').toLowerCase();
      const questionId = getCell('question_id');
      const questionOrderRaw = getCell('question_order');
      const questionText = getCell('question_text');
      const questionTypeRaw = getCell('question_type').toLowerCase() || 'likert';
      const requiredRaw = getCell('required').toLowerCase();
      const dimensionName = getCell('dimension');
      const weightRaw = getCell('weight');
      const reverseRaw = getCell('reverse').toLowerCase();

      const rowNum = r + 1; // 1-indexed for user-friendly line number

      if (!assessmentSlug) {
        globalErrors.push({
          field: `row[${rowNum}].assessment_slug`,
          message: `Row ${rowNum}: assessment_slug is required.`
        });
        continue;
      }

      if (!groupsMap.has(assessmentSlug)) {
        groupsMap.set(assessmentSlug, {
          slug: assessmentSlug,
          title: assessmentTitle || assessmentSlug,
          categorySlug: categorySlug,
          rows: [],
          dimensionsSet: new Set<string>(),
          questionIdsSet: new Set<string>(),
          errors: [],
          warnings: []
        });
      }

      const group = groupsMap.get(assessmentSlug)!;
      if (assessmentTitle && !group.title) {
        group.title = assessmentTitle;
      }
      if (categorySlug && !group.categorySlug) {
        group.categorySlug = categorySlug;
      }

      // Validate question row
      const qErrors: ValidationIssue[] = [];

      if (!questionText) {
        qErrors.push({
          field: `row[${rowNum}].question_text`,
          message: `Row ${rowNum} (${assessmentSlug}): question_text cannot be empty.`
        });
      }

      if (!dimensionName) {
        qErrors.push({
          field: `row[${rowNum}].dimension`,
          message: `Row ${rowNum} (${assessmentSlug}): dimension is required.`
        });
      } else {
        group.dimensionsSet.add(dimensionName);
      }

      // Check Question ID uniqueness within this assessment
      const effectiveQId = questionId || `q_${group.rows.length + 1}`;
      if (group.questionIdsSet.has(effectiveQId)) {
        qErrors.push({
          field: `row[${rowNum}].question_id`,
          message: `Row ${rowNum} (${assessmentSlug}): Duplicate question_id "${effectiveQId}".`
        });
      } else {
        group.questionIdsSet.add(effectiveQId);
      }

      // Question Order
      let questionOrder = group.rows.length + 1;
      if (questionOrderRaw) {
        const parsedOrder = parseInt(questionOrderRaw, 10);
        if (isNaN(parsedOrder) || parsedOrder < 1) {
          group.warnings.push({
            field: `row[${rowNum}].question_order`,
            message: `Row ${rowNum} (${assessmentSlug}): Invalid question_order "${questionOrderRaw}". Using sequential order.`
          });
        } else {
          questionOrder = parsedOrder;
        }
      }

      // Question Type
      const validTypes = ['likert', 'multiple_choice', 'yes_no', 'binary', 'scale'];
      const questionType = validTypes.includes(questionTypeRaw) ? questionTypeRaw : 'likert';
      if (questionTypeRaw && !validTypes.includes(questionTypeRaw)) {
        group.warnings.push({
          field: `row[${rowNum}].question_type`,
          message: `Row ${rowNum} (${assessmentSlug}): Unknown question_type "${questionTypeRaw}". Defaulted to "likert".`
        });
      }

      // Required flag
      const required = ['true', '1', 'yes', 'y'].includes(requiredRaw) || requiredRaw === '';

      // Weight
      let weight = 1.0;
      if (weightRaw) {
        const parsedWeight = parseFloat(weightRaw);
        if (isNaN(parsedWeight) || parsedWeight <= 0) {
          qErrors.push({
            field: `row[${rowNum}].weight`,
            message: `Row ${rowNum} (${assessmentSlug}): weight must be a positive number (got "${weightRaw}").`
          });
        } else {
          weight = parsedWeight;
        }
      }

      // Reverse scoring flag
      const reverse = ['true', '1', 'yes', 'y'].includes(reverseRaw);

      // Parse Options & Scores
      const parsedOptions: { text: string; score: number }[] = [];
      for (let optIdx = 1; optIdx <= 5; optIdx++) {
        const optText = getCell(`option_${optIdx}`);
        const scoreRaw = getCell(`score_${optIdx}`);

        if (optText) {
          let score = optIdx;
          if (scoreRaw) {
            const parsedScore = parseFloat(scoreRaw);
            if (isNaN(parsedScore)) {
              qErrors.push({
                field: `row[${rowNum}].score_${optIdx}`,
                message: `Row ${rowNum} (${assessmentSlug}): score_${optIdx} must be numeric (got "${scoreRaw}").`
              });
            } else {
              score = parsedScore;
            }
          }
          parsedOptions.push({ text: optText, score });
        }
      }

      if (parsedOptions.length < 2) {
        qErrors.push({
          field: `row[${rowNum}].options`,
          message: `Row ${rowNum} (${assessmentSlug}): Question requires at least 2 options (option_1 and option_2).`
        });
      }

      if (qErrors.length > 0) {
        group.errors.push(...qErrors);
      }

      group.rows.push({
        assessment_slug: assessmentSlug,
        assessment_title: assessmentTitle || group.title,
        category_slug: categorySlug || group.categorySlug,
        question_id: effectiveQId,
        question_order: questionOrder,
        question_text: questionText,
        question_type: questionType,
        required,
        dimension: dimensionName,
        weight,
        reverse,
        options: parsedOptions,
        _rowIndex: rowNum
      });
    }

    // 3. Relational & Database Validation per Assessment Group
    const validatedGroups: CsvAssessmentGroup[] = [];

    for (const [slug, grp] of groupsMap.entries()) {
      if (grp.rows.length === 0) {
        grp.errors.push({
          field: `${slug}.questions`,
          message: `Assessment "${slug}" has no valid question rows.`
        });
      }

      if (!grp.categorySlug) {
        grp.errors.push({
          field: `${slug}.category_slug`,
          message: `Assessment "${slug}" is missing category_slug.`
        });
      }

      let categoryName: string | undefined;
      if (this.db && grp.categorySlug) {
        const cat = await fetchFirst<{ id: string; name: string }>(
          this.db,
          `SELECT id, name FROM assessment_categories WHERE slug = ?`,
          [grp.categorySlug]
        );
        if (!cat) {
          grp.errors.push({
            field: `${slug}.category_slug`,
            message: `Category "${grp.categorySlug}" does not exist in the database.`
          });
        } else {
          categoryName = cat.name;
        }
      }

      // Check slug conflict in D1
      const slugConflict: {
        exists: boolean;
        existingAssessmentId?: string;
        existingAssessmentName?: string;
        existingStatus?: string;
      } = { exists: false };

      if (this.db) {
        const existing = await fetchFirst<{ id: string; name: string; status: string }>(
          this.db,
          `SELECT id, name, status FROM assessments WHERE slug = ?`,
          [slug]
        );
        if (existing) {
          slugConflict.exists = true;
          slugConflict.existingAssessmentId = existing.id;
          slugConflict.existingAssessmentName = existing.name;
          slugConflict.existingStatus = existing.status;
          grp.warnings.push({
            field: `${slug}.slug_conflict`,
            message: `Assessment with slug "${slug}" already exists ("${existing.name}"). Choose conflict resolution.`
          });
        }
      }

      const dimensionsList = Array.from(grp.dimensionsSet).map((d) => ({
        key: d.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
        name: d
      }));

      if (dimensionsList.length === 0) {
        grp.errors.push({
          field: `${slug}.dimensions`,
          message: `Assessment "${slug}" requires at least one dimension.`
        });
      }

      validatedGroups.push({
        slug,
        title: grp.title,
        categorySlug: grp.categorySlug,
        categoryName,
        questionCount: grp.rows.length,
        dimensions: dimensionsList,
        rows: grp.rows,
        slugConflict,
        errors: grp.errors,
        warnings: grp.warnings
      });

      if (grp.errors.length > 0) {
        globalErrors.push(...grp.errors);
      }
      if (grp.warnings.length > 0) {
        globalWarnings.push(...grp.warnings);
      }
    }

    const isValid = globalErrors.length === 0 && validatedGroups.length > 0;

    return {
      valid: isValid,
      format: 'csv',
      assessmentCount: validatedGroups.length,
      assessments: validatedGroups,
      errors: globalErrors,
      warnings: globalWarnings
    };
  }

  /**
   * Import all assessments from a validated CSV with atomic rollback protection.
   * Defaults to 'draft' status.
   */
  public async importCsvAssessments(
    csvContent: string,
    options: CsvImportOptions
  ): Promise<{ results: { slug: string; assessmentId: string; name: string; status: string; questionsCount: number }[] }> {
    const validation = await this.validateCsv(csvContent);

    if (!validation.valid) {
      await this.logImportHistory({
        fileName: options.fileName || 'bulk_import.csv',
        assessmentId: null,
        assessmentName: 'CSV Batch Import',
        assessmentSlug: 'csv-batch',
        status: 'failed',
        importedBy: options.actorId || null,
        schemaVersion: 'csv_1.0',
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
        errorsJson: JSON.stringify(validation.errors),
        warningsJson: JSON.stringify(validation.warnings),
        metadataJson: JSON.stringify({ assessmentCount: validation.assessmentCount })
      });
      throw new ValidationError(`CSV validation failed with ${validation.errors.length} error(s)`);
    }

    if (!this.db) {
      throw new ValidationError('Database connection not available.');
    }

    const results: { slug: string; assessmentId: string; name: string; status: string; questionsCount: number }[] = [];
    const createdAssessmentIds: string[] = [];

    try {
      for (const group of validation.assessments) {
        const mode = options.assessmentModes[group.slug] || 'create_new';
        let targetSlug = group.slug;

        if (mode === 'create_with_new_slug') {
          targetSlug = options.customSlugs?.[group.slug] || `${group.slug}-copy`;
        }

        // Resolve Category ID
        const category = await fetchFirst<{ id: string }>(
          this.db,
          `SELECT id FROM assessment_categories WHERE slug = ?`,
          [group.categorySlug]
        );
        if (!category) {
          throw new ValidationError(`Category "${group.categorySlug}" not found in database.`);
        }

        const assessmentId =
          mode === 'update_existing' && group.slugConflict.existingAssessmentId
            ? group.slugConflict.existingAssessmentId
            : `asm_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

        createdAssessmentIds.push(assessmentId);

        // 1. Clean old records if updating
        if (mode === 'update_existing') {
          this.logger.info('Updating existing assessment from CSV', { assessmentId, slug: targetSlug });
          await executeMutation(this.db, `DELETE FROM scoring_rules WHERE assessment_id = ?`, [assessmentId]);
          await executeMutation(this.db, `DELETE FROM question_options WHERE question_id IN (SELECT id FROM assessment_questions WHERE assessment_id = ?)`, [assessmentId]);
          await executeMutation(this.db, `DELETE FROM assessment_questions WHERE assessment_id = ?`, [assessmentId]);
          await executeMutation(this.db, `DELETE FROM result_contents WHERE result_type_id IN (SELECT id FROM result_types WHERE assessment_id = ?)`, [assessmentId]);
          await executeMutation(this.db, `DELETE FROM result_types WHERE assessment_id = ?`, [assessmentId]);
          await executeMutation(this.db, `DELETE FROM assessment_dimensions WHERE assessment_id = ?`, [assessmentId]);
        }

        // 2. Insert Core Assessment (DEFAULT TO DRAFT)
        const estimatedMinutes = Math.ceil(group.rows.length * 0.5) || 5;
        await executeMutation(
          this.db,
          `INSERT INTO assessments (
            id, category_id, name, slug, short_description, long_description, instructions,
            estimated_minutes, question_count, access_type, status, featured, disclaimer, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'free', 'draft', 0, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            category_id = excluded.category_id,
            name = excluded.name,
            slug = excluded.slug,
            short_description = excluded.short_description,
            estimated_minutes = excluded.estimated_minutes,
            question_count = excluded.question_count,
            status = 'draft',
            updated_at = CURRENT_TIMESTAMP`,
          [
            assessmentId,
            category.id,
            group.title,
            targetSlug,
            `Comprehensive ${group.title} evaluation.`,
            `Assess your psychometric traits and behavioral tendencies in ${group.title}.`,
            'Read each question carefully and select the response that best describes your experience.',
            estimatedMinutes,
            group.rows.length,
            'This self-evaluation is provided for educational and self-exploration purposes only.'
          ]
        );

        // 3. Insert Dimensions
        const dimensionKeyMap = new Map<string, string>();
        for (let dIdx = 0; dIdx < group.dimensions.length; dIdx++) {
          const dim = group.dimensions[dIdx];
          const dimId = `dim_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
          dimensionKeyMap.set(dim.name, dimId);
          dimensionKeyMap.set(dim.key, dimId);

          await executeMutation(
            this.db,
            `INSERT INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            [
              dimId,
              assessmentId,
              dim.name,
              dim.key,
              `Evaluation dimension: ${dim.name}`,
              dIdx + 1
            ]
          );
        }

        // 4. Insert Questions, Options & Scoring Rules
        for (let qIdx = 0; qIdx < group.rows.length; qIdx++) {
          const row = group.rows[qIdx];
          const questionId = `q_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
          const dimensionId = dimensionKeyMap.get(row.dimension) || dimensionKeyMap.get(group.dimensions[0]?.name) || null;

          await executeMutation(
            this.db,
            `INSERT INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            [
              questionId,
              assessmentId,
              row.question_text,
              row.question_type || 'likert',
              row.question_order || qIdx + 1,
              row.required ? 1 : 0
            ]
          );

          // Insert Options & Scoring Rules
          for (let optIdx = 0; optIdx < row.options.length; optIdx++) {
            const opt = row.options[optIdx];
            const optionId = `opt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
            const optionVal = String(optIdx + 1);

            await executeMutation(
              this.db,
              `INSERT INTO question_options (id, question_id, option_text, option_value, display_order, status)
               VALUES (?, ?, ?, ?, ?, 'active')`,
              [
                optionId,
                questionId,
                opt.text,
                optionVal,
                optIdx + 1
              ]
            );

            // Scoring Rule
            if (dimensionId) {
              const ruleId = `sr_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
              await executeMutation(
                this.db,
                `INSERT INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight, reverse_scoring)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  ruleId,
                  assessmentId,
                  questionId,
                  dimensionId,
                  optionId,
                  opt.score,
                  row.weight || 1.0,
                  row.reverse ? 1 : 0
                ]
              );
            }
          }
        }

        // 5. Generate Default Result Profiles if none exist
        const resultTypeId = `rt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        await executeMutation(
          this.db,
          `INSERT INTO result_types (id, assessment_id, name, slug, description, minimum_score, maximum_score, display_order)
           VALUES (?, ?, 'Standard Evaluation Profile', 'standard-profile', 'Your overall psychometric profile and baseline evaluation.', 0.0, 100.0, 1)`,
          [resultTypeId, assessmentId]
        );

        const contentId = `rc_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        await executeMutation(
          this.db,
          `INSERT INTO result_contents (id, result_type_id, section_type, title, content, display_order)
           VALUES (?, ?, 'overview', 'Psychological Profile Summary', 'Thank you for completing the evaluation. Your dimensional scores reflect balanced behavioral tendencies.', 1)`,
          [contentId, resultTypeId]
        );

        // 6. Audit & History Logging
        if (options.actorId) {
          await executeMutation(
            this.db,
            `INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
             VALUES (?, ?, 'admin', 'assessment_imported_csv', 'assessment', ?, ?)`,
            [
              `aud_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
              options.actorId,
              assessmentId,
              JSON.stringify({
                name: group.title,
                slug: targetSlug,
                format: 'csv',
                questionCount: group.rows.length,
                mode
              })
            ]
          );
        }

        await this.logImportHistory({
          fileName: options.fileName || `${group.slug}.csv`,
          assessmentId,
          assessmentName: group.title,
          assessmentSlug: targetSlug,
          status: 'success',
          importedBy: options.actorId || null,
          schemaVersion: 'csv_1.0',
          errorCount: group.errors.length,
          warningCount: group.warnings.length,
          errorsJson: group.errors.length > 0 ? JSON.stringify(group.errors) : null,
          warningsJson: group.warnings.length > 0 ? JSON.stringify(group.warnings) : null,
          metadataJson: JSON.stringify({ questionCount: group.rows.length, dimensions: group.dimensions.map((d) => d.name) })
        });

        results.push({
          slug: targetSlug,
          assessmentId,
          name: group.title,
          status: 'draft',
          questionsCount: group.rows.length
        });
      }

      return { results };
    } catch (err: any) {
      this.logger.error('Failed to import CSV assessments, rolling back state', { error: err.message });
      // Rollback created draft assessments
      for (const asmId of createdAssessmentIds) {
        try {
          await executeMutation(this.db, `DELETE FROM scoring_rules WHERE assessment_id = ?`, [asmId]);
          await executeMutation(this.db, `DELETE FROM question_options WHERE question_id IN (SELECT id FROM assessment_questions WHERE assessment_id = ?)`, [asmId]);
          await executeMutation(this.db, `DELETE FROM assessment_questions WHERE assessment_id = ?`, [asmId]);
          await executeMutation(this.db, `DELETE FROM result_contents WHERE result_type_id IN (SELECT id FROM result_types WHERE assessment_id = ?)`, [asmId]);
          await executeMutation(this.db, `DELETE FROM result_types WHERE assessment_id = ?`, [asmId]);
          await executeMutation(this.db, `DELETE FROM assessment_dimensions WHERE assessment_id = ?`, [asmId]);
          await executeMutation(this.db, `DELETE FROM assessments WHERE id = ?`, [asmId]);
        } catch {
          // ignore cleanup errors
        }
      }

      await this.logImportHistory({
        fileName: options.fileName || 'bulk_import.csv',
        assessmentId: null,
        assessmentName: 'CSV Batch Import Rollback',
        assessmentSlug: 'csv-rollback',
        status: 'failed',
        importedBy: options.actorId || null,
        schemaVersion: 'csv_1.0',
        errorCount: 1,
        warningCount: 0,
        errorsJson: JSON.stringify([{ field: 'transaction', message: err.message }]),
        warningsJson: null,
        metadataJson: null
      });

      throw err;
    }
  }

  /**
   * Export an assessment into the 21-column CSV format with Formula Injection protection.
   */
  public async exportAssessmentToCsv(
    assessmentId: string,
    actorId?: string
  ): Promise<{ csv: string; fileName: string; warnings: string[] }> {
    if (!this.db) {
      throw new ValidationError('Database connection not available.');
    }

    const asm = await fetchFirst<{
      id: string;
      name: string;
      slug: string;
      category_slug?: string;
    }>(
      this.db,
      `SELECT a.id, a.name, a.slug, c.slug as category_slug
       FROM assessments a
       LEFT JOIN assessment_categories c ON a.category_id = c.id
       WHERE a.id = ?`,
      [assessmentId]
    );

    if (!asm) {
      throw new NotFoundError(`Assessment "${assessmentId}" not found.`);
    }

    // Dimensions
    const dimensions = await executeQuery<{
      id: string;
      name: string;
      slug: string;
    }>(
      this.db,
      `SELECT id, name, slug FROM assessment_dimensions WHERE assessment_id = ? ORDER BY display_order ASC`,
      [asm.id]
    );
    const dimMap = new Map<string, string>();
    dimensions.forEach((d) => dimMap.set(d.id, d.name));

    // Questions
    const questions = await executeQuery<{
      id: string;
      question_text: string;
      question_type: string;
      display_order: number;
      required: number;
    }>(
      this.db,
      `SELECT id, question_text, question_type, display_order, required
       FROM assessment_questions
       WHERE assessment_id = ?
       ORDER BY display_order ASC`,
      [asm.id]
    );

    const warnings: string[] = [];
    const csvRows: string[] = [];

    // Header row
    csvRows.push(REQUIRED_CSV_HEADERS.join(','));

    for (const q of questions) {
      // Options
      const options = await executeQuery<{
        id: string;
        option_text: string;
        option_value: string;
        display_order: number;
      }>(
        this.db,
        `SELECT id, option_text, option_value, display_order
         FROM question_options
         WHERE question_id = ?
         ORDER BY display_order ASC`,
        [q.id]
      );

      if (options.length > 5) {
        warnings.push(
          `Question "${q.question_text.substring(0, 40)}..." has ${options.length} options. Only the first 5 options are exported to CSV.`
        );
      }

      // Scoring Rules for dimension & reverse scoring determination
      const rules = await executeQuery<{
        dimension_id: string;
        option_id: string;
        score: number;
        weight: number;
        reverse_scoring: number;
      }>(
        this.db,
        `SELECT dimension_id, option_id, score, weight, reverse_scoring
         FROM scoring_rules
         WHERE assessment_id = ? AND question_id = ?`,
        [asm.id, q.id]
      );

      const primaryDimensionId = rules[0]?.dimension_id;
      const dimensionName = (primaryDimensionId ? dimMap.get(primaryDimensionId) : dimensions[0]?.name) || 'General';
      const weight = rules[0]?.weight ?? 1.0;
      const reverse = rules.some((r) => r.reverse_scoring === 1) ? 1 : 0;

      const ruleScoreMap = new Map<string, number>();
      rules.forEach((r) => ruleScoreMap.set(r.option_id, r.score));

      const rowValues: string[] = [
        this.escapeCsvCell(asm.slug),
        this.escapeCsvCell(asm.name),
        this.escapeCsvCell(asm.category_slug || 'general'),
        this.escapeCsvCell(q.id),
        this.escapeCsvCell(q.display_order),
        this.escapeCsvCell(q.question_text),
        this.escapeCsvCell(q.question_type || 'likert'),
        this.escapeCsvCell(q.required === 1 ? 1 : 0),
        this.escapeCsvCell(dimensionName),
        this.escapeCsvCell(weight),
        this.escapeCsvCell(reverse)
      ];

      // Option 1-5 & Score 1-5
      for (let i = 0; i < 5; i++) {
        const opt = options[i];
        if (opt) {
          rowValues.push(this.escapeCsvCell(opt.option_text));
        } else {
          rowValues.push('');
        }
      }

      for (let i = 0; i < 5; i++) {
        const opt = options[i];
        if (opt) {
          const score = ruleScoreMap.has(opt.id) ? ruleScoreMap.get(opt.id)! : i + 1;
          rowValues.push(this.escapeCsvCell(score));
        } else {
          rowValues.push('');
        }
      }

      csvRows.push(rowValues.join(','));
    }

    if (actorId) {
      await executeMutation(
        this.db,
        `INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
         VALUES (?, ?, 'admin', 'assessment_exported_csv', 'assessment', ?, ?)`,
        [
          `aud_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
          actorId,
          asm.id,
          JSON.stringify({ name: asm.name, slug: asm.slug, format: 'csv' })
        ]
      );
    }

    // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const fileName = `${asm.slug}-questions.csv`;

    return {
      csv: csvContent,
      fileName,
      warnings
    };
  }

  /**
   * Generates a starter CSV template with the 21 required headers and 1 sample assessment.
   */
  public generateDemoCsvTemplate(): string {
    const rows = [
      REQUIRED_CSV_HEADERS.join(','),
      [
        'workplace-stress-resilience-inventory',
        'Workplace Stress & Resilience Inventory',
        'mental-wellbeing',
        'wsri_q1',
        '1',
        'I feel emotionally drained at the end of a typical working day.',
        'likert',
        '1',
        'Emotional Exhaustion',
        '1.0',
        '0',
        'Strongly Disagree',
        'Disagree',
        'Neutral',
        'Agree',
        'Strongly Agree',
        '1',
        '2',
        '3',
        '4',
        '5'
      ].map((c) => this.escapeCsvCell(c)).join(','),
      [
        'workplace-stress-resilience-inventory',
        'Workplace Stress & Resilience Inventory',
        'mental-wellbeing',
        'wsri_q2',
        '2',
        'I easily bounce back after facing unexpected project delays or setbacks.',
        'likert',
        '1',
        'Cognitive Resilience',
        '1.0',
        '1',
        'Strongly Disagree',
        'Disagree',
        'Neutral',
        'Agree',
        'Strongly Agree',
        '5',
        '4',
        '3',
        '2',
        '1'
      ].map((c) => this.escapeCsvCell(c)).join(','),
      [
        'workplace-stress-resilience-inventory',
        'Workplace Stress & Resilience Inventory',
        'mental-wellbeing',
        'wsri_q3',
        '3',
        'I am able to disconnect from work communications during off-hours.',
        'likert',
        '1',
        'Cognitive Resilience',
        '1.0',
        '0',
        'Never',
        'Rarely',
        'Sometimes',
        'Often',
        'Always',
        '1',
        '2',
        '3',
        '4',
        '5'
      ].map((c) => this.escapeCsvCell(c)).join(',')
    ];

    return '\uFEFF' + rows.join('\r\n');
  }

  /**
   * Generates a comprehensive full example CSV featuring multiple assessments and Unicode / Multilingual prompts.
   */
  public generateFullExampleCsv(): string {
    const rows = [
      REQUIRED_CSV_HEADERS.join(','),
      // Assessment 1: Workplace Stress
      [
        'workplace-stress-resilience-inventory',
        'Workplace Stress & Resilience Inventory',
        'mental-wellbeing',
        'wsri_q1',
        '1',
        'I feel overwhelmed by rapid context switching between tasks.',
        'likert',
        '1',
        'Emotional Exhaustion',
        '1.0',
        '0',
        'Strongly Disagree',
        'Disagree',
        'Neutral',
        'Agree',
        'Strongly Agree',
        '1',
        '2',
        '3',
        '4',
        '5'
      ].map((c) => this.escapeCsvCell(c)).join(','),
      [
        'workplace-stress-resilience-inventory',
        'Workplace Stress & Resilience Inventory',
        'mental-wellbeing',
        'wsri_q2',
        '2',
        'कामकाजी तनाव के दौरान मैं शांत और केंद्रित रहता हूँ। (I stay calm and focused under strain)',
        'likert',
        '1',
        'Cognitive Resilience',
        '1.0',
        '1',
        'पूर्णतः असहमत',
        'असहमत',
        'तटस्थ',
        'सहमत',
        'पूर्णतः सहमत',
        '5',
        '4',
        '3',
        '2',
        '1'
      ].map((c) => this.escapeCsvCell(c)).join(','),
      // Assessment 2: Interpersonal Communication Agility
      [
        'communication-agility-profile',
        'Interpersonal Communication Agility Test',
        'emotional-intelligence',
        'comm_q1',
        '1',
        'I express dissenting viewpoints constructively during high-stakes discussions.',
        'likert',
        '1',
        'Assertiveness',
        '1.0',
        '0',
        'Strongly Disagree',
        'Disagree',
        'Neutral',
        'Agree',
        'Strongly Agree',
        '1',
        '2',
        '3',
        '4',
        '5'
      ].map((c) => this.escapeCsvCell(c)).join(','),
      [
        'communication-agility-profile',
        'Interpersonal Communication Agility Test',
        'emotional-intelligence',
        'comm_q2',
        '2',
        'मी इतरांचे मतभेद शांतपणे आणि संयमाने ऐकतो. (I listen to disagreements with patience and composure)',
        'likert',
        '1',
        'Active Empathy',
        '1.2',
        '0',
        'कधीच नाही',
        'कदाचित',
        'कधीकधी',
        'वारंवार',
        'नेहमी',
        '1',
        '2',
        '3',
        '4',
        '5'
      ].map((c) => this.escapeCsvCell(c)).join(',')
    ];

    return '\uFEFF' + rows.join('\r\n');
  }

  private buildInvalidResult(errors: ValidationIssue[], warnings: ValidationIssue[]): ValidationResult {
    return {
      valid: false,
      schemaVersion: '1.0',
      errors,
      warnings,
      preview: {
        title: 'Invalid',
        slug: '',
        categorySlug: '',
        questionCount: 0,
        dimensionCount: 0,
        dimensions: [],
        resultProfileCount: 0,
        resultProfiles: [],
        accessType: 'free',
        estimatedMinutes: 0,
        faqCount: 0
      },
      slugConflict: {
        exists: false
      }
    };
  }
}

