import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import type {
  AssessmentAttemptRow,
  AssessmentAnswerRow,
  AssessmentScoreRow,
  ReportRow,
  AttemptStatus
} from '@/types/database';
import { executeQuery, fetchFirst } from '@/lib/db/query';

export class AttemptService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('AttemptService');
    this.db = db;
  }

  // --- Attempts ---

  public async createAttempt(params: {
    id?: string;
    userId?: string | null;
    assessmentId: string;
    sessionId: string;
  }): Promise<AssessmentAttemptRow> {
    if (!this.db) throw new Error('Database not available');

    const id = params.id || crypto.randomUUID();
    await this.db
      .prepare(
        "INSERT INTO assessment_attempts (id, user_id, assessment_id, session_id, status, current_question_index, started_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'in_progress', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
      )
      .bind(id, params.userId || null, params.assessmentId, params.sessionId)
      .run();

    const created = await this.getAttemptById(id);
    if (!created) throw new Error('Failed to retrieve created attempt');
    return created;
  }

  public async getAttemptById(id: string): Promise<AssessmentAttemptRow | null> {
    if (!this.db) return null;
    return fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [id]
    );
  }

  public async updateAttemptStatus(id: string, status: AttemptStatus, currentIndex: number = 0): Promise<void> {
    if (!this.db) throw new Error('Database not available');
    const isCompleted = status === 'completed';
    await this.db
      .prepare(
        `UPDATE assessment_attempts
         SET status = ?, current_question_index = ?, completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE completed_at END, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(status, currentIndex, isCompleted ? 1 : 0, id)
      .run();
  }

  // --- Answers ---

  public async saveAnswer(params: {
    id?: string;
    attemptId: string;
    questionId: string;
    optionId?: string | null;
    answerValue: string;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not available');
    const id = params.id || crypto.randomUUID();

    await this.db
      .prepare(
        `INSERT INTO assessment_answers (id, attempt_id, question_id, option_id, answer_value, created_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(attempt_id, question_id) DO UPDATE SET
           option_id = excluded.option_id,
           answer_value = excluded.answer_value,
           created_at = CURRENT_TIMESTAMP`
      )
      .bind(id, params.attemptId, params.questionId, params.optionId || null, params.answerValue)
      .run();
  }

  public async getAttemptAnswers(attemptId: string): Promise<AssessmentAnswerRow[]> {
    if (!this.db) return [];
    return executeQuery<AssessmentAnswerRow>(
      this.db,
      'SELECT * FROM assessment_answers WHERE attempt_id = ? ORDER BY created_at ASC',
      [attemptId]
    );
  }

  // --- Scores ---

  public async saveScores(scores: Omit<AssessmentScoreRow, 'created_at'>[]): Promise<void> {
    if (!this.db || scores.length === 0) return;
    const statements = scores.map((s) =>
      this.db!.prepare(
        'INSERT INTO assessment_scores (id, attempt_id, dimension_id, raw_score, normalized_score, percentage, result_type_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).bind(s.id, s.attempt_id, s.dimension_id || null, s.raw_score, s.normalized_score, s.percentage, s.result_type_id || null)
    );
    await this.db.batch(statements);
  }

  public async getAttemptScores(attemptId: string): Promise<AssessmentScoreRow[]> {
    if (!this.db) return [];
    return executeQuery<AssessmentScoreRow>(
      this.db,
      'SELECT * FROM assessment_scores WHERE attempt_id = ? ORDER BY raw_score DESC',
      [attemptId]
    );
  }

  // --- Reports ---

  public async createReport(data: Omit<ReportRow, 'created_at' | 'updated_at'>): Promise<ReportRow> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        `INSERT INTO reports (
          id, user_id, attempt_id, report_type, status, file_reference, content_data,
          error_message, generated_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(
        data.id, data.user_id || null, data.attempt_id, data.report_type, data.status,
        data.file_reference || null, data.content_data || null, data.error_message || null, data.generated_at || null
      )
      .run();

    const created = await fetchFirst<ReportRow>(this.db, 'SELECT * FROM reports WHERE id = ?', [data.id]);
    if (!created) throw new Error('Failed to retrieve created report');
    return created;
  }

  public async getAttemptReport(attemptId: string): Promise<ReportRow | null> {
    if (!this.db) return null;
    return fetchFirst<ReportRow>(this.db, 'SELECT * FROM reports WHERE attempt_id = ?', [attemptId]);
  }
}
