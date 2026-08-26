import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import type {
  AssessmentCategoryRow,
  AssessmentRow,
  AssessmentWithCategory,
  AssessmentDimensionRow,
  AssessmentQuestionRow,
  QuestionOptionRow,
  QuestionWithOptions,
  ResultTypeRow,
  ResultContentRow,
  ResultTypeWithContent,
  AssessmentStatus
} from '@/types/database';
import { executeQuery, fetchFirst } from '@/lib/db/query';

export class AssessmentService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('AssessmentService');
    this.db = db;
  }

  // --- Categories ---

  public async getCategories(status: string = 'active'): Promise<AssessmentCategoryRow[]> {
    if (!this.db) return [];
    return executeQuery<AssessmentCategoryRow>(
      this.db,
      'SELECT * FROM assessment_categories WHERE status = ? ORDER BY display_order ASC',
      [status]
    );
  }

  public async getCategoryBySlug(slug: string): Promise<AssessmentCategoryRow | null> {
    if (!this.db) return null;
    return fetchFirst<AssessmentCategoryRow>(
      this.db,
      'SELECT * FROM assessment_categories WHERE slug = ?',
      [slug]
    );
  }

  public async createCategory(data: Omit<AssessmentCategoryRow, 'created_at' | 'updated_at'>): Promise<AssessmentCategoryRow> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        'INSERT INTO assessment_categories (id, name, slug, description, icon, display_order, status, seo_title, seo_description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .bind(data.id, data.name, data.slug, data.description || null, data.icon || null, data.display_order, data.status, data.seo_title || null, data.seo_description || null)
      .run();

    const created = await this.getCategoryBySlug(data.slug);
    if (!created) throw new Error('Failed to retrieve created category');
    return created;
  }

  // --- Assessments ---

  public async getAssessments(options: { status?: AssessmentStatus; categoryId?: string; featuredOnly?: boolean } = {}): Promise<AssessmentWithCategory[]> {
    if (!this.db) return [];

    let query = `
      SELECT a.*, c.name as category_name, c.slug as category_slug
      FROM assessments a
      LEFT JOIN assessment_categories c ON a.category_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (options.status) {
      query += ' AND a.status = ?';
      params.push(options.status);
    }
    if (options.categoryId) {
      query += ' AND a.category_id = ?';
      params.push(options.categoryId);
    }
    if (options.featuredOnly) {
      query += ' AND a.featured = 1';
    }

    query += ' ORDER BY a.display_order ASC, a.created_at DESC';

    return executeQuery<AssessmentWithCategory>(this.db, query, params);
  }

  public async getFeaturedAssessments(): Promise<AssessmentWithCategory[]> {
    return this.getAssessments({ status: 'published', featuredOnly: true });
  }

  public async getPublishedAssessments(): Promise<AssessmentWithCategory[]> {
    return this.getAssessments({ status: 'published' });
  }

  public async getPublishedAssessmentsByCategory(categoryId: string): Promise<AssessmentWithCategory[]> {
    return this.getAssessments({ status: 'published', categoryId });
  }

  public async getAssessmentBySlug(slug: string): Promise<AssessmentWithCategory | null> {
    if (!this.db) return null;
    return fetchFirst<AssessmentWithCategory>(
      this.db,
      `SELECT a.*, c.name as category_name, c.slug as category_slug
       FROM assessments a
       LEFT JOIN assessment_categories c ON a.category_id = c.id
       WHERE a.slug = ?`,
      [slug]
    );
  }

  public async getAssessmentById(id: string): Promise<AssessmentWithCategory | null> {
    if (!this.db) return null;
    return fetchFirst<AssessmentWithCategory>(
      this.db,
      `SELECT a.*, c.name as category_name, c.slug as category_slug
       FROM assessments a
       LEFT JOIN assessment_categories c ON a.category_id = c.id
       WHERE a.id = ?`,
      [id]
    );
  }

  public async createAssessment(data: Omit<AssessmentRow, 'created_at' | 'updated_at'>): Promise<AssessmentRow> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        `INSERT INTO assessments (
          id, category_id, name, slug, short_description, long_description, instructions,
          estimated_minutes, question_count, access_type, status, featured, display_order,
          version, disclaimer, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(
        data.id, data.category_id, data.name, data.slug, data.short_description, data.long_description || null,
        data.instructions || null, data.estimated_minutes, data.question_count, data.access_type, data.status,
        data.featured, data.display_order, data.version, data.disclaimer || null, data.published_at || null
      )
      .run();

    const created = await this.getAssessmentById(data.id);
    if (!created) throw new Error('Failed to retrieve created assessment');
    return created;
  }

  // --- Dimensions ---

  public async getDimensions(assessmentId: string): Promise<AssessmentDimensionRow[]> {
    if (!this.db) return [];
    return executeQuery<AssessmentDimensionRow>(
      this.db,
      "SELECT * FROM assessment_dimensions WHERE assessment_id = ? AND status = 'active' ORDER BY display_order ASC",
      [assessmentId]
    );
  }

  public async createDimension(data: Omit<AssessmentDimensionRow, 'created_at' | 'updated_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        'INSERT INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .bind(data.id, data.assessment_id, data.name, data.slug, data.description || null, data.display_order, data.status)
      .run();
  }

  // --- Questions & Options ---

  public async getQuestions(assessmentId: string, withOptions: boolean = true): Promise<QuestionWithOptions[]> {
    if (!this.db) return [];

    const questions = await executeQuery<AssessmentQuestionRow>(
      this.db,
      "SELECT * FROM assessment_questions WHERE assessment_id = ? AND status = 'active' ORDER BY display_order ASC",
      [assessmentId]
    );

    if (!withOptions || questions.length === 0) {
      return questions.map((q) => ({ ...q, options: [] }));
    }

    const questionIds = questions.map((q) => q.id);
    const placeholders = questionIds.map(() => '?').join(',');

    const allOptions = await executeQuery<QuestionOptionRow>(
      this.db,
      `SELECT * FROM question_options WHERE question_id IN (${placeholders}) AND status = 'active' ORDER BY display_order ASC`,
      questionIds
    );

    const optionsByQuestionId = new Map<string, QuestionOptionRow[]>();
    for (const opt of allOptions) {
      const list = optionsByQuestionId.get(opt.question_id) || [];
      list.push(opt);
      optionsByQuestionId.set(opt.question_id, list);
    }

    return questions.map((q) => ({
      ...q,
      options: optionsByQuestionId.get(q.id) || []
    }));
  }

  public async createQuestion(data: Omit<AssessmentQuestionRow, 'created_at' | 'updated_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        'INSERT INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .bind(data.id, data.assessment_id, data.question_text, data.question_type, data.display_order, data.required, data.status)
      .run();
  }

  public async createOption(data: Omit<QuestionOptionRow, 'created_at' | 'updated_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        'INSERT INTO question_options (id, question_id, option_text, option_value, display_order, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .bind(data.id, data.question_id, data.option_text, data.option_value, data.display_order, data.status)
      .run();
  }

  // --- Result Types & Content ---

  public async getResultTypes(assessmentId: string, withContent: boolean = true): Promise<ResultTypeWithContent[]> {
    if (!this.db) return [];

    const resultTypes = await executeQuery<ResultTypeRow>(
      this.db,
      "SELECT * FROM result_types WHERE assessment_id = ? AND status = 'active' ORDER BY display_order ASC",
      [assessmentId]
    );

    if (!withContent || resultTypes.length === 0) {
      return resultTypes.map((rt) => ({ ...rt, contents: [] }));
    }

    const typeIds = resultTypes.map((rt) => rt.id);
    const placeholders = typeIds.map(() => '?').join(',');

    const contents = await executeQuery<ResultContentRow>(
      this.db,
      `SELECT * FROM result_contents WHERE result_type_id IN (${placeholders}) ORDER BY display_order ASC`,
      typeIds
    );

    const contentsByTypeId = new Map<string, ResultContentRow[]>();
    for (const c of contents) {
      const list = contentsByTypeId.get(c.result_type_id) || [];
      list.push(c);
      contentsByTypeId.set(c.result_type_id, list);
    }

    return resultTypes.map((rt) => ({
      ...rt,
      contents: contentsByTypeId.get(rt.id) || []
    }));
  }

  public async createResultType(data: Omit<ResultTypeRow, 'created_at' | 'updated_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        'INSERT INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .bind(data.id, data.assessment_id, data.dimension_id || null, data.name, data.slug, data.description || null, data.minimum_score, data.maximum_score, data.display_order, data.status)
      .run();
  }

  public async createResultContent(data: Omit<ResultContentRow, 'created_at' | 'updated_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        'INSERT INTO result_contents (id, result_type_id, section_type, title, content, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .bind(data.id, data.result_type_id, data.section_type, data.title, data.content, data.display_order)
      .run();
  }
}
