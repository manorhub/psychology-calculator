import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import type {
  AssessmentRow,
  AssessmentDimensionRow,
  AssessmentQuestionRow,
  QuestionOptionRow,
  ResultTypeRow
} from '@/types/database';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class AssessmentValidatorService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('AssessmentValidatorService');
    this.db = db;
  }

  /**
   * Validates whether an assessment is completely and correctly configured for publication.
   */
  public async validateForPublish(assessmentId: string): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!this.db) {
      return { isValid: false, errors: ['Database connection is unavailable'] };
    }

    // 1. Validate Assessment Basic Metadata
    const assessment = await fetchFirst<AssessmentRow>(
      this.db,
      'SELECT * FROM assessments WHERE id = ?',
      [assessmentId]
    );

    if (!assessment) {
      return { isValid: false, errors: ['Assessment not found'] };
    }

    if (!assessment.name || assessment.name.trim().length < 3) {
      errors.push('Assessment name must be at least 3 characters long.');
    }

    if (!assessment.slug || !/^[a-z0-9-]+$/.test(assessment.slug)) {
      errors.push('Assessment slug must be URL-safe (lowercase letters, numbers, and hyphens).');
    }

    if (!assessment.category_id) {
      errors.push('Assessment must be assigned to a category.');
    }

    if (!assessment.short_description || assessment.short_description.trim().length < 10) {
      errors.push('Short description must be at least 10 characters long.');
    }

    // 2. Validate Dimensions
    const dimensions = await executeQuery<AssessmentDimensionRow>(
      this.db,
      "SELECT * FROM assessment_dimensions WHERE assessment_id = ? AND status = 'active'",
      [assessmentId]
    );

    if (dimensions.length === 0) {
      errors.push('Assessment must define at least one active dimension (e.g. Openness, Extroversion, Total Score).');
    }

    // 3. Validate Questions and Options
    const questions = await executeQuery<AssessmentQuestionRow>(
      this.db,
      "SELECT * FROM assessment_questions WHERE assessment_id = ? AND status = 'active'",
      [assessmentId]
    );

    if (questions.length === 0) {
      errors.push('Assessment must contain at least one active question item.');
    }

    for (const q of questions) {
      if (!q.question_text || q.question_text.trim().length < 2) {
        errors.push(`Question #${q.display_order + 1} has empty text.`);
      }

      const options = await executeQuery<QuestionOptionRow>(
        this.db,
        "SELECT * FROM question_options WHERE question_id = ? AND status = 'active'",
        [q.id]
      );

      if (options.length < 2) {
        errors.push(`Question "${q.question_text.substring(0, 30)}..." must have at least 2 response options.`);
      }
    }

    // 4. Validate Scoring Rules
    const scoringRulesCount = await fetchFirst<{ count: number }>(
      this.db,
      'SELECT COUNT(*) as count FROM scoring_rules WHERE assessment_id = ?',
      [assessmentId]
    );

    if ((scoringRulesCount?.count ?? 0) === 0) {
      errors.push('Assessment must have scoring rules configured mapping questions/options to dimensions.');
    }

    // 5. Validate Result Archetypes / Types
    const resultTypes = await executeQuery<ResultTypeRow>(
      this.db,
      "SELECT * FROM result_types WHERE assessment_id = ? AND status = 'active'",
      [assessmentId]
    );

    if (resultTypes.length === 0) {
      errors.push('Assessment must define at least one result outcome type (e.g. High, Moderate, Low).');
    }

    for (const res of resultTypes) {
      if (res.minimum_score > res.maximum_score) {
        errors.push(`Result "${res.name}" has minimum score (${res.minimum_score}) greater than maximum score (${res.maximum_score}).`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
