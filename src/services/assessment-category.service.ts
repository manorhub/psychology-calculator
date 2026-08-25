import type { D1Database } from '@cloudflare/workers-types';
import { executeQuery, fetchFirst } from '../lib/db/query';
import type { AssessmentCategoryRow, AssessmentRow, CategoryStatus } from '../types/database';
import { AuditService } from './audit.service';

function cleanText(input: string): string {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  short_description?: string | null;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  status?: CategoryStatus;
  featured?: boolean | number;
  sort_order?: number;
  display_order?: number;
  seo_title?: string | null;
  seo_description?: string | null;
  canonical?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}

export interface CategoryFilterOptions {
  status?: string;
  featuredOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export const MASTER_PSYCHOLOGY_CATEGORIES = [
  {
    id: 'cat_personality',
    name: 'Personality',
    slug: 'personality',
    short_description: 'Explore personality traits, tendencies, and individual differences through educational self-assessments.',
    description: 'Explore scientifically validated personality models including the Big Five (OCEAN), temperament frameworks, and cognitive behavioral dispositions for deeper self-awareness.',
    icon: '🧬',
    display_order: 1,
    status: 'active' as CategoryStatus,
    featured: 1,
    seo_title: 'Personality Tests & Psychometric Profiles | Psychology Calculator',
    seo_description: 'Discover your unique psychometric traits and behavioral tendencies with scientifically grounded personality assessments.'
  },
  {
    id: 'cat_relationships_attachment',
    name: 'Relationships & Attachment',
    slug: 'relationships-attachment',
    short_description: 'Explore relationship patterns, attachment tendencies, communication, and interpersonal dynamics.',
    description: 'Understand adult attachment styles, love languages, romantic intimacy tendencies, and boundary dynamics to foster deeper connection and emotional security.',
    icon: '❤️',
    display_order: 2,
    status: 'active' as CategoryStatus,
    featured: 1,
    seo_title: 'Relationships & Attachment Style Quizzes | Psychology Calculator',
    seo_description: 'Analyze your attachment pattern, relationship communication habits, and interpersonal connection preferences.'
  },
  {
    id: 'cat_emotional_wellbeing',
    name: 'Emotional Wellbeing',
    slug: 'emotional-wellbeing',
    short_description: 'Explore emotional awareness, resilience, empathy, and everyday wellbeing-related traits.',
    description: 'Assess emotional intelligence, resilience, empathy metrics, stress regulation strategies, and grounded self-reflection tools.',
    icon: '🌿',
    display_order: 3,
    status: 'active' as CategoryStatus,
    featured: 1,
    seo_title: 'Emotional Wellbeing & EQ Assessments | Psychology Calculator',
    seo_description: 'Evaluate emotional awareness, stress management, and agility through standardized educational self-evaluations.'
  },
  {
    id: 'cat_career_work',
    name: 'Career & Work',
    slug: 'career-work',
    short_description: 'Explore work preferences, leadership tendencies, career-related traits, and workplace styles.',
    description: 'Assess professional drive, workplace communication, burnout risk, leadership potential, and vocational fit.',
    icon: '💼',
    display_order: 4,
    status: 'active' as CategoryStatus,
    featured: 1,
    seo_title: 'Career & Workplace Psychology Assessments | Psychology Calculator',
    seo_description: 'Gain behavioral insights into your workplace style, leadership potential, and collaborative strengths.'
  },
  {
    id: 'cat_social_communication',
    name: 'Social & Communication',
    slug: 'social-communication',
    short_description: 'Explore social confidence, communication preferences, interpersonal skills, and conflict styles.',
    description: 'Identify conflict management strategies, assertiveness levels, social conversational dynamics, and active listening capabilities.',
    icon: '💬',
    display_order: 5,
    status: 'active' as CategoryStatus,
    featured: 1,
    seo_title: 'Social & Communication Style Tests | Psychology Calculator',
    seo_description: 'Explore your conflict resolution approach, communication style, and social interaction patterns.'
  },
  {
    id: 'cat_self_development',
    name: 'Self-Development',
    slug: 'self-development',
    short_description: 'Explore motivation, self-awareness, decision-making, goals, and personal growth.',
    description: 'Evaluate self-esteem, growth mindset, decision fatigue tendencies, intrinsic motivation, and personal transformation paths.',
    icon: '🚀',
    display_order: 6,
    status: 'active' as CategoryStatus,
    featured: 1,
    seo_title: 'Self-Development & Mindset Tests | Psychology Calculator',
    seo_description: 'Foster sustainable personal growth and self-awareness with validated reflective psychological instruments.'
  },
  {
    id: 'cat_cognitive_style',
    name: 'Cognitive Style',
    slug: 'cognitive-style',
    short_description: 'Explore thinking preferences, problem-solving approaches, and cognitive styles.',
    description: 'Discover cognitive problem-solving approaches, learning preferences, analytical versus intuitive thinking, and intellectual tendencies.',
    icon: '🧠',
    display_order: 7,
    status: 'active' as CategoryStatus,
    featured: 1,
    seo_title: 'Cognitive Style & Thinking Preferences | Psychology Calculator',
    seo_description: 'Understand how you process information, make complex decisions, and solve problems creatively.'
  }
];

export class AssessmentCategoryService {
  private auditService: AuditService;

