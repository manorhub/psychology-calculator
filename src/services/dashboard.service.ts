import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import { CreditService } from './credit.service';

export interface UserAssessmentItem {
  attemptId: string;
  assessmentId: string;
  assessmentName: string;
  assessmentSlug: string;
  categoryName: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface UserResultItem {
  attemptId: string;
  assessmentId: string;
  assessmentName: string;
  assessmentSlug: string;
  categoryName: string;
  primaryArchetype: string;
  normalizedScore: number;
  durationSeconds: number;
  completedAt: string;
}

export interface UserReportItem {
  reportId: string;
  attemptId: string;
  assessmentName: string;
  assessmentSlug: string;
  primaryArchetype: string;
  status: string;
  generatedAt: string;
}

export class DashboardService extends BaseService {
  private readonly db: D1Database | null;
  private readonly creditService: CreditService;

  constructor(db: D1Database | null) {
    super('DashboardService');
    this.db = db;
    this.creditService = new CreditService(db);
  }

  /**
   * Aggregates key metrics and active items for the user dashboard home
   */
  public async getDashboardOverview(userId: string): Promise<{
    completedCount: number;
    inProgressCount: number;
    reportsCount: number;
    creditBalance: number;
    activeAttempt: UserAssessmentItem | null;
    recentResults: UserResultItem[];
    recentReports: UserReportItem[];
  }> {
    if (!this.db) {
      return {
        completedCount: 0,
        inProgressCount: 0,
        reportsCount: 0,
        creditBalance: 0,
        activeAttempt: null,
        recentResults: [],
        recentReports: []
      };
    }

    const [counts, balance, activeAttempt, recentResults, recentReports] = await Promise.all([
      fetchFirst<{ completed: number; in_progress: number }>(
        this.db,
        `SELECT
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress
         FROM assessment_attempts WHERE user_id = ?`,
        [userId]
      ),
      this.creditService.getUserBalance(userId),
      this.getActiveInProgressAttempt(userId),
      this.getUserResults(userId, 5),
      this.getUserReports(userId, 3)
    ]);

    const reportsCountRow = await fetchFirst<{ count: number }>(
      this.db,
      "SELECT COUNT(*) as count FROM reports WHERE user_id = ? AND report_type = 'ai' AND status = 'completed'",
      [userId]
    );

    return {
      completedCount: counts?.completed || 0,
      inProgressCount: counts?.in_progress || 0,
      reportsCount: reportsCountRow?.count || 0,
      creditBalance: balance.balance,
      activeAttempt,
      recentResults,
      recentReports
    };
  }

  /**
   * Retrieves an in-progress attempt if the user has one active
   */
  public async getActiveInProgressAttempt(userId: string): Promise<UserAssessmentItem | null> {
    if (!this.db) return null;

    const row = await fetchFirst<{
      attempt_id: string;
      assessment_id: string;
      assessment_name: string;
      assessment_slug: string;
      category_name: string;
      current_question_index: number;
      created_at: string;
    }>(
      this.db,
      `SELECT
         a.id as attempt_id,
         a.assessment_id,
         asm.name as assessment_name,
         asm.slug as assessment_slug,
         c.name as category_name,
         a.current_question_index,
         a.created_at
       FROM assessment_attempts a
       JOIN assessments asm ON a.assessment_id = asm.id
       LEFT JOIN assessment_categories c ON asm.category_id = c.id
       WHERE a.user_id = ? AND a.status = 'in_progress'
       ORDER BY a.updated_at DESC LIMIT 1`,
      [userId]
    );

    if (!row) return null;

    const [totalRow, answeredRow] = await Promise.all([
      fetchFirst<{ count: number }>(
        this.db,
        'SELECT COUNT(*) as count FROM assessment_questions WHERE assessment_id = ?',
        [row.assessment_id]
      ),
      fetchFirst<{ count: number }>(
        this.db,
        'SELECT COUNT(*) as count FROM assessment_answers WHERE attempt_id = ?',
        [row.attempt_id]
      )
    ]);

    return {
      attemptId: row.attempt_id,
      assessmentId: row.assessment_id,
      assessmentName: row.assessment_name,
      assessmentSlug: row.assessment_slug,
      categoryName: row.category_name,
      status: 'in_progress',
      currentQuestionIndex: row.current_question_index,
      totalQuestions: totalRow?.count || 0,
      answeredCount: answeredRow?.count || 0,
      createdAt: row.created_at,
      completedAt: null
    };
  }

