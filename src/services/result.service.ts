import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';
import { ScoringService } from './scoring.service';
import type {
  AssessmentAttemptRow,
  AssessmentRow,
  ResultTypeRow,
  ResultContentRow,
  ResultSnapshotRow,
  ResultSnapshotData,
  SnapshotResultContent,
  FaqRow,
  AssessmentListItem
} from '@/types/database';

export class ResultService extends BaseService {
  private readonly db: D1Database | null;
  private readonly scoringService: ScoringService;

  constructor(db: D1Database | null, scoringService?: ScoringService) {
    super('ResultService');
    this.db = db;
    this.scoringService = scoringService || new ScoringService(db);
  }

  /**
   * Builds and persists an immutable result snapshot capturing all scores and content at completion time
   */
  public async createOrGetSnapshot(attemptId: string): Promise<ResultSnapshotData> {
    if (!this.db) throw new Error('Database unavailable');

    // 1. Check if snapshot already exists
    const existingSnapshot = await fetchFirst<ResultSnapshotRow>(
      this.db,
      'SELECT * FROM result_snapshots WHERE attempt_id = ?',
      [attemptId]
    );

    if (existingSnapshot) {
      return JSON.parse(existingSnapshot.snapshot_data) as ResultSnapshotData;
    }

    // 2. Load Attempt
    const attempt = await fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [attemptId]
    );
    if (!attempt) throw new NotFoundError('Assessment attempt not found');

    // 3. Load Assessment Metadata
    const assessment = await fetchFirst<AssessmentRow>(
      this.db,
      'SELECT * FROM assessments WHERE id = ?',
      [attempt.assessment_id]
    );
    if (!assessment) throw new NotFoundError('Assessment metadata not found');

    // 4. Calculate / Fetch Scores
    const scoringResult = await this.scoringService.calculateAttemptScores(attemptId);

