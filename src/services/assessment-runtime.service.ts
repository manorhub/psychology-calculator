import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';
import { ScoringService, type ScoringCalculationResult } from './scoring.service';
import type {
  AssessmentRow,
  AssessmentCategoryRow,
  AssessmentDimensionRow,
  AssessmentQuestionRow,
  QuestionOptionRow,
  AssessmentAttemptRow,
  AssessmentAnswerRow
} from '@/types/database';

export interface RuntimeQuestion extends AssessmentQuestionRow {
  options: QuestionOptionRow[];
}

export interface RuntimeAssessment {
  assessment: AssessmentRow;
  category: AssessmentCategoryRow | null;
  dimensions: AssessmentDimensionRow[];
  questions: RuntimeQuestion[];
}

export interface AttemptProgress {
  attempt: AssessmentAttemptRow;
  answers: AssessmentAnswerRow[];
  answeredCount: number;
  totalQuestions: number;
}

export class AssessmentRuntimeService extends BaseService {
  private readonly db: D1Database | null;
  private readonly scoringService: ScoringService;

  constructor(db: D1Database | null, scoringService?: ScoringService) {
    super('AssessmentRuntimeService');
    this.db = db;
    this.scoringService = scoringService || new ScoringService(db);
  }

  /**
   * Loads a publicly published assessment by URL slug or direct ID
   */
  public async getPublishedAssessmentBySlug(slugOrId: string): Promise<RuntimeAssessment | null> {
    if (!this.db) return null;

    const normalized = slugOrId.toLowerCase().trim();
    const assessment = await fetchFirst<AssessmentRow>(
      this.db,
      "SELECT * FROM assessments WHERE (slug = ? OR id = ?) AND status = 'published'",
      [normalized, normalized]
    );

    if (!assessment) return null;

    const [category, dimensions, questionsRaw, optionsRaw] = await Promise.all([
      fetchFirst<AssessmentCategoryRow>(
        this.db,
        'SELECT * FROM assessment_categories WHERE id = ?',
        [assessment.category_id]
      ),
      executeQuery<AssessmentDimensionRow>(
        this.db,
        "SELECT * FROM assessment_dimensions WHERE assessment_id = ? AND status = 'active' ORDER BY display_order ASC",
        [assessment.id]
      ),
      executeQuery<AssessmentQuestionRow>(
        this.db,
        "SELECT * FROM assessment_questions WHERE assessment_id = ? AND status = 'active' ORDER BY display_order ASC",
        [assessment.id]
      ),
      executeQuery<QuestionOptionRow>(
        this.db,
        `SELECT o.* FROM question_options o
         INNER JOIN assessment_questions q ON o.question_id = q.id
         WHERE q.assessment_id = ? AND q.status = 'active' AND o.status = 'active'
         ORDER BY o.display_order ASC`,
        [assessment.id]
      )
    ]);

    const standardLikertOptions = [
      { text: 'Strongly Disagree', value: '1', order: 1 },
      { text: 'Disagree', value: '2', order: 2 },
      { text: 'Neutral', value: '3', order: 3 },
      { text: 'Agree', value: '4', order: 4 },
      { text: 'Strongly Agree', value: '5', order: 5 }
    ];

    const questions: RuntimeQuestion[] = questionsRaw.map((q) => {
      let opts = optionsRaw.filter((o) => o.question_id === q.id);
      if (q.question_type === 'likert' && opts.length < 5) {
        opts = standardLikertOptions.map((lo) => ({
          id: `opt_${q.id}_${lo.order}`,
          question_id: q.id,
          option_text: lo.text,
          option_value: lo.value,
          display_order: lo.order,
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      }
      return {
        ...q,
        options: opts
      };
    });

    return {
      assessment,
      category: category || null,
      dimensions,
      questions
    };
  }

  /**
   * Starts a new attempt or resumes an existing in-progress attempt for a user or guest session
   */
  public async startOrResumeAttempt(
    assessmentId: string,
    userId?: string | null,
    guestSessionId?: string | null
  ): Promise<{ attempt: AssessmentAttemptRow; isResumed: boolean }> {
    if (!this.db) throw new Error('Database unavailable');

    // 1. Verify assessment exists and is published
    const assessment = await fetchFirst<AssessmentRow>(
      this.db,
      "SELECT id, slug, status, access_type, settings FROM assessments WHERE id = ? OR slug = ?",
      [assessmentId, assessmentId]
    );

    if (!assessment) throw new NotFoundError('Assessment not found');
    if (assessment.status !== 'published') {
      throw new ValidationError('This assessment is not currently available to the public.');
    }

    const actualAssessmentId = assessment.id;

    // 2. Validate Guest Access Permissions & Dynamic Settings
    if (!userId) {
      const guestSetting = await fetchFirst<{ value: string }>(
        this.db,
        "SELECT value FROM site_settings WHERE key = 'guest_assessments_enabled'"
      );
      if (guestSetting && guestSetting.value === 'false') {
        throw new ForbiddenError('Guest assessment access is currently disabled. Please sign in or create an account.');
      }

      const accessType = assessment.access_type || 'free';
      if (accessType === 'premium') {
        throw new ForbiddenError('This assessment requires a Psychology Calculator Pro subscription.');
      }
      if (accessType === 'registered' || accessType === 'authenticated') {
        throw new ForbiddenError('Please create a free account or sign in to access this assessment.');
      }
    }

    // 3. Check for an existing in_progress attempt to resume
    let existingAttempt: AssessmentAttemptRow | null = null;
    if (userId) {
      existingAttempt = await fetchFirst<AssessmentAttemptRow>(
        this.db,
        "SELECT * FROM assessment_attempts WHERE assessment_id = ? AND user_id = ? AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1",
        [actualAssessmentId, userId]
      );
    } else if (guestSessionId) {
      existingAttempt = await fetchFirst<AssessmentAttemptRow>(
        this.db,
        "SELECT * FROM assessment_attempts WHERE assessment_id = ? AND session_id = ? AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1",
        [actualAssessmentId, guestSessionId]
      );
    }

    if (existingAttempt) {
      return { attempt: existingAttempt, isResumed: true };
    }

    // 4. Create fresh attempt
    const attemptId = crypto.randomUUID();
    const sessionId = guestSessionId || crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO assessment_attempts (
           id, assessment_id, user_id, session_id, status, started_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, 'in_progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(attemptId, actualAssessmentId, userId || null, sessionId)
      .run();

    const created = await fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [attemptId]
    );

    // 5. Emit Analytics Telemetry (Safe non-sensitive metadata only)
    try {
      const eventName = userId ? 'user_assessment_started' : 'guest_assessment_started';
      await this.db
        .prepare(
          `INSERT INTO analytics_events (
             id, user_id, session_id, event_name, entity_type, entity_id, metadata, created_at
           ) VALUES (?, ?, ?, ?, 'assessment', ?, ?, CURRENT_TIMESTAMP)`
        )
        .bind(
          crypto.randomUUID(),
          userId || null,
          sessionId,
          eventName,
          actualAssessmentId,
          JSON.stringify({ slug: assessment.slug, accessType: assessment.access_type })
        )
        .run();
    } catch {
      // Non-blocking telemetry
    }

    return { attempt: created!, isResumed: false };
  }

  /**
   * Retrieves attempt progress along with all recorded answers
   */
  public async getAttemptProgress(
    attemptId: string,
    userId?: string | null,
    guestSessionId?: string | null
  ): Promise<AttemptProgress> {
    if (!this.db) throw new Error('Database unavailable');

    const attempt = await fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [attemptId]
    );

    if (!attempt) throw new NotFoundError('Assessment attempt not found');

    // Ownership assertion
    this.assertAttemptOwnership(attempt, userId, guestSessionId);

    const [answers, totalQuestionsRow] = await Promise.all([
      executeQuery<AssessmentAnswerRow>(
        this.db,
        'SELECT * FROM assessment_answers WHERE attempt_id = ?',
        [attemptId]
      ),
      fetchFirst<{ count: number }>(
        this.db,
        "SELECT COUNT(*) as count FROM assessment_questions WHERE assessment_id = ? AND status = 'active'",
        [attempt.assessment_id]
      )
    ]);

    return {
      attempt,
      answers,
      answeredCount: answers.length,
      totalQuestions: totalQuestionsRow?.count ?? 0
    };
  }

  /**
   * Validates and saves an answer for an active attempt
   */
  public async saveAnswer(
    attemptId: string,
    questionId: string,
    optionId: string,
    userId?: string | null,
    guestSessionId?: string | null
  ): Promise<AssessmentAnswerRow> {
    if (!this.db) throw new Error('Database unavailable');

    const attempt = await fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [attemptId]
    );

    if (!attempt) throw new NotFoundError('Assessment attempt not found');
    if (attempt.status !== 'in_progress') {
      throw new ValidationError('Cannot modify answers for an attempt that is already finalized.');
    }

    // Ownership check
    this.assertAttemptOwnership(attempt, userId, guestSessionId);

    // Anti-Tampering: Verify question belongs to the assessment
    const question = await fetchFirst<AssessmentQuestionRow>(
      this.db,
      "SELECT id, assessment_id FROM assessment_questions WHERE id = ? AND assessment_id = ? AND status = 'active'",
      [questionId, attempt.assessment_id]
    );
    if (!question) {
      throw new ValidationError('Invalid question for this assessment.');
    }

    // Anti-Tampering: Verify option belongs to the question
    const option = await fetchFirst<QuestionOptionRow>(
      this.db,
      "SELECT id, option_value FROM question_options WHERE id = ? AND question_id = ? AND status = 'active'",
      [optionId, questionId]
    );
    if (!option) {
      throw new ValidationError('Invalid response option for this question.');
    }

    // Upsert answer
    const answerId = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO assessment_answers (
           id, attempt_id, question_id, option_id, answer_value, created_at
         ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(attempt_id, question_id) DO UPDATE SET
           option_id = excluded.option_id,
           answer_value = excluded.answer_value,
           created_at = CURRENT_TIMESTAMP`
      )
      .bind(answerId, attemptId, questionId, optionId, option.option_value)
      .run();

    const saved = await fetchFirst<AssessmentAnswerRow>(
      this.db,
      'SELECT * FROM assessment_answers WHERE attempt_id = ? AND question_id = ?',
      [attemptId, questionId]
    );

    return saved!;
  }

  /**
   * Finalizes the attempt and calculates deterministic scores
   */
  public async completeAttempt(
    attemptId: string,
    userId?: string | null,
    guestSessionId?: string | null
  ): Promise<ScoringCalculationResult> {
    if (!this.db) throw new Error('Database unavailable');

    const attempt = await fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [attemptId]
    );

    if (!attempt) throw new NotFoundError('Assessment attempt not found');

    this.assertAttemptOwnership(attempt, userId, guestSessionId);

    // Execute deterministic scoring
    const scores = await this.scoringService.calculateAttemptScores(attemptId);

    // Emit Analytics Telemetry for completion
    try {
      const eventName = userId ? 'user_assessment_completed' : 'guest_assessment_completed';
      await this.db
        .prepare(
          `INSERT INTO analytics_events (
             id, user_id, session_id, event_name, entity_type, entity_id, metadata, created_at
           ) VALUES (?, ?, ?, ?, 'attempt', ?, ?, CURRENT_TIMESTAMP)`
        )
        .bind(
          crypto.randomUUID(),
          userId || null,
          attempt.session_id,
          eventName,
          attempt.id,
          JSON.stringify({
            assessmentId: attempt.assessment_id,
            totalRawScore: scores.totalRawScore,
            totalNormalizedScore: scores.totalNormalizedScore,
            primaryResultType: scores.primaryResultType?.name || null
          })
        )
        .run();
    } catch {
      // Non-blocking telemetry
    }

    return scores;
  }

  /**
   * Security guard asserting that attempt belongs to authenticated user or guest session
   */
  private assertAttemptOwnership(
    attempt: AssessmentAttemptRow,
    userId?: string | null,
    guestSessionId?: string | null
  ): void {
    if (userId && attempt.user_id === userId) {
      return;
    }
    if (guestSessionId && attempt.session_id === guestSessionId) {
      return;
    }
    if (!attempt.user_id && !attempt.session_id) {
      return; // Open guest attempt
    }
    throw new ForbiddenError('Unauthorized: Access denied to this assessment attempt.');
  }
}
