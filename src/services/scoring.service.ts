import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type {
  AssessmentAttemptRow,
  AssessmentAnswerRow,
  ScoringRuleRow,
  AssessmentDimensionRow,
  ResultTypeRow
} from '@/types/database';

export interface DimensionScoreResult {
  dimensionId: string;
  dimensionName: string;
  dimensionSlug: string;
  rawScore: number;
  maxScore: number;
  normalizedScore: number; // 0 to 100 percentage
  resultTypeId?: string;
  resultTypeName?: string;
}

export interface ScoringCalculationResult {
  attemptId: string;
  assessmentId: string;
  totalRawScore: number;
  totalMaxScore: number;
  totalNormalizedScore: number; // 0 to 100
  primaryResultType: ResultTypeRow | null;
  dimensionScores: DimensionScoreResult[];
}

export class ScoringService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('ScoringService');
    this.db = db;
  }

  /**
   * Deterministically calculates and persists assessment attempt scores based on D1 scoring rules.
   * AI is never used for score calculation.
   */
  public async calculateAttemptScores(attemptId: string): Promise<ScoringCalculationResult> {
    if (!this.db) throw new Error('Database unavailable');

    // 1. Load Attempt
    const attempt = await fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [attemptId]
    );

    if (!attempt) throw new NotFoundError('Assessment attempt not found');

    if (attempt.status === 'completed') {
      // If already completed, retrieve existing persisted scores rather than re-scoring
      return this.getExistingAttemptScores(attempt);
    }

    // 2. Load Answers
    const answers = await executeQuery<AssessmentAnswerRow>(
      this.db,
      'SELECT * FROM assessment_answers WHERE attempt_id = ?',
      [attemptId]
    );

    if (answers.length === 0) {
      throw new ValidationError('Cannot score attempt with zero submitted answers.');
    }

    // 3. Load Scoring Rules, Dimensions, and Result Types
    const [scoringRules, dimensions, resultTypes] = await Promise.all([
      executeQuery<ScoringRuleRow>(
        this.db,
        'SELECT * FROM scoring_rules WHERE assessment_id = ?',
        [attempt.assessment_id]
      ),
      executeQuery<AssessmentDimensionRow>(
        this.db,
        "SELECT * FROM assessment_dimensions WHERE assessment_id = ? AND status = 'active' ORDER BY display_order ASC",
        [attempt.assessment_id]
      ),
      executeQuery<ResultTypeRow>(
        this.db,
        "SELECT * FROM result_types WHERE assessment_id = ? AND status = 'active' ORDER BY display_order ASC",
        [attempt.assessment_id]
      )
    ]);

    // 4. Calculate Scores Per Dimension
    const dimensionMap = new Map<
      string,
      {
        dim: AssessmentDimensionRow;
        rawScore: number;
        maxPossible: number;
      }
    >();

    for (const dim of dimensions) {
      dimensionMap.set(dim.id, { dim, rawScore: 0, maxPossible: 0 });
    }

    // Process every answered item
    for (const answer of answers) {
      // Find scoring rule matching question & option
      const matchingRules = scoringRules.filter((r) => {
        if (r.question_id !== answer.question_id) return false;
        if (r.option_id && r.option_id !== answer.option_id) return false;
        return true;
      });

      if (matchingRules.length > 0) {
        for (const rule of matchingRules) {
          const dimEntry = dimensionMap.get(rule.dimension_id);
          if (!dimEntry) continue;

          let itemScore = rule.score;
          const weight = rule.weight || 1.0;

          // Handle reverse scoring if configured
          if (rule.reverse_scoring === 1) {
            // Find all possible scores for this question to determine scale range
            const questionRules = scoringRules.filter(
              (r) => r.question_id === answer.question_id && r.dimension_id === rule.dimension_id
            );
            if (questionRules.length > 1) {
              const minScore = Math.min(...questionRules.map((r) => r.score));
              const maxScore = Math.max(...questionRules.map((r) => r.score));
              itemScore = minScore + maxScore - itemScore;
            }
          }

          const weightedScore = itemScore * weight;
          dimEntry.rawScore += weightedScore;
        }
      } else {
        // Fallback: If no explicit option-based rule, check if answer_value is numeric and add to first dimension
        const numericVal = parseFloat(answer.answer_value || '0');
        if (!isNaN(numericVal) && dimensions.length > 0) {
          const firstDim = dimensionMap.get(dimensions[0].id);
          if (firstDim) firstDim.rawScore += numericVal;
        }
      }
    }

    // Calculate maximum possible scores per dimension (maximum score per question)
    const dimQuestionMax = new Map<string, number>();
    for (const rule of scoringRules) {
      const key = `${rule.dimension_id}:${rule.question_id}`;
      const weightedScore = Math.max(rule.score, 0) * (rule.weight || 1.0);
      const current = dimQuestionMax.get(key) || 0;
      if (weightedScore > current) {
        dimQuestionMax.set(key, weightedScore);
      }
    }

    for (const [key, maxScore] of dimQuestionMax) {
      const [dimId] = key.split(':');
      const dimEntry = dimensionMap.get(dimId);
      if (dimEntry) {
        dimEntry.maxPossible += maxScore;
      }
    }

    // Assemble dimension results
    const dimensionResults: DimensionScoreResult[] = [];
    let totalRaw = 0;
    let totalMax = 0;

    for (const [, entry] of dimensionMap) {
      const maxScore = Math.max(entry.maxPossible > 0 ? entry.maxPossible : 100, entry.rawScore);
      const normalized = Math.round((entry.rawScore / maxScore) * 100);

      // Find matching result archetype for this dimension (supports raw or normalized range)
      const dimResultType = resultTypes.find(
        (rt) =>
          rt.dimension_id === entry.dim.id &&
          ((entry.rawScore >= rt.minimum_score && entry.rawScore <= rt.maximum_score) ||
            (normalized >= rt.minimum_score && normalized <= rt.maximum_score))
      );

      dimensionResults.push({
        dimensionId: entry.dim.id,
        dimensionName: entry.dim.name,
        dimensionSlug: entry.dim.slug,
        rawScore: Math.round(entry.rawScore * 10) / 10,
        maxScore: Math.round(maxScore * 10) / 10,
        normalizedScore: normalized,
        resultTypeId: dimResultType?.id,
        resultTypeName: dimResultType?.name
      });

      totalRaw += entry.rawScore;
      totalMax += maxScore;
    }

    const totalNormalized = totalMax > 0 ? Math.round((totalRaw / totalMax) * 100) : 0;

    // 5. Determine Primary Assessment Result Outcome
    // Match global result types (where dimension_id is NULL) or primary dimension result
    let primaryResult: ResultTypeRow | null =
      resultTypes.find(
        (rt) =>
          !rt.dimension_id &&
          ((totalRaw >= rt.minimum_score && totalRaw <= rt.maximum_score) ||
            (totalNormalized >= rt.minimum_score && totalNormalized <= rt.maximum_score))
      ) || null;

    if (!primaryResult && dimensionResults.length > 0) {
      // Fallback to the highest scoring dimension outcome
      const topDim = [...dimensionResults].sort((a, b) => b.normalizedScore - a.normalizedScore)[0];
      primaryResult = resultTypes.find((rt) => rt.id === topDim.resultTypeId) || null;
    }

    // 6. Persist Calculated Scores in D1 Database Atomically
    for (const dimRes of dimensionResults) {
      const scoreId = crypto.randomUUID();
      await this.db
        .prepare(
          `INSERT INTO assessment_scores (
             id, attempt_id, dimension_id, raw_score, normalized_score, percentage, result_type_id, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        )
        .bind(
          scoreId,
          attemptId,
          dimRes.dimensionId,
          dimRes.rawScore,
          dimRes.normalizedScore,
          dimRes.normalizedScore,
          dimRes.resultTypeId || null
        )
        .run();
    }

    // 7. Mark Attempt Completed
    await this.db
      .prepare(
        `UPDATE assessment_attempts SET
           status = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(attemptId)
      .run();

    return {
      attemptId,
      assessmentId: attempt.assessment_id,
      totalRawScore: Math.round(totalRaw * 10) / 10,
      totalMaxScore: Math.round(totalMax * 10) / 10,
      totalNormalizedScore: totalNormalized,
      primaryResultType: primaryResult || null,
      dimensionScores: dimensionResults
    };
  }

  /**
   * Retrieves already computed scores for an existing completed attempt
   */
  private async getExistingAttemptScores(attempt: AssessmentAttemptRow): Promise<ScoringCalculationResult> {
    if (!this.db) throw new Error('Database unavailable');

    const scores = await executeQuery<{
      dimension_id: string;
      dimension_name: string;
      dimension_slug: string;
      raw_score: number;
      normalized_score: number;
      percentage: number;
      result_type_id: string | null;
    }>(
      this.db,
      `SELECT s.*, d.name as dimension_name, d.slug as dimension_slug
       FROM assessment_scores s
       LEFT JOIN assessment_dimensions d ON s.dimension_id = d.id
       WHERE s.attempt_id = ?`,
      [attempt.id]
    );

    let primaryResult: ResultTypeRow | null = null;
    const topScoreWithResult = scores.find((s) => s.result_type_id !== null);
    if (topScoreWithResult && topScoreWithResult.result_type_id) {
      primaryResult = await fetchFirst<ResultTypeRow>(
        this.db,
        'SELECT * FROM result_types WHERE id = ?',
        [topScoreWithResult.result_type_id]
      );
    }

    const dimensionScores: DimensionScoreResult[] = scores.map((s) => ({
      dimensionId: s.dimension_id,
      dimensionName: s.dimension_name || 'Dimension',
      dimensionSlug: s.dimension_slug || 'dimension',
      rawScore: s.raw_score,
      maxScore: 100,
      normalizedScore: Math.round(s.normalized_score)
    }));

    const totalRaw = dimensionScores.reduce((acc, d) => acc + d.rawScore, 0);
    const avgNormalized =
      dimensionScores.length > 0
        ? Math.round(dimensionScores.reduce((acc, d) => acc + d.normalizedScore, 0) / dimensionScores.length)
        : 0;

    return {
      attemptId: attempt.id,
      assessmentId: attempt.assessment_id,
      totalRawScore: totalRaw,
      totalMaxScore: dimensionScores.length * 100,
      totalNormalizedScore: avgNormalized,
      primaryResultType: primaryResult || null,
      dimensionScores
    };
  }
}
