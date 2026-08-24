import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import type { PostRow } from '@/types/database';

export interface RecommendedAssessment {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  categoryName: string;
  estimatedMinutes: number;
  reason: string; // e.g. "Popular in Personality", "Next in Series" (Safe & non-diagnostic)
}

export interface RecommendedPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  readingTimeMinutes: number;
  publishedAt: string;
}

export class RecommendationService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db?: D1Database | null) {
    super('RecommendationService');
    this.db = db || null;
  }

  /**
   * Generates safe, non-sensitive assessment recommendations based on category affinity and popularity
   */
  public async getRecommendedAssessments(
    currentAssessmentId?: string | null,
    userId?: string | null,
    limit = 3
  ): Promise<RecommendedAssessment[]> {
    if (!this.db) return [];

    let targetCategoryId: string | null = null;
    const completedAssessmentIds: Set<string> = new Set();

    if (currentAssessmentId) {
      const current = await fetchFirst<{ category_id: string }>(
        this.db,
        `SELECT category_id FROM assessments WHERE id = ?`,
        [currentAssessmentId]
      );
      if (current) targetCategoryId = current.category_id;
    }

    if (userId) {
      const completedRows = await executeQuery<{ assessment_id: string }>(
        this.db,
        `SELECT DISTINCT assessment_id FROM assessment_attempts WHERE user_id = ? AND status = 'completed'`,
        [userId]
      );
      for (const r of completedRows) {
        completedAssessmentIds.add(r.assessment_id);
      }
    }

    // 1. Fetch assessments in same category first
    let query = `
      SELECT a.id, a.slug, a.name, a.short_description, a.estimated_minutes, c.name as category_name
      FROM assessments a
      LEFT JOIN assessment_categories c ON a.category_id = c.id
      WHERE a.status = 'published'
    `;
    const params: unknown[] = [];

    if (currentAssessmentId) {
      query += ` AND a.id != ?`;
      params.push(currentAssessmentId);
    }

    query += ` ORDER BY a.featured DESC, a.created_at DESC LIMIT ?`;
    params.push(limit * 2);

    const candidates = await executeQuery<{
      id: string;
      slug: string;
      name: string;
      short_description: string;
      estimated_minutes: number;
      category_name: string;
    }>(this.db, query, params);

    const recommendations: RecommendedAssessment[] = [];

    for (const cand of candidates) {
      if (recommendations.length >= limit) break;

      const isCompleted = completedAssessmentIds.has(cand.id);
      let reason = 'Popular Assessment';

      if (targetCategoryId && isCompleted) {
        reason = 'Explore Related Psychometrics';
      } else if (!isCompleted) {
        reason = 'You may also be interested in';
      }

      recommendations.push({
        id: cand.id,
        slug: cand.slug,
        name: cand.name,
        shortDescription: cand.short_description,
        categoryName: cand.category_name || 'Psychometrics',
        estimatedMinutes: cand.estimated_minutes,
        reason
      });
    }

    return recommendations;
  }

  /**
   * Recommends relevant articles / guides based on category without psychological assumptions
   */
  public async getRelatedArticles(categorySlug?: string | null, limit = 3): Promise<RecommendedPost[]> {
    if (!this.db) return [];

    let query = `
      SELECT p.id, p.slug, p.title, p.excerpt, p.reading_time_minutes, p.published_at
      FROM posts p
      WHERE p.status = 'published'
    `;
    const params: unknown[] = [];

    if (categorySlug) {
      query += ` AND (p.category_id IN (SELECT id FROM blog_categories WHERE slug = ?) OR p.category_id IS NULL)`;
      params.push(categorySlug);
    }

    query += ` ORDER BY p.featured DESC, p.published_at DESC LIMIT ?`;
    params.push(limit);

    const rows = await executeQuery<PostRow>(this.db, query, params);

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      readingTimeMinutes: r.reading_time_minutes || 5,
      publishedAt: r.published_at || new Date().toISOString()
    }));
  }
}