  /**
   * Returns list of assessment attempts for the user with status filtering
   */
  public async getUserAssessments(
    userId: string,
    filter: 'all' | 'completed' | 'in_progress' = 'all'
  ): Promise<UserAssessmentItem[]> {
    if (!this.db) return [];

    let query = `
      SELECT
        a.id as attempt_id,
        a.assessment_id,
        asm.name as assessment_name,
        asm.slug as assessment_slug,
        c.name as category_name,
        a.status,
        a.current_question_index,
        a.created_at,
        a.completed_at
      FROM assessment_attempts a
      JOIN assessments asm ON a.assessment_id = asm.id
      LEFT JOIN assessment_categories c ON asm.category_id = c.id
      WHERE a.user_id = ?
    `;
    const params: any[] = [userId];

    if (filter === 'completed') {
      query += " AND a.status = 'completed'";
    } else if (filter === 'in_progress') {
      query += " AND a.status = 'in_progress'";
    }

    query += ' ORDER BY a.created_at DESC';

    const rows = await executeQuery<any>(this.db, query, params);

    return Promise.all(
      rows.map(async (r) => {
        const [totalRow, answeredRow] = await Promise.all([
          fetchFirst<{ count: number }>(
            this.db!,
            'SELECT COUNT(*) as count FROM assessment_questions WHERE assessment_id = ?',
            [r.assessment_id]
          ),
          fetchFirst<{ count: number }>(
            this.db!,
            'SELECT COUNT(*) as count FROM assessment_answers WHERE attempt_id = ?',
            [r.attempt_id]
          )
        ]);

        return {
          attemptId: r.attempt_id,
          assessmentId: r.assessment_id,
          assessmentName: r.assessment_name,
          assessmentSlug: r.assessment_slug,
          categoryName: r.category_name,
          status: r.status,
          currentQuestionIndex: r.current_question_index,
          totalQuestions: totalRow?.count || 0,
          answeredCount: answeredRow?.count || 0,
          createdAt: r.created_at,
          completedAt: r.completed_at
        };
      })
    );
  }

  /**
   * Returns completed results for the user
   */
  public async getUserResults(userId: string, limit = 50): Promise<UserResultItem[]> {
    if (!this.db) return [];

    const rows = await executeQuery<any>(
      this.db,
      `SELECT
         a.id as attempt_id,
         a.assessment_id,
         asm.name as assessment_name,
         asm.slug as assessment_slug,
         COALESCE(c.name, 'Psychology') as category_name,
         a.started_at,
         a.completed_at,
         a.created_at,
         rs.snapshot_data
       FROM assessment_attempts a
       JOIN assessments asm ON a.assessment_id = asm.id
       LEFT JOIN assessment_categories c ON asm.category_id = c.id
       LEFT JOIN result_snapshots rs ON a.id = rs.attempt_id
       WHERE a.user_id = ? AND a.status = 'completed'
       ORDER BY COALESCE(a.completed_at, a.created_at) DESC LIMIT ?`,
      [userId, limit]
    );

    return rows.map((r) => {
      let snapshotData: any = {};
      try {
        if (r.snapshot_data) snapshotData = JSON.parse(r.snapshot_data);
      } catch {}

      let durationSec = snapshotData.durationSeconds || 0;
      if (!durationSec && r.started_at && r.completed_at) {
        try {
          const diff = Math.round((new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000);
          if (diff > 0) durationSec = diff;
        } catch {}
      }

      return {
        attemptId: r.attempt_id,
        assessmentId: r.assessment_id,
        assessmentName: r.assessment_name,
        assessmentSlug: r.assessment_slug,
        categoryName: r.category_name || 'Psychology',
        primaryArchetype: snapshotData.primaryResultType?.name || 'Assessed Outcome',
        normalizedScore: Math.round(snapshotData.totalNormalizedScore || 0),
        durationSeconds: durationSec,
        completedAt: r.completed_at || r.created_at || new Date().toISOString()
      };
    });
  }

  /**
   * Returns AI reports for the user
   */
  public async getUserReports(userId: string, limit = 50): Promise<UserReportItem[]> {
    if (!this.db) return [];

    const rows = await executeQuery<any>(
      this.db,
      `SELECT
         rep.id as report_id,
         rep.attempt_id,
         asm.name as assessment_name,
         asm.slug as assessment_slug,
         rep.status,
         rep.generated_at,
         rep.created_at,
         rs.snapshot_data
       FROM reports rep
       JOIN assessment_attempts a ON rep.attempt_id = a.id
       JOIN assessments asm ON a.assessment_id = asm.id
       LEFT JOIN result_snapshots rs ON a.id = rs.attempt_id
       WHERE rep.user_id = ? AND rep.report_type = 'ai'
       ORDER BY rep.created_at DESC LIMIT ?`,
      [userId, limit]
    );

    return rows.map((r) => {
      let snapshotData: any = {};
      try {
        if (r.snapshot_data) snapshotData = JSON.parse(r.snapshot_data);
      } catch {}

      return {
        reportId: r.report_id,
        attemptId: r.attempt_id,
        assessmentName: r.assessment_name,
        assessmentSlug: r.assessment_slug,
        primaryArchetype: snapshotData.primaryResultType?.name || 'Psychological Evaluation',
        status: r.status,
        generatedAt: r.generated_at || r.created_at
      };
    });
  }

  /**
   * Returns credit transactions history for the user
   */
  public async getCreditHistory(userId: string, limit = 50): Promise<{
    balance: number;
    transactions: Array<{
      id: string;
      amount: number;
      transactionType: string;
      source: string;
      metadata: any;
      createdAt: string;
    }>;
  }> {
    if (!this.db) return { balance: 0, transactions: [] };

    const balance = await this.creditService.getUserBalance(userId);
    const txRows = await executeQuery<any>(
      this.db,
      'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );

    const transactions = txRows.map((t) => {
      let meta: any = {};
      try {
        if (t.metadata) meta = JSON.parse(t.metadata);
      } catch {}
      return {
        id: t.id,
        amount: t.amount,
        transactionType: t.transaction_type,
        source: t.source,
        metadata: meta,
        createdAt: t.created_at
      };
    });

    return { balance: balance.balance, transactions };
  }
}
