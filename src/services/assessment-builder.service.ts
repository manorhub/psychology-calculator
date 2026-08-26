import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import { AuditService } from './audit.service';
import { AssessmentValidatorService } from './assessment-validator.service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type {
  AssessmentRow,
  AssessmentCategoryRow,
  AssessmentDimensionRow,
  AssessmentQuestionRow,
  QuestionOptionRow,
  ScoringRuleRow,
  ResultTypeRow,
  ResultContentRow,
  AssessmentStatus,
  AssessmentAccessType,
  QuestionType,
  ResultSectionType
} from '@/types/database';

export interface AssessmentListItem extends AssessmentRow {
  category_name?: string;
  dimension_count?: number;
}

export interface FullQuestion extends AssessmentQuestionRow {
  options: QuestionOptionRow[];
}

export interface FullResultType extends ResultTypeRow {
  contents: ResultContentRow[];
}

export interface FullAssessment {
  assessment: AssessmentRow;
  category: AssessmentCategoryRow | null;
  dimensions: AssessmentDimensionRow[];
  questions: FullQuestion[];
  scoringRules: ScoringRuleRow[];
  resultTypes: FullResultType[];
}

export interface CreateAssessmentInput {
  name: string;
  slug: string;
  category_id: string;
  short_description: string;
  long_description?: string;
  instructions?: string;
  completion_message?: string;
  estimated_minutes?: number;
  access_type?: AssessmentAccessType;
  featured?: boolean;
  disclaimer?: string;
  display_order?: number;
  settings?: Record<string, unknown>;
}

export interface UpdateAssessmentInput extends Partial<CreateAssessmentInput> {
  status?: AssessmentStatus;
}

export interface SaveDimensionInput {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  display_order?: number;
  status?: 'active' | 'inactive';
}

export interface SaveOptionInput {
  id?: string;
  option_text: string;
  option_value: string;
  display_order?: number;
  status?: 'active' | 'inactive';
}

export interface SaveQuestionInput {
  id?: string;
  question_text: string;
  question_type: QuestionType;
  required?: boolean;
  display_order?: number;
  status?: 'active' | 'inactive';
  options?: SaveOptionInput[];
}

export interface SaveScoringRuleInput {
  id?: string;
  question_id: string;
  dimension_id: string;
  option_id?: string | null;
  score: number;
  weight?: number;
  reverse_scoring?: boolean;
}

export interface SaveResultContentInput {
  id?: string;
  section_type: ResultSectionType;
  title: string;
  content: string;
  display_order?: number;
}

export interface SaveResultTypeInput {
  id?: string;
  dimension_id?: string | null;
  name: string;
  slug: string;
  description?: string;
  minimum_score: number;
  maximum_score: number;
  display_order?: number;
  status?: 'active' | 'inactive';
  contents?: SaveResultContentInput[];
}

export class AssessmentBuilderService extends BaseService {
  private readonly db: D1Database | null;
  private readonly auditService: AuditService;
  private readonly validatorService: AssessmentValidatorService;

  constructor(db: D1Database | null, auditService?: AuditService, validatorService?: AssessmentValidatorService) {
    super('AssessmentBuilderService');
    this.db = db;
    this.auditService = auditService || new AuditService(db);
    this.validatorService = validatorService || new AssessmentValidatorService(db);
  }