    // 5. Load Content Sections for Primary Result Type
    let primaryResultWithContents: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      contents: SnapshotResultContent[];
    } | null = null;

    if (scoringResult.primaryResultType) {
      const contents = await executeQuery<ResultContentRow>(
        this.db,
        'SELECT * FROM result_contents WHERE result_type_id = ? ORDER BY display_order ASC',
        [scoringResult.primaryResultType.id]
      );

      primaryResultWithContents = {
        id: scoringResult.primaryResultType.id,
        name: scoringResult.primaryResultType.name,
        slug: scoringResult.primaryResultType.slug,
        description: scoringResult.primaryResultType.description || null,
        contents: contents.map((c) => ({
          section_type: c.section_type,
          title: c.title,
          content: c.content,
          display_order: c.display_order
        }))
      };
    }

    // 6. Calculate Duration
    const startedAt = new Date(attempt.started_at).getTime();
    const completedAt = attempt.completed_at ? new Date(attempt.completed_at).getTime() : Date.now();
    const durationSeconds = Math.max(1, Math.round((completedAt - startedAt) / 1000));

    // 7. Assemble Snapshot Data Structure
    const snapshotData: ResultSnapshotData = {
      attemptId: attempt.id,
      assessmentId: assessment.id,
      assessmentName: assessment.name,
      assessmentSlug: assessment.slug,
      assessmentVersion: assessment.version,
      disclaimer: assessment.disclaimer || null,
      completedAt: attempt.completed_at || new Date().toISOString(),
      durationSeconds,
      totalRawScore: scoringResult.totalRawScore,
      totalMaxScore: scoringResult.totalMaxScore,
      totalNormalizedScore: scoringResult.totalNormalizedScore,
      primaryResultType: primaryResultWithContents,
      dimensionScores: scoringResult.dimensionScores.map((d) => ({
        dimensionId: d.dimensionId,
        dimensionName: d.dimensionName,
        dimensionSlug: d.dimensionSlug,
        rawScore: d.rawScore,
        maxScore: d.maxScore,
        normalizedScore: d.normalizedScore,
        resultTypeId: d.resultTypeId,
        resultTypeName: d.resultTypeName
      }))
    };

    // 8. Persist Immutable Snapshot in D1
    const snapshotId = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO result_snapshots (
           id, attempt_id, assessment_id, assessment_version, primary_result_type_id,
           snapshot_data, is_public, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(
        snapshotId,
        attempt.id,
        assessment.id,
        assessment.version,
        scoringResult.primaryResultType?.id || null,
        JSON.stringify(snapshotData)
      )
      .run();

    return snapshotData;
  }

  /**
   * Retrieves verified result data ensuring strict authorization (authenticated owner, guest taker, or signed share token)
   */
  public async getResult(
    attemptId: string,
    userId?: string | null,
    guestSessionId?: string | null,
    shareToken?: string | null
  ): Promise<{ snapshot: ResultSnapshotData; isSharedView: boolean; shareToken: string | null }> {
    if (!this.db) throw new Error('Database unavailable');

    // 1. If shareToken is provided, verify public share access
    if (shareToken && shareToken.trim().length > 0) {
      const sharedSnapshot = await fetchFirst<ResultSnapshotRow>(
        this.db,
        'SELECT * FROM result_snapshots WHERE attempt_id = ? AND share_token = ? AND is_public = 1',
        [attemptId, shareToken.trim()]
      );

      if (!sharedSnapshot) {
        throw new ForbiddenError('This shared assessment result link is invalid or has been revoked.');
      }

      return {
        snapshot: JSON.parse(sharedSnapshot.snapshot_data) as ResultSnapshotData,
        isSharedView: true,
        shareToken: sharedSnapshot.share_token
      };
    }

    // 2. Otherwise verify owner session
    const attempt = await fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [attemptId]
    );

    if (!attempt) throw new NotFoundError('Assessment result not found');

    this.assertAttemptOwnership(attempt, userId, guestSessionId);

    const snapshot = await this.createOrGetSnapshot(attemptId);
    const existingSnapshotRow = await fetchFirst<ResultSnapshotRow>(
      this.db,
      'SELECT share_token, is_public FROM result_snapshots WHERE attempt_id = ?',
      [attemptId]
    );

    return {
      snapshot,
      isSharedView: false,
      shareToken: existingSnapshotRow?.is_public === 1 ? existingSnapshotRow.share_token : null
    };
  }

  /**
   * Generates or activates a secure share token for public sharing
   */
  public async generateShareToken(
    attemptId: string,
    userId?: string | null,
    guestSessionId?: string | null
  ): Promise<{ shareToken: string; shareUrl: string }> {
    if (!this.db) throw new Error('Database unavailable');

    const attempt = await fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [attemptId]
    );

    if (!attempt) throw new NotFoundError('Assessment attempt not found');
    this.assertAttemptOwnership(attempt, userId, guestSessionId);

    // Ensure snapshot is created
    await this.createOrGetSnapshot(attemptId);

    const existing = await fetchFirst<ResultSnapshotRow>(
      this.db,
      'SELECT share_token FROM result_snapshots WHERE attempt_id = ?',
      [attemptId]
    );

    const token = existing?.share_token || crypto.randomUUID().replace(/-/g, '');

    await this.db
      .prepare(
        'UPDATE result_snapshots SET share_token = ?, is_public = 1, updated_at = CURRENT_TIMESTAMP WHERE attempt_id = ?'
      )
      .bind(token, attemptId)
      .run();

    return {
      shareToken: token,
      shareUrl: `/results/${attemptId}?token=${token}`
    };
  }

  /**
   * Revokes a share token making the result private again
   */
  public async revokeShareToken(
    attemptId: string,
    userId?: string | null,
    guestSessionId?: string | null
  ): Promise<void> {
    if (!this.db) throw new Error('Database unavailable');

    const attempt = await fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [attemptId]
    );

    if (!attempt) throw new NotFoundError('Assessment attempt not found');
    this.assertAttemptOwnership(attempt, userId, guestSessionId);

    await this.db
      .prepare(
        'UPDATE result_snapshots SET is_public = 0, share_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE attempt_id = ?'
      )
      .bind(attemptId)
      .run();
  }

  /**
   * Retrieves related published assessments in the same category
   */
  public async getRelatedAssessments(
    categoryId: string,
    currentAssessmentId: string,
    limit = 3
  ): Promise<AssessmentListItem[]> {
    if (!this.db) return [];

    return executeQuery<AssessmentListItem>(
      this.db,
      `SELECT a.*, c.name as category_name
       FROM assessments a
       LEFT JOIN assessment_categories c ON a.category_id = c.id
       WHERE a.status = 'published' AND a.id != ? AND a.category_id = ?
       ORDER BY a.featured DESC, a.display_order ASC
       LIMIT ?`,
      [currentAssessmentId, categoryId, limit]
    );
  }

  /**
   * Retrieves FAQs related to the assessment or general results
   */
  public async getAssessmentFaqs(assessmentId: string): Promise<FaqRow[]> {
    if (!this.db) return [];

    return executeQuery<FaqRow>(
      this.db,
      `SELECT * FROM faqs
       WHERE status = 'active' AND (
         (entity_type = 'assessment' AND entity_id = ?)
         OR (entity_type = 'global' AND category IN ('general', 'scoring', 'results'))
       )
       ORDER BY display_order ASC
       LIMIT 5`,
      [assessmentId]
    );
  }

  /**
   * Security assertion asserting attempt belongs to current user or guest session
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
    throw new ForbiddenError('Unauthorized: You do not have access to view this assessment result.');
  }
}
