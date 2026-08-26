import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst, executeMutation } from '@/lib/db/query';
import { ValidationError } from '@/lib/errors';
import { RateLimiter } from '@/lib/security';

export interface UserFeedbackRow {
  id: string;
  entity_type: 'assessment' | 'result' | 'ai_report' | 'page';
  entity_id: string;
  user_id: string | null;
  session_id: string | null;
  rating: number | null; // 1 - 5
  is_helpful: number | null; // 0 or 1
  comment: string | null;
  status: 'active' | 'reviewed' | 'archived';
  created_at: string;
}

export interface FeedbackSummary {
  totalCount: number;
  helpfulCount: number;
  unhelpfulCount: number;
  helpfulPercentage: number; // 0 - 100
  averageRating: number; // 1.0 - 5.0
  ratingDistribution: Record<number, number>; // { 1: n, 2: n, 3: n, 4: n, 5: n }
}

export interface SubmitFeedbackInput {
  entityType: 'assessment' | 'result' | 'ai_report' | 'page';
  entityId: string;
  userId?: string | null;
  sessionId?: string | null;
  rating?: number | null;
  isHelpful?: boolean | null;
  comment?: string | null;
  ipAddress?: string;
}

export class FeedbackService extends BaseService {
  private readonly db: D1Database | null;
  private readonly rateLimiter: RateLimiter | null;

  constructor(db?: D1Database | null) {
    super('FeedbackService');
    this.db = db || null;
    this.rateLimiter = db ? new RateLimiter(db) : null;
  }

  /**
   * Submits user rating or helpfulness feedback with spam & rate-limit protection
   */
  public async submitFeedback(input: SubmitFeedbackInput): Promise<{ id: string; success: boolean }> {
    if (!this.db) throw new Error('Database unavailable');

    // 1. Rate Limiting Check (Max 10 submissions per hour per IP/user)
    if (this.rateLimiter && input.ipAddress) {
      const rateCheck = await this.rateLimiter.checkLimit(input.ipAddress, 'feedback_submit', 10, 3600);
      if (!rateCheck.allowed) {
        throw new ValidationError('Feedback submission rate limit exceeded. Please wait a while.');
      }
    }

    if (input.rating !== undefined && input.rating !== null) {
      if (input.rating < 1 || input.rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
      }
    }

    const feedbackId = `fb_${crypto.randomUUID().slice(0, 10)}`;
    const isHelpfulVal = input.isHelpful !== undefined && input.isHelpful !== null ? (input.isHelpful ? 1 : 0) : null;
    const cleanComment = input.comment ? input.comment.trim().substring(0, 1000) : null;

    await executeMutation(
      this.db,
      `INSERT INTO user_feedback (id, entity_type, entity_id, user_id, session_id, rating, is_helpful, comment, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)`,
      [
        feedbackId,
        input.entityType,
        input.entityId,
        input.userId || null,
        input.sessionId || null,
        input.rating || null,
        isHelpfulVal,
        cleanComment
      ]
    );

    return { id: feedbackId, success: true };
  }

  /**
   * Computes aggregate sentiment statistics for an assessment or result
   */
  public async getFeedbackSummary(entityType?: string, entityId?: string): Promise<FeedbackSummary> {
    if (!this.db) {
      return {
        totalCount: 0,
        helpfulCount: 0,
        unhelpfulCount: 0,
        helpfulPercentage: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    let query = `SELECT rating, is_helpful FROM user_feedback WHERE status != 'archived'`;
    const params: unknown[] = [];

    if (entityType && entityId) {
      query += ` AND entity_type = ? AND entity_id = ?`;
      params.push(entityType, entityId);
    } else if (entityType) {
      query += ` AND entity_type = ?`;
      params.push(entityType);
    }

    const rows = await executeQuery<{ rating: number | null; is_helpful: number | null }>(this.db, query, params);

    let totalCount = rows.length;
    let helpfulCount = 0;
    let unhelpfulCount = 0;
    let totalRatingSum = 0;
    let ratedCount = 0;
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const r of rows) {
      if (r.is_helpful === 1) helpfulCount++;
      if (r.is_helpful === 0) unhelpfulCount++;

      if (r.rating && r.rating >= 1 && r.rating <= 5) {
        totalRatingSum += r.rating;
        ratedCount++;
        ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
      }
    }

    const totalHelpfulFeedback = helpfulCount + unhelpfulCount;
    const helpfulPercentage = totalHelpfulFeedback > 0 ? Math.round((helpfulCount / totalHelpfulFeedback) * 100) : 0;
    const averageRating = ratedCount > 0 ? Math.round((totalRatingSum / ratedCount) * 10) / 10 : 0;

    return {
      totalCount,
      helpfulCount,
      unhelpfulCount,
      helpfulPercentage,
      averageRating,
      ratingDistribution
    };
  }

  /**
   * Admin feedback explorer list
   */
  public async getAdminFeedbackList(
    status?: string,
    limit = 50,
    offset = 0
  ): Promise<{ items: UserFeedbackRow[]; total: number }> {
    if (!this.db) return { items: [], total: 0 };

    let query = `SELECT f.*, u.email as user_email FROM user_feedback f LEFT JOIN users u ON f.user_id = u.id`;
    const params: unknown[] = [];

    if (status && status !== 'all') {
      query += ` WHERE f.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY f.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const items = await executeQuery<UserFeedbackRow>(this.db, query, params);

    const countRow = await fetchFirst<{ count: number }>(
      this.db,
      `SELECT COUNT(*) as count FROM user_feedback ${status && status !== 'all' ? 'WHERE status = ?' : ''}`,
      status && status !== 'all' ? [status] : []
    );

    return {
      items,
      total: countRow?.count || 0
    };
  }

  /**
   * Updates feedback moderation status
   */
  public async updateFeedbackStatus(id: string, status: 'active' | 'reviewed' | 'archived'): Promise<void> {
    if (!this.db) return;

    await executeMutation(
      this.db,
      `UPDATE user_feedback SET status = ? WHERE id = ?`,
      [status, id]
    );
  }
}