  /**
   * Retrieves paginated, filtered, and searchable assessment list
   */
  public async getAssessments(options: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    status?: string;
    accessType?: string;
    featured?: string;
  } = {}): Promise<{ items: AssessmentListItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const offset = (page - 1) * limit;

    if (!this.db) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];

    if (options.status) {
      whereClause += ' AND a.status = ?';
      params.push(options.status);
    }
    if (options.categoryId) {
      whereClause += ' AND a.category_id = ?';
      params.push(options.categoryId);
    }
    if (options.accessType) {
      whereClause += ' AND a.access_type = ?';
      params.push(options.accessType);
    }
    if (options.featured !== undefined && options.featured !== '') {
      whereClause += ' AND a.featured = ?';
      params.push(options.featured === '1' || options.featured === 'true' ? 1 : 0);
    }
    if (options.search && options.search.trim()) {
      whereClause += ' AND (a.name LIKE ? OR a.slug LIKE ?)';
      const term = `%${options.search.trim()}%`;
      params.push(term, term);
    }

    const countRow = await fetchFirst<{ total: number }>(
      this.db,
      `SELECT COUNT(*) as total FROM assessments a ${whereClause}`,
      params
    );

    const total = countRow?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    const items = await executeQuery<AssessmentListItem>(
      this.db,
      `SELECT
         a.*,
         c.name as category_name,
         (SELECT COUNT(*) FROM assessment_dimensions d WHERE d.assessment_id = a.id) as dimension_count,
         (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) as question_count
       FROM assessments a
       LEFT JOIN assessment_categories c ON a.category_id = c.id
       ${whereClause}
       ORDER BY a.display_order ASC, a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { items, total, page, limit, totalPages };
  }

  /**
   * Retrieves all assessment categories
   */
  public async getCategories(): Promise<AssessmentCategoryRow[]> {
    if (!this.db) return [];
    return executeQuery<AssessmentCategoryRow>(
      this.db,
      "SELECT * FROM assessment_categories WHERE status = 'active' ORDER BY display_order ASC, name ASC"
    );
  }

  /**
   * Loads full comprehensive assessment entity with questions, options, dimensions, scoring, and results
   */
  public async getAssessmentFull(id: string): Promise<FullAssessment | null> {
    if (!this.db) return null;

    const assessment = await fetchFirst<AssessmentRow>(
      this.db,
      'SELECT * FROM assessments WHERE id = ?',
      [id]
    );
    if (!assessment) return null;

    const [category, dimensions, questionsRaw, optionsRaw, scoringRules, resultTypesRaw, resultContentsRaw] = await Promise.all([
      fetchFirst<AssessmentCategoryRow>(this.db, 'SELECT * FROM assessment_categories WHERE id = ?', [assessment.category_id]),
      executeQuery<AssessmentDimensionRow>(this.db, 'SELECT * FROM assessment_dimensions WHERE assessment_id = ? ORDER BY display_order ASC', [id]),
      executeQuery<AssessmentQuestionRow>(this.db, 'SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY display_order ASC', [id]),
      executeQuery<QuestionOptionRow>(
        this.db,
        `SELECT o.* FROM question_options o
         INNER JOIN assessment_questions q ON o.question_id = q.id
         WHERE q.assessment_id = ?
         ORDER BY o.display_order ASC`,
        [id]
      ),
      executeQuery<ScoringRuleRow>(this.db, 'SELECT * FROM scoring_rules WHERE assessment_id = ?', [id]),
      executeQuery<ResultTypeRow>(this.db, 'SELECT * FROM result_types WHERE assessment_id = ? ORDER BY display_order ASC', [id]),
      executeQuery<ResultContentRow>(
        this.db,
        `SELECT rc.* FROM result_contents rc
         INNER JOIN result_types rt ON rc.result_type_id = rt.id
         WHERE rt.assessment_id = ?
         ORDER BY rc.display_order ASC`,
        [id]
      )
    ]);

    // Assemble questions with options
    const questions: FullQuestion[] = questionsRaw.map((q) => ({
      ...q,
      options: optionsRaw.filter((o) => o.question_id === q.id)
    }));

    // Assemble result types with content sections
    const resultTypes: FullResultType[] = resultTypesRaw.map((rt) => ({
      ...rt,
      contents: resultContentsRaw.filter((rc) => rc.result_type_id === rt.id)
    }));

    return {
      assessment,
      category: category || null,
      dimensions,
      questions,
      scoringRules,
      resultTypes
    };
  }

  /**
   * Creates a new draft assessment
   */
  public async createAssessment(input: CreateAssessmentInput, actorId: string): Promise<AssessmentRow> {
    if (!this.db) throw new Error('Database unavailable');

    const id = crypto.randomUUID();
    const slug = input.slug.toLowerCase().trim();

    // Check slug uniqueness
    const existing = await fetchFirst<AssessmentRow>(
      this.db,
      'SELECT id FROM assessments WHERE slug = ?',
      [slug]
    );
    if (existing) {
      throw new ValidationError(`Assessment with slug "${slug}" already exists.`);
    }

    const settingsJson = input.settings ? JSON.stringify(input.settings) : '{"allowGuestAttempts":true,"showProgress":true}';

    await this.db
      .prepare(
        `INSERT INTO assessments (
           id, category_id, name, slug, short_description, long_description,
           instructions, completion_message, estimated_minutes, question_count,
           access_type, status, featured, display_order, version, disclaimer,
           settings, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'draft', ?, ?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(
        id,
        input.category_id,
        input.name,
        slug,
        input.short_description,
        input.long_description || null,
        input.instructions || null,
        input.completion_message || null,
        input.estimated_minutes || 10,
        input.access_type || 'free',
        input.featured ? 1 : 0,
        input.display_order || 0,
        input.disclaimer || null,
        settingsJson
      )
      .run();

    const created = await fetchFirst<AssessmentRow>(this.db, 'SELECT * FROM assessments WHERE id = ?', [id]);

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_assessment_created',
      entityType: 'assessment',
      entityId: id,
      details: { name: input.name, slug }
    });

    return created!;
  }

  /**
   * Updates assessment metadata
   */
  public async updateAssessment(id: string, input: UpdateAssessmentInput, actorId: string): Promise<AssessmentRow> {
    if (!this.db) throw new Error('Database unavailable');

    const existing = await fetchFirst<AssessmentRow>(this.db, 'SELECT * FROM assessments WHERE id = ?', [id]);
    if (!existing) throw new NotFoundError('Assessment not found');

    if (input.slug && input.slug !== existing.slug) {
      const slugConflict = await fetchFirst<AssessmentRow>(
        this.db,
        'SELECT id FROM assessments WHERE slug = ? AND id != ?',
        [input.slug.toLowerCase().trim(), id]
      );
      if (slugConflict) {
        throw new ValidationError(`Assessment with slug "${input.slug}" already exists.`);
      }
    }

    const settingsJson = input.settings ? JSON.stringify(input.settings) : existing.settings;

    await this.db
      .prepare(
        `UPDATE assessments SET
           category_id = COALESCE(?, category_id),
           name = COALESCE(?, name),
           slug = COALESCE(?, slug),
           short_description = COALESCE(?, short_description),
           long_description = COALESCE(?, long_description),
           instructions = COALESCE(?, instructions),
           completion_message = COALESCE(?, completion_message),
           estimated_minutes = COALESCE(?, estimated_minutes),
           access_type = COALESCE(?, access_type),
           status = COALESCE(?, status),
           featured = COALESCE(?, featured),
           display_order = COALESCE(?, display_order),
           disclaimer = COALESCE(?, disclaimer),
           settings = COALESCE(?, settings),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(
        input.category_id ?? null,
        input.name ?? null,
        input.slug ? input.slug.toLowerCase().trim() : null,
        input.short_description ?? null,
        input.long_description ?? null,
        input.instructions ?? null,
        input.completion_message ?? null,
        input.estimated_minutes ?? null,
        input.access_type ?? null,
        input.status ?? null,
        input.featured !== undefined ? (input.featured ? 1 : 0) : null,
        input.display_order ?? null,
        input.disclaimer ?? null,
        settingsJson ?? null,
        id
      )
      .run();

    // Recalculate question count
    await this.refreshQuestionCount(id);

    const updated = await fetchFirst<AssessmentRow>(this.db, 'SELECT * FROM assessments WHERE id = ?', [id]);

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_assessment_updated',
      entityType: 'assessment',
      entityId: id,
      details: { name: updated?.name, slug: updated?.slug }
    });

    return updated!;
  }

  /**
   * Publishes an assessment after full validation
   */
  public async publishAssessment(id: string, actorId: string): Promise<AssessmentRow> {
    if (!this.db) throw new Error('Database unavailable');

    const validation = await this.validatorService.validateForPublish(id);
    if (!validation.isValid) {
      throw new ValidationError(`Cannot publish assessment. Please fix the following:\n• ${validation.errors.join('\n• ')}`);
    }

    await this.db
      .prepare(
        `UPDATE assessments SET
           status = 'published',
           published_at = CURRENT_TIMESTAMP,
           version = version + 1,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(id)
      .run();

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_assessment_published',
      entityType: 'assessment',
      entityId: id
    });

    return (await fetchFirst<AssessmentRow>(this.db, 'SELECT * FROM assessments WHERE id = ?', [id]))!;
  }

  /**
   * Unpublishes an assessment (reverts to draft)
   */
  public async unpublishAssessment(id: string, actorId: string): Promise<AssessmentRow> {
    if (!this.db) throw new Error('Database unavailable');

    await this.db
      .prepare("UPDATE assessments SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(id)
      .run();

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_assessment_unpublished',
      entityType: 'assessment',
      entityId: id
    });

    return (await fetchFirst<AssessmentRow>(this.db, 'SELECT * FROM assessments WHERE id = ?', [id]))!;
  }

  /**
   * Archives an assessment
   */
  public async archiveAssessment(id: string, actorId: string): Promise<AssessmentRow> {
    if (!this.db) throw new Error('Database unavailable');

    await this.db
      .prepare("UPDATE assessments SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(id)
      .run();

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_assessment_archived',
      entityType: 'assessment',
      entityId: id
    });

    return (await fetchFirst<AssessmentRow>(this.db, 'SELECT * FROM assessments WHERE id = ?', [id]))!;
  }

  /**
   * Deletes a draft assessment if no user attempts exist; otherwise throws error
   */
  public async deleteAssessment(id: string, actorId: string): Promise<void> {
    if (!this.db) throw new Error('Database unavailable');

    const attemptsCount = await fetchFirst<{ count: number }>(
      this.db,
      'SELECT COUNT(*) as count FROM assessment_attempts WHERE assessment_id = ?',
      [id]
    );

    if ((attemptsCount?.count ?? 0) > 0) {
      throw new ValidationError(
        'This assessment has existing historical user attempts. To protect user records, archive the assessment instead of deleting it.'
      );
    }

    await this.db.prepare('DELETE FROM assessments WHERE id = ?').bind(id).run();

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_assessment_deleted',
      entityType: 'assessment',
      entityId: id
    });
  }

  /**
   * Deep duplicates an assessment with all child entities
   */
  public async duplicateAssessment(sourceId: string, actorId: string): Promise<AssessmentRow> {
    if (!this.db) throw new Error('Database unavailable');

    const full = await this.getAssessmentFull(sourceId);
    if (!full) throw new NotFoundError('Source assessment not found');

    const newAssessmentId = crypto.randomUUID();
    const shortRandom = Math.random().toString(36).substring(2, 6);
    const newSlug = `${full.assessment.slug}-copy-${shortRandom}`;
    const newName = `${full.assessment.name} (Copy)`;

    // 1. Create duplicate assessment record
    await this.db
      .prepare(
        `INSERT INTO assessments (
           id, category_id, name, slug, short_description, long_description,
           instructions, completion_message, estimated_minutes, question_count,
           access_type, status, featured, display_order, version, disclaimer,
           settings, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, ?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(
        newAssessmentId,
        full.assessment.category_id,
        newName,
        newSlug,
        full.assessment.short_description,
        full.assessment.long_description,
        full.assessment.instructions,
        full.assessment.completion_message || null,
        full.assessment.estimated_minutes,
        full.assessment.question_count,
        full.assessment.access_type,
        full.assessment.display_order,
        full.assessment.disclaimer,
        full.assessment.settings || null
      )
      .run();

    // 2. Clone Dimensions (oldId -> newId)
    const dimMap = new Map<string, string>();
    for (const d of full.dimensions) {
      const newDimId = crypto.randomUUID();
      dimMap.set(d.id, newDimId);
      await this.db
        .prepare(
          `INSERT INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .bind(newDimId, newAssessmentId, d.name, d.slug, d.description, d.display_order, d.status)
        .run();
    }

    // 3. Clone Questions & Options (oldQId -> newQId, oldOptId -> newOptId)
    const qMap = new Map<string, string>();
    const optMap = new Map<string, string>();

    for (const q of full.questions) {
      const newQId = crypto.randomUUID();
      qMap.set(q.id, newQId);

      await this.db
        .prepare(
          `INSERT INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .bind(newQId, newAssessmentId, q.question_text, q.question_type, q.display_order, q.required, q.status)
        .run();

      for (const opt of q.options) {
        const newOptId = crypto.randomUUID();
        optMap.set(opt.id, newOptId);

        await this.db
          .prepare(
            `INSERT INTO question_options (id, question_id, option_text, option_value, display_order, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
          )
          .bind(newOptId, newQId, opt.option_text, opt.option_value, opt.display_order, opt.status)
          .run();
      }
    }

    // 4. Clone Scoring Rules with mapped IDs
    for (const rule of full.scoringRules) {
      const newQId = qMap.get(rule.question_id);
      const newDimId = dimMap.get(rule.dimension_id);
      const newOptId = rule.option_id ? optMap.get(rule.option_id) || null : null;

      if (newQId && newDimId) {
        const newRuleId = crypto.randomUUID();
        await this.db
          .prepare(
            `INSERT INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight, reverse_scoring, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
          )
          .bind(
            newRuleId,
            newAssessmentId,
            newQId,
            newDimId,
            newOptId,
            rule.score,
            rule.weight,
            rule.reverse_scoring
          )
          .run();
      }
    }

    // 5. Clone Result Types & Content Sections
    for (const rt of full.resultTypes) {
      const newRtId = crypto.randomUUID();
      const newDimId = rt.dimension_id ? dimMap.get(rt.dimension_id) || null : null;

      await this.db
        .prepare(
          `INSERT INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .bind(
          newRtId,
          newAssessmentId,
          newDimId,
          rt.name,
          rt.slug,
          rt.description,
          rt.minimum_score,
          rt.maximum_score,
          rt.display_order,
          rt.status
        )
        .run();

      for (const rc of rt.contents) {
        const newRcId = crypto.randomUUID();
        await this.db
          .prepare(
            `INSERT INTO result_contents (id, result_type_id, section_type, title, content, display_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
          )
          .bind(newRcId, newRtId, rc.section_type, rc.title, rc.content, rc.display_order)
          .run();
      }
    }

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_assessment_duplicated',
      entityType: 'assessment',
      entityId: newAssessmentId,
      details: { sourceId, newName, newSlug }
    });

    return (await fetchFirst<AssessmentRow>(this.db, 'SELECT * FROM assessments WHERE id = ?', [newAssessmentId]))!;
  }

  /**
   * Saves / upserts dimensions for an assessment
   */
  public async saveDimensions(assessmentId: string, dimensions: SaveDimensionInput[], actorId: string): Promise<AssessmentDimensionRow[]> {
    if (!this.db) throw new Error('Database unavailable');

    for (let i = 0; i < dimensions.length; i++) {
      const d = dimensions[i];
      const id = d.id || crypto.randomUUID();
      const slug = d.slug.toLowerCase().trim();

      await this.db
        .prepare(
          `INSERT INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             slug = excluded.slug,
             description = excluded.description,
             display_order = excluded.display_order,
             status = excluded.status,
             updated_at = CURRENT_TIMESTAMP`
        )
        .bind(
          id,
          assessmentId,
          d.name,
          slug,
          d.description || null,
          d.display_order !== undefined ? d.display_order : i,
          d.status || 'active'
        )
        .run();
    }

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_dimensions_updated',
      entityType: 'assessment',
      entityId: assessmentId,
      details: { count: dimensions.length }
    });

    return executeQuery<AssessmentDimensionRow>(
      this.db,
      'SELECT * FROM assessment_dimensions WHERE assessment_id = ? ORDER BY display_order ASC',
      [assessmentId]
    );
  }

  /**
   * Saves or updates a single question and its options
   */
  public async saveQuestion(assessmentId: string, question: SaveQuestionInput, actorId: string): Promise<FullQuestion> {
    if (!this.db) throw new Error('Database unavailable');

    const questionId = question.id || crypto.randomUUID();
    const isRequired = question.required !== false ? 1 : 0;
    const status = question.status || 'active';

    await this.db
      .prepare(
        `INSERT INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           question_text = excluded.question_text,
           question_type = excluded.question_type,
           display_order = excluded.display_order,
           required = excluded.required,
           status = excluded.status,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(
        questionId,
        assessmentId,
        question.question_text,
        question.question_type,
        question.display_order || 0,
        isRequired,
        status
      )
      .run();

    // If options provided, upsert them
    if (question.options && question.options.length > 0) {
      for (let i = 0; i < question.options.length; i++) {
        const opt = question.options[i];
        const optId = opt.id || crypto.randomUUID();
        await this.db
          .prepare(
            `INSERT INTO question_options (id, question_id, option_text, option_value, display_order, status, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET
               option_text = excluded.option_text,
               option_value = excluded.option_value,
               display_order = excluded.display_order,
               status = excluded.status,
               updated_at = CURRENT_TIMESTAMP`
          )
          .bind(
            optId,
            questionId,
            opt.option_text,
            opt.option_value,
            opt.display_order !== undefined ? opt.display_order : i,
            opt.status || 'active'
          )
          .run();
      }
    }

    await this.refreshQuestionCount(assessmentId);

    const savedQ = await fetchFirst<AssessmentQuestionRow>(
      this.db,
      'SELECT * FROM assessment_questions WHERE id = ?',
      [questionId]
    );
    const savedOpts = await executeQuery<QuestionOptionRow>(
      this.db,
      'SELECT * FROM question_options WHERE question_id = ? ORDER BY display_order ASC',
      [questionId]
    );

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_question_saved',
      entityType: 'question',
      entityId: questionId,
      details: { assessmentId, text: question.question_text.substring(0, 40) }
    });

    return { ...savedQ!, options: savedOpts };
  }

  /**
   * Deletes a question and its options
   */
  public async deleteQuestion(assessmentId: string, questionId: string, actorId: string): Promise<void> {
    if (!this.db) throw new Error('Database unavailable');

    await this.db.prepare('DELETE FROM assessment_questions WHERE id = ? AND assessment_id = ?').bind(questionId, assessmentId).run();
    await this.refreshQuestionCount(assessmentId);

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_question_deleted',
      entityType: 'question',
      entityId: questionId,
      details: { assessmentId }
    });
  }

  /**
   * Reorders questions
   */
  public async reorderQuestions(assessmentId: string, questionIds: string[], actorId: string): Promise<void> {
    if (!this.db) throw new Error('Database unavailable');

    for (let i = 0; i < questionIds.length; i++) {
      await this.db
        .prepare('UPDATE assessment_questions SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND assessment_id = ?')
        .bind(i, questionIds[i], assessmentId)
        .run();
    }

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_questions_reordered',
      entityType: 'assessment',
      entityId: assessmentId,
      details: { count: questionIds.length }
    });
  }

  /**
   * Saves scoring rules in bulk
   */
  public async saveScoringRules(assessmentId: string, rules: SaveScoringRuleInput[], actorId: string): Promise<void> {
    if (!this.db) throw new Error('Database unavailable');

    // Wipe existing scoring rules for assessment and insert fresh
    await this.db.prepare('DELETE FROM scoring_rules WHERE assessment_id = ?').bind(assessmentId).run();

    for (const r of rules) {
      const id = r.id || crypto.randomUUID();
      await this.db
        .prepare(
          `INSERT INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight, reverse_scoring, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .bind(
          id,
          assessmentId,
          r.question_id,
          r.dimension_id,
          r.option_id || null,
          r.score,
          r.weight !== undefined ? r.weight : 1.0,
          r.reverse_scoring ? 1 : 0
        )
        .run();
    }

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_scoring_rules_updated',
      entityType: 'assessment',
      entityId: assessmentId,
      details: { count: rules.length }
    });
  }

  /**
   * Saves result types and their content sections
   */
  public async saveResultTypes(assessmentId: string, resultTypes: SaveResultTypeInput[], actorId: string): Promise<FullResultType[]> {
    if (!this.db) throw new Error('Database unavailable');

    for (let i = 0; i < resultTypes.length; i++) {
      const rt = resultTypes[i];
      const rtId = rt.id || crypto.randomUUID();

      await this.db
        .prepare(
          `INSERT INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order, status, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET
             dimension_id = excluded.dimension_id,
             name = excluded.name,
             slug = excluded.slug,
             description = excluded.description,
             minimum_score = excluded.minimum_score,
             maximum_score = excluded.maximum_score,
             display_order = excluded.display_order,
             status = excluded.status,
             updated_at = CURRENT_TIMESTAMP`
        )
        .bind(
          rtId,
          assessmentId,
          rt.dimension_id || null,
          rt.name,
          rt.slug.toLowerCase().trim(),
          rt.description || null,
          rt.minimum_score,
          rt.maximum_score,
          rt.display_order !== undefined ? rt.display_order : i,
          rt.status || 'active'
        )
        .run();

      // If content sections provided, upsert them
      if (rt.contents && rt.contents.length > 0) {
        for (let j = 0; j < rt.contents.length; j++) {
          const c = rt.contents[j];
          const cId = c.id || crypto.randomUUID();
          await this.db
            .prepare(
              `INSERT INTO result_contents (id, result_type_id, section_type, title, content, display_order, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(id) DO UPDATE SET
                 section_type = excluded.section_type,
                 title = excluded.title,
                 content = excluded.content,
                 display_order = excluded.display_order,
                 updated_at = CURRENT_TIMESTAMP`
            )
            .bind(
              cId,
              rtId,
              c.section_type,
              c.title,
              c.content,
              c.display_order !== undefined ? c.display_order : j
            )
            .run();
        }
      }
    }

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_result_types_updated',
      entityType: 'assessment',
      entityId: assessmentId,
      details: { count: resultTypes.length }
    });

    const full = await this.getAssessmentFull(assessmentId);
    return full?.resultTypes || [];
  }

  /**
   * Refreshes the cached question_count on the assessment table
   */
  private async refreshQuestionCount(assessmentId: string): Promise<void> {
    if (!this.db) return;
    const countRow = await fetchFirst<{ count: number }>(
      this.db,
      "SELECT COUNT(*) as count FROM assessment_questions WHERE assessment_id = ? AND status = 'active'",
      [assessmentId]
    );
    const count = countRow?.count ?? 0;
    await this.db.prepare('UPDATE assessments SET question_count = ? WHERE id = ?').bind(count, assessmentId).run();
  }
}
