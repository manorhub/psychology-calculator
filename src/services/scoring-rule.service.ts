import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import type { ScoringRuleRow } from '@/types/database';
import { executeQuery } from '@/lib/db/query';

export class ScoringRuleService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('ScoringRuleService');
    this.db = db;
  }

  public async getRulesByAssessment(assessmentId: string): Promise<ScoringRuleRow[]> {
    if (!this.db) return [];
    return executeQuery<ScoringRuleRow>(
      this.db,
      'SELECT * FROM scoring_rules WHERE assessment_id = ? ORDER BY question_id ASC',
      [assessmentId]
    );
  }

  public async getRulesForQuestion(questionId: string): Promise<ScoringRuleRow[]> {
    if (!this.db) return [];
    return executeQuery<ScoringRuleRow>(
      this.db,
      'SELECT * FROM scoring_rules WHERE question_id = ?',
      [questionId]
    );
  }

  public async createScoringRule(data: Omit<ScoringRuleRow, 'created_at' | 'updated_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        'INSERT INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight, reverse_scoring, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .bind(data.id, data.assessment_id, data.question_id, data.dimension_id, data.option_id || null, data.score, data.weight, data.reverse_scoring)
      .run();
  }

  public async bulkCreateRules(rules: Omit<ScoringRuleRow, 'created_at' | 'updated_at'>[]): Promise<void> {
    if (!this.db || rules.length === 0) return;
    const statements = rules.map((r) =>
      this.db!.prepare(
        'INSERT INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight, reverse_scoring, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      ).bind(r.id, r.assessment_id, r.question_id, r.dimension_id, r.option_id || null, r.score, r.weight, r.reverse_scoring)
    );
    await this.db.batch(statements);
  }
}
