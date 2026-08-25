import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery } from '@/lib/db/query';
import type { InternalLinkRuleRow, AssessmentRow, AssessmentCategoryRow, BreadcrumbItem } from '@/types/database';

export interface RelatedLink {
  id: string;
  title: string;
  name?: string;
  slug: string;
  url: string;
  icon?: string;
  anchorText?: string;
  categoryName?: string;
  description?: string;
}

export class InternalLinkService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('InternalLinkService');
    this.db = db;
  }

  /**
   * Retrieves related assessments for an assessment page (configured rules + same category fallback)
   */
  public async getRelatedAssessments(
    assessmentId: string,
    categoryId?: string | null,
    limit = 4
  ): Promise<RelatedLink[]> {
    if (!this.db) return [];

    const results: RelatedLink[] = [];
    const seenIds = new Set<string>([assessmentId]);

    // 1. Query explicitly configured rules from internal_link_rules
    const explicitRules = await executeQuery<
      InternalLinkRuleRow & {
        target_title: string;
        target_slug: string;
        target_desc: string;
        cat_name: string;
      }
    >(
      this.db,
      `SELECT r.*, a.name as target_title, a.slug as target_slug, a.short_description as target_desc, c.name as cat_name
       FROM internal_link_rules r
       JOIN assessments a ON r.target_id = a.id
       LEFT JOIN assessment_categories c ON a.category_id = c.id
       WHERE r.source_type = 'assessment' AND r.source_id = ? AND r.is_active = 1 AND a.status = 'published'
       ORDER BY r.display_order ASC LIMIT ?`,
      [assessmentId, limit]
    );

    for (const rule of explicitRules) {
      seenIds.add(rule.target_id);
      results.push({
        id: rule.target_id,
        title: rule.target_title,
        slug: rule.target_slug,
        url: `/assessments/${rule.target_slug}`,
        anchorText: rule.anchor_text || rule.target_title,
        description: rule.target_desc,
        categoryName: rule.cat_name
      });
    }

    // 2. Fill remaining slots with published assessments from the same category
    if (results.length < limit && categoryId) {
      const needed = limit - results.length;
      const categoryAssessments = await executeQuery<
        AssessmentRow & { cat_name: string }
      >(
        this.db,
        `SELECT a.*, a.name as title, c.name as cat_name
         FROM assessments a
         LEFT JOIN assessment_categories c ON a.category_id = c.id
         WHERE a.category_id = ? AND a.status = 'published' AND a.id != ?
         ORDER BY a.display_order ASC, a.created_at DESC LIMIT ?`,
        [categoryId, assessmentId, needed + 5]
      );

      for (const asm of categoryAssessments) {
        if (!seenIds.has(asm.id) && results.length < limit) {
          seenIds.add(asm.id);
          results.push({
            id: asm.id,
            title: asm.name,
            slug: asm.slug,
            url: `/assessments/${asm.slug}`,
            anchorText: `Explore ${asm.name}`,
            description: asm.short_description || undefined,
            categoryName: asm.cat_name
          });
        }
      }
    }

    // 3. Fallback to top overall published assessments if still under limit
    if (results.length < limit) {
      const needed = limit - results.length;
      const popular = await executeQuery<AssessmentRow & { cat_name: string }>(
        this.db,
        `SELECT a.*, a.name as title, c.name as cat_name
         FROM assessments a
         LEFT JOIN assessment_categories c ON a.category_id = c.id
         WHERE a.status = 'published' AND a.id != ?
         ORDER BY a.display_order ASC LIMIT ?`,
        [assessmentId, needed + 5]
      );

      for (const asm of popular) {
        if (!seenIds.has(asm.id) && results.length < limit) {
          seenIds.add(asm.id);
          results.push({
            id: asm.id,
            title: asm.name,
            slug: asm.slug,
            url: `/assessments/${asm.slug}`,
            anchorText: `Take the ${asm.name}`,
            description: asm.short_description || undefined,
            categoryName: asm.cat_name
          });
        }
      }
    }

    return results;
  }

  /**
   * Retrieves related categories for internal linking
   */
  public async getRelatedCategories(currentCategoryId?: string | null, limit = 5): Promise<RelatedLink[]> {
    if (!this.db) return [];

    const query = currentCategoryId
      ? `SELECT * FROM assessment_categories WHERE status = 'active' AND id != ? ORDER BY display_order ASC LIMIT ?`
      : `SELECT * FROM assessment_categories WHERE status = 'active' ORDER BY display_order ASC LIMIT ?`;

    const params = currentCategoryId ? [currentCategoryId, limit] : [limit];
    const categories = await executeQuery<AssessmentCategoryRow>(this.db, query, params);

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      title: cat.name,
      slug: cat.slug,
      icon: cat.icon || '🧠',
      url: `/assessments/category/${cat.slug}`,
      description: cat.short_description || cat.description || undefined
    }));
  }

  /**
   * Builds standardized breadcrumbs array
   */
  public getBreadcrumbs(items: Array<{ name: string; path: string }>): BreadcrumbItem[] {
    const list: BreadcrumbItem[] = [{ name: 'Home', url: '/' }];

    for (const item of items) {
      list.push({
        name: item.name,
        url: item.path.startsWith('/') ? item.path : `/${item.path}`
      });
    }

    return list;
  }
}