  constructor(private db: D1Database | null) {
    this.auditService = new AuditService(db);
  }

  /**
   * Generates a clean URL-safe slug from a string.
   */
  public static slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Retrieves all categories with optional search, status filtering, and real assessment counts.
   */
  async getCategories(options: CategoryFilterOptions = {}): Promise<AssessmentCategoryRow[]> {
    if (!this.db) return [];

    let query = `
      SELECT 
        c.*,
        c.display_order as sort_order,
        COUNT(a.id) as assessment_count
      FROM assessment_categories c
      LEFT JOIN assessments a ON a.category_id = c.id AND a.status = 'published'
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options.status && options.status !== 'all') {
      query += ` AND c.status = ?`;
      params.push(options.status);
    }

    if (options.featuredOnly) {
      query += ` AND c.featured = 1`;
    }

    if (options.search && options.search.trim()) {
      query += ` AND (c.name LIKE ? OR c.slug LIKE ? OR c.description LIKE ?)`;
      const term = `%${options.search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` GROUP BY c.id ORDER BY c.display_order ASC, c.name ASC`;

    if (options.limit && options.limit > 0) {
      query += ` LIMIT ?`;
      params.push(options.limit);
      if (options.offset && options.offset > 0) {
        query += ` OFFSET ?`;
        params.push(options.offset);
      }
    }

    const rows = await executeQuery<AssessmentCategoryRow>(this.db, query, params);
    return rows.map((r) => ({
      ...r,
      sort_order: r.display_order,
      featured: Number(r.featured) || 0,
      assessment_count: Number(r.assessment_count) || 0
    }));
  }

  /**
   * Retrieves active categories for public website navigation and filter pills.
   */
  async getActiveCategories(): Promise<AssessmentCategoryRow[]> {
    return this.getCategories({ status: 'active' });
  }

  /**
   * Retrieves a category by slug or ID with alias support.
   */
  async getCategoryBySlug(slug: string, includeNonActive = false): Promise<AssessmentCategoryRow | null> {
    if (!this.db || !slug) return null;

    const rawSlug = slug.trim().toLowerCase();
    
    // Alias normalization map
    const aliasMap: Record<string, string> = {
      'cat_personality': 'personality',
      'personality-tests': 'personality',
      'personality-test': 'personality',
      'cat_relationships': 'relationships',
      'relationship-tests': 'relationships',
      'relationship-test': 'relationships',
      'relationships-attachment': 'relationships',
      'cat_eq': 'emotional-intelligence',
      'eq': 'emotional-intelligence',
      'emotional-intelligence-tests': 'emotional-intelligence',
      'emotional-wellbeing': 'emotional-intelligence',
      'cat_career': 'career-work',
      'career': 'career-work',
      'career-tests': 'career-work',
      'career-work': 'career-work',
      'cat_self_dev': 'self-development',
      'cat_mindset': 'self-development',
      'mindset': 'self-development',
      'self-dev': 'self-development',
      'self-development-tests': 'self-development',
      'cat_communication': 'communication',
      'social-communication': 'communication'
    };

    const targetSlug = aliasMap[rawSlug] || rawSlug;
    const targetId = rawSlug.startsWith('cat_') ? rawSlug : `cat_${rawSlug}`;

    let query = `
      SELECT 
        c.*,
        c.display_order as sort_order,
        COUNT(a.id) as assessment_count
      FROM assessment_categories c
      LEFT JOIN assessments a ON a.category_id = c.id AND a.status = 'published'
      WHERE (c.slug = ? OR c.slug = ? OR c.id = ? OR c.id = ?)
    `;
    const params: any[] = [targetSlug, rawSlug, targetId, rawSlug];

    if (!includeNonActive) {
      query += ` AND c.status = 'active'`;
    }

    query += ` GROUP BY c.id ORDER BY c.display_order ASC LIMIT 1`;

    const row = await fetchFirst<AssessmentCategoryRow>(this.db, query, params);
    if (!row) return null;

    return {
      ...row,
      sort_order: row.display_order,
      featured: Number(row.featured) || 0,
      assessment_count: Number(row.assessment_count) || 0
    };
  }

  /**
   * Retrieves a category by ID.
   */
  async getCategoryById(id: string): Promise<AssessmentCategoryRow | null> {
    if (!this.db || !id) return null;

    const query = `
      SELECT 
        c.*,
        c.display_order as sort_order,
        COUNT(a.id) as assessment_count
      FROM assessment_categories c
      LEFT JOIN assessments a ON a.category_id = c.id AND a.status = 'published'
      WHERE c.id = ?
      GROUP BY c.id
      LIMIT 1
    `;
    const row = await fetchFirst<AssessmentCategoryRow>(this.db, query, [id]);
    if (!row) return null;

    return {
      ...row,
      sort_order: row.display_order,
      featured: Number(row.featured) || 0,
      assessment_count: Number(row.assessment_count) || 0
    };
  }

  /**
   * Retrieves published assessments for a given category.
   */
  async getPublishedAssessmentsByCategory(categoryId: string): Promise<AssessmentRow[]> {
    if (!this.db || !categoryId) return [];

    return executeQuery<AssessmentRow>(
      this.db,
      `SELECT * FROM assessments WHERE category_id = ? AND status = 'published' ORDER BY display_order ASC, created_at DESC`,
      [categoryId]
    );
  }

  /**
   * Creates a new category.
   */
  async createCategory(input: CreateCategoryInput, actorId = 'system'): Promise<AssessmentCategoryRow> {
    if (!this.db) {
      throw new Error('Database connection unavailable');
    }

    const name = (input.name || '').trim();
    if (!name || name.length < 2 || name.length > 100) {
      throw new Error('Category name must be between 2 and 100 characters');
    }

    let slug = input.slug ? AssessmentCategoryService.slugify(input.slug) : AssessmentCategoryService.slugify(name);
    if (!slug) {
      throw new Error('Valid URL slug is required');
    }

    // Check slug uniqueness
    const existing = await fetchFirst<{ id: string }>(
      this.db,
      'SELECT id FROM assessment_categories WHERE slug = ?',
      [slug]
    );
    if (existing) {
      throw new Error(`Category slug "${slug}" already exists. Please choose a unique slug.`);
    }

    const id = `cat_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const status = (input.status && ['active', 'draft', 'archived', 'inactive'].includes(input.status))
      ? input.status
      : 'active';
    const displayOrder = Number(input.sort_order ?? input.display_order ?? 0) || 0;
    const featured = input.featured ? 1 : 0;

    const shortDesc = input.short_description ? cleanText(input.short_description) : null;
    const desc = input.description ? cleanText(input.description) : null;
    const icon = input.icon ? input.icon.trim() : null;
    const image = input.image ? input.image.trim() : null;
    const seoTitle = input.seo_title ? input.seo_title.trim() : null;
    const seoDesc = input.seo_description ? input.seo_description.trim() : null;
    const canonical = input.canonical ? input.canonical.trim() : null;
    const ogTitle = input.og_title ? input.og_title.trim() : null;
    const ogDesc = input.og_description ? input.og_description.trim() : null;
    const ogImage = input.og_image ? input.og_image.trim() : null;

    await this.db
      .prepare(`
        INSERT INTO assessment_categories (
          id, name, slug, short_description, description, icon, image,
          display_order, status, featured,
          seo_title, seo_description, canonical, og_title, og_description, og_image,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
      .bind(
        id, name, slug, shortDesc, desc, icon, image,
        displayOrder, status, featured,
        seoTitle, seoDesc, canonical, ogTitle, ogDesc, ogImage
      )
      .run();

    await this.auditService.record({
      actorId,
      action: 'category_created',
      entityType: 'category',
      entityId: id,
      details: { name, slug, status, featured, displayOrder }
    });

    const created = await this.getCategoryById(id);
    if (!created) throw new Error('Failed to retrieve newly created category');
    return created;
  }

  /**
   * Updates an existing category.
   */
  async updateCategory(id: string, input: UpdateCategoryInput, actorId = 'system'): Promise<AssessmentCategoryRow> {
    if (!this.db) {
      throw new Error('Database connection unavailable');
    }

    const current = await this.getCategoryById(id);
    if (!current) {
      throw new Error(`Category not found with ID: ${id}`);
    }

    let name = current.name;
    if (input.name !== undefined) {
      name = input.name.trim();
      if (!name || name.length < 2 || name.length > 100) {
        throw new Error('Category name must be between 2 and 100 characters');
      }
    }

    let slug = current.slug;
    if (input.slug !== undefined) {
      slug = AssessmentCategoryService.slugify(input.slug);
      if (!slug) {
        throw new Error('Valid URL slug is required');
      }
      if (slug !== current.slug) {
        const existing = await fetchFirst<{ id: string }>(
          this.db,
          'SELECT id FROM assessment_categories WHERE slug = ? AND id != ?',
          [slug, id]
        );
        if (existing) {
          throw new Error(`Category slug "${slug}" already exists. Please choose a unique slug.`);
        }
      }
    }

    const status = input.status !== undefined && ['active', 'draft', 'archived', 'inactive'].includes(input.status)
      ? input.status
      : current.status;
    const displayOrder = input.sort_order !== undefined
      ? Number(input.sort_order) || 0
      : input.display_order !== undefined
      ? Number(input.display_order) || 0
      : current.display_order;
    const featured = input.featured !== undefined ? (input.featured ? 1 : 0) : (current.featured || 0);

    const shortDesc = input.short_description !== undefined
      ? (input.short_description ? cleanText(input.short_description) : null)
      : current.short_description;
    const desc = input.description !== undefined
      ? (input.description ? cleanText(input.description) : null)
      : current.description;
    const icon = input.icon !== undefined ? (input.icon ? input.icon.trim() : null) : current.icon;
    const image = input.image !== undefined ? (input.image ? input.image.trim() : null) : current.image;
    const seoTitle = input.seo_title !== undefined ? (input.seo_title ? input.seo_title.trim() : null) : current.seo_title;
    const seoDesc = input.seo_description !== undefined ? (input.seo_description ? input.seo_description.trim() : null) : current.seo_description;
    const canonical = input.canonical !== undefined ? (input.canonical ? input.canonical.trim() : null) : current.canonical;
    const ogTitle = input.og_title !== undefined ? (input.og_title ? input.og_title.trim() : null) : current.og_title;
    const ogDesc = input.og_description !== undefined ? (input.og_description ? input.og_description.trim() : null) : current.og_description;
    const ogImage = input.og_image !== undefined ? (input.og_image ? input.og_image.trim() : null) : current.og_image;

    await this.db
      .prepare(`
        UPDATE assessment_categories
        SET name = ?, slug = ?, short_description = ?, description = ?, icon = ?, image = ?,
            display_order = ?, status = ?, featured = ?,
            seo_title = ?, seo_description = ?, canonical = ?, og_title = ?, og_description = ?, og_image = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        name, slug, shortDesc, desc, icon, image,
        displayOrder, status, featured,
        seoTitle, seoDesc, canonical, ogTitle, ogDesc, ogImage,
        id
      )
      .run();

    await this.auditService.record({
      actorId,
      action: 'category_updated',
      entityType: 'category',
      entityId: id,
      details: { name, slug, status, featured, displayOrder }
    });

    const updated = await this.getCategoryById(id);
    if (!updated) throw new Error('Failed to retrieve updated category');
    return updated;
  }

  /**
   * Toggles archive status for a category.
   */
  async archiveCategory(id: string, actorId = 'system'): Promise<AssessmentCategoryRow> {
    const category = await this.getCategoryById(id);
    if (!category) {
      throw new Error(`Category not found with ID: ${id}`);
    }

    const nextStatus = category.status === 'archived' ? 'active' : 'archived';
    return this.updateCategory(id, { status: nextStatus }, actorId);
  }

  /**
   * Safely deletes a category only if no assessments are assigned to it.
   */
  async deleteCategory(id: string, actorId = 'system'): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection unavailable');
    }

    const category = await this.getCategoryById(id);
    if (!category) {
      throw new Error(`Category not found with ID: ${id}`);
    }

    // Check if any assessments are assigned to this category
    const countRow = await fetchFirst<{ count: number }>(
      this.db,
      'SELECT COUNT(*) as count FROM assessments WHERE category_id = ?',
      [id]
    );

    const assessmentCount = Number(countRow?.count) || 0;
    if (assessmentCount > 0) {
      throw new Error('This category contains assessments. Reassign those assessments before deleting the category.');
    }

    await this.db
      .prepare('DELETE FROM assessment_categories WHERE id = ?')
      .bind(id)
      .run();

    await this.auditService.record({
      actorId,
      action: 'category_deleted',
      entityType: 'category',
      entityId: id,
      details: { name: category.name, slug: category.slug }
    });

    return true;
  }

  /**
   * Idempotently seeds the 7 master psychology categories if they do not exist.
   */
  async seedMasterCategories(): Promise<number> {
    if (!this.db) return 0;

    let seededCount = 0;
    for (const master of MASTER_PSYCHOLOGY_CATEGORIES) {
      const existing = await fetchFirst<{ id: string }>(
        this.db,
        'SELECT id FROM assessment_categories WHERE slug = ? OR id = ?',
        [master.slug, master.id]
      );

      if (!existing) {
        await this.db
          .prepare(`
            INSERT INTO assessment_categories (
              id, name, slug, short_description, description, icon,
              display_order, status, featured, seo_title, seo_description,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `)
          .bind(
            master.id,
            master.name,
            master.slug,
            master.short_description,
            master.description,
            master.icon,
            master.display_order,
            master.status,
            master.featured,
            master.seo_title,
            master.seo_description
          )
          .run();
        seededCount++;
      }
    }

    return seededCount;
  }
}
