import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';
import { ResultService } from './result.service';
import type {
  ResultShareRow,
  SanitizedPublicShareData,
  AssessmentAttemptRow,
  AssessmentListItem,
  ResultSnapshotData
} from '@/types/database';

export class ShareService extends BaseService {
  private readonly db: D1Database | null;
  private readonly resultService: ResultService;

  constructor(db: D1Database | null, resultService?: ResultService) {
    super('ShareService');
    this.db = db;
    this.resultService = resultService || new ResultService(db);
  }

  /**
   * Generates a cryptographically random, URL-safe, non-sequential share token
   */
  private generateSecureToken(length = 10): string {
    const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars[randomBytes[i] % chars.length];
    }
    return token;
  }

  /**
   * Creates or retrieves an active public share record with sanitized projection data
   */
  public async createOrGetPublicShare(
    attemptId: string,
    userId?: string | null,
    guestSessionId?: string | null,
    language = 'en'
  ): Promise<{ shareToken: string; shareUrl: string; data: SanitizedPublicShareData }> {
    if (!this.db) throw new Error('Database unavailable');

    // 1. Verify Attempt Ownership
    const attempt = await fetchFirst<AssessmentAttemptRow>(
      this.db,
      'SELECT * FROM assessment_attempts WHERE id = ?',
      [attemptId]
    );
    if (!attempt) throw new NotFoundError('Assessment attempt not found');
    this.assertAttemptOwnership(attempt, userId, guestSessionId);

    // 2. Fetch or create verified result snapshot
    const snapshot = await this.resultService.createOrGetSnapshot(attemptId);

    // 3. Check for existing active share
    const existingShare = await fetchFirst<ResultShareRow>(
      this.db,
      'SELECT * FROM result_shares WHERE attempt_id = ? AND is_active = 1',
      [attemptId]
    );

    if (existingShare) {
      const parsed = JSON.parse(existingShare.sanitized_data) as SanitizedPublicShareData;
      return {
        shareToken: existingShare.share_token,
        shareUrl: `/share/${existingShare.share_token}`,
        data: parsed
      };
    }

    // 4. Build sanitized public projection (Strictly ZERO private fields)
    const scorePercent = Math.min(100, Math.max(0, Math.round(snapshot.totalNormalizedScore)));
    const levelLabel =
      snapshot.primaryResultType?.name ||
      (scorePercent >= 70 ? 'High Level' : scorePercent >= 35 ? 'Moderate Level' : 'Low Level');

    const overviewContent = snapshot.primaryResultType?.contents?.find((c) => c.section_type === 'overview');
    const resultSummary = overviewContent?.content
      ? overviewContent.content.slice(0, 280).trim() + (overviewContent.content.length > 280 ? '...' : '')
      : `Scored ${scorePercent}% on ${snapshot.assessmentName}, identifying as ${levelLabel}.`;

    const dimensions = (snapshot.dimensionScores || []).slice(0, 5).map((dim) => ({
      name: dim.name,
      scorePercent: Math.min(100, Math.max(0, Math.round(dim.normalizedScore || dim.percentage || 0))),
      levelLabel: dim.levelLabel || (dim.normalizedScore >= 70 ? 'High' : dim.normalizedScore >= 35 ? 'Moderate' : 'Low')
    }));

    const shareToken = this.generateSecureToken(10);
    const shareId = crypto.randomUUID();

    const sanitizedData: SanitizedPublicShareData = {
      assessmentName: snapshot.assessmentName,
      assessmentSlug: snapshot.assessmentSlug,
      resultTitle: snapshot.primaryResultType?.name || 'Verified Psychometric Profile',
      resultSummary,
      totalScore: snapshot.totalRawScore,
      scorePercent,
      levelLabel,
      language,
      dimensions,
      shareToken,
      createdAt: new Date().toISOString()
    };

    // 5. Persist sanitized share record
    await this.db
      .prepare(
        `INSERT INTO result_shares (
          id, share_token, attempt_id, assessment_id, assessment_slug,
          user_id, language, sanitized_data, is_active, view_count, share_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(
        shareId,
        shareToken,
        attemptId,
        snapshot.assessmentId,
        snapshot.assessmentSlug,
        userId || null,
        language,
        JSON.stringify(sanitizedData)
      )
      .run();

    // 6. Update snapshot table is_public flag for backward compatibility
    await this.db
      .prepare(
        'UPDATE result_snapshots SET share_token = ?, is_public = 1, updated_at = CURRENT_TIMESTAMP WHERE attempt_id = ?'
      )
      .bind(shareToken, attemptId)
      .run();

    return {
      shareToken,
      shareUrl: `/share/${shareToken}`,
      data: sanitizedData
    };
  }

  /**
   * Retrieves public sanitized share record by token
   */
  public async getPublicShare(
    shareToken: string
  ): Promise<{
    share: SanitizedPublicShareData;
    assessmentId: string;
    assessmentSlug: string;
    relatedAssessments: AssessmentListItem[];
  }> {
    if (!this.db) throw new Error('Database unavailable');

    const cleanToken = shareToken.trim();
    const shareRow = await fetchFirst<ResultShareRow>(
      this.db,
      'SELECT * FROM result_shares WHERE share_token = ? AND is_active = 1',
      [cleanToken]
    );

    if (!shareRow) {
      throw new NotFoundError('This shared assessment result link is invalid, expired, or has been revoked.');
    }

    // Check optional expiration
    if (shareRow.expires_at && new Date(shareRow.expires_at) < new Date()) {
      throw new NotFoundError('This shared assessment result link has expired.');
    }

    // Increment view count asynchronously
    try {
      await this.db
        .prepare('UPDATE result_shares SET view_count = view_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(shareRow.id)
        .run();
    } catch {
      // Non-blocking counter
    }

    const shareData = JSON.parse(shareRow.sanitized_data) as SanitizedPublicShareData;
    const relatedAssessments = await this.resultService.getRelatedAssessments(
      shareRow.assessment_id,
      shareRow.assessment_id,
      3
    );

    return {
      share: shareData,
      assessmentId: shareRow.assessment_id,
      assessmentSlug: shareRow.assessment_slug,
      relatedAssessments
    };
  }

  /**
   * Revokes and deactivates a shared result
   */
  public async revokePublicShare(
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
      .prepare('UPDATE result_shares SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE attempt_id = ?')
      .bind(attemptId)
      .run();

    await this.db
      .prepare('UPDATE result_snapshots SET is_public = 0, share_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE attempt_id = ?')
      .bind(attemptId)
      .run();
  }

  /**
   * Tracks viral growth and sharing events
   */
  public async trackShareEvent(
    shareToken: string,
    eventName: string,
    channel?: string | null,
    sessionId?: string | null
  ): Promise<void> {
    if (!this.db) return;

    try {
      if (channel) {
        await this.db
          .prepare('UPDATE result_shares SET share_count = share_count + 1 WHERE share_token = ?')
          .bind(shareToken)
          .run();
      }

      await this.db
        .prepare(
          `INSERT INTO analytics_events (
            id, session_id, event_name, entity_type, entity_id, metadata, created_at
          ) VALUES (?, ?, ?, 'share', ?, ?, CURRENT_TIMESTAMP)`
        )
        .bind(
          crypto.randomUUID(),
          sessionId || 'anonymous_share',
          eventName,
          shareToken,
          JSON.stringify({ channel: channel || 'direct', timestamp: new Date().toISOString() })
        )
        .run();
    } catch {
      // Non-blocking analytics
    }
  }

  /**
   * Generates a 1200x630 branded SVG share card
   */
  public generateShareCardSvg(data: SanitizedPublicShareData): string {
    const escapeXml = (unsafe: string) =>
      (unsafe || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const assessmentName = escapeXml(data.assessmentName || 'PSYCHOLOGICAL ASSESSMENT');
    const resultTitle = escapeXml(data.resultTitle || 'Psychometric Profile');
    const levelLabel = escapeXml(data.levelLabel || 'Verified');
    const scorePercent = Math.min(100, Math.max(0, data.scorePercent || 0));

    // Render up to 4 dimension bars
    const dimensions = (data.dimensions || []).slice(0, 4);
    const dimRows = dimensions
      .map((dim, idx) => {
        const y = 320 + idx * 55;
        const name = escapeXml(dim.name);
        const percent = Math.min(100, Math.max(0, dim.scorePercent));
        const barWidth = Math.round((percent / 100) * 440);
        const label = escapeXml(dim.levelLabel || `${percent}%`);

        return `
        <g transform="translate(60, ${y})">
          <text x="0" y="16" fill="#94a3b8" font-size="14" font-weight="600" font-family="system-ui, -apple-system, sans-serif">${name}</text>
          <text x="440" y="16" fill="#5eead4" font-size="14" font-weight="700" text-anchor="end" font-family="monospace">${label}</text>
          <rect x="0" y="26" width="440" height="8" rx="4" fill="#1e293b" />
          <rect x="0" y="26" width="${barWidth}" height="8" rx="4" fill="url(#barGradient)" />
        </g>`;
      })
      .join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#042f2e" />
    </linearGradient>
    <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#2dd4bf" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="60" result="blur" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="1200" height="630" fill="url(#bgGradient)" />
  <circle cx="1100" cy="100" r="250" fill="#0d9488" opacity="0.15" filter="url(#glow)" />
  <circle cx="100" cy="550" r="200" fill="#3b82f6" opacity="0.1" filter="url(#glow)" />

  <!-- Outer Border Frame -->
  <rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="#1e293b" stroke-width="2" />

  <!-- Brand Header -->
  <g transform="translate(60, 70)">
    <rect x="0" y="0" width="36" height="36" rx="10" fill="#0d9488" />
    <text x="18" y="24" fill="#ffffff" font-size="18" font-weight="900" text-anchor="middle" font-family="system-ui, sans-serif">Ψ</text>
    <text x="48" y="24" fill="#f8fafc" font-size="20" font-weight="800" letter-spacing="-0.5" font-family="system-ui, sans-serif">Psychology<tspan fill="#2dd4bf">Calculator</tspan>.com</text>
    <rect x="940" y="4" width="140" height="28" rx="14" fill="#134e4a" stroke="#2dd4bf" stroke-opacity="0.4" />
    <text x="1010" y="22" fill="#5eead4" font-size="12" font-weight="800" text-anchor="middle" letter-spacing="1" font-family="monospace">VERIFIED RESULT</text>
  </g>

  <!-- Assessment Title & Profile -->
  <g transform="translate(60, 160)">
    <text x="0" y="0" fill="#5eead4" font-size="14" font-weight="800" letter-spacing="2" font-family="monospace" text-transform="uppercase">${assessmentName}</text>
    <text x="0" y="52" fill="#ffffff" font-size="44" font-weight="900" letter-spacing="-1" font-family="system-ui, sans-serif">${resultTitle}</text>
    <rect x="0" y="74" width="160" height="32" rx="16" fill="#1e293b" stroke="#334155" />
    <text x="80" y="95" fill="#e2e8f0" font-size="13" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">★ ${levelLabel}</text>
  </g>

  <!-- Dimension Bars -->
  ${dimRows}

  <!-- Right Visual Score Gauge -->
  <g transform="translate(860, 230)">
    <circle cx="130" cy="130" r="110" fill="#090d16" stroke="#1e293b" stroke-width="16" />
    <circle cx="130" cy="130" r="110" fill="none" stroke="url(#meterGradient)" stroke-width="16" stroke-linecap="round"
      stroke-dasharray="691.15" stroke-dashoffset="${691.15 * (1 - scorePercent / 100)}" transform="rotate(-90 130 130)" />
    <text x="130" y="125" fill="#ffffff" font-size="54" font-weight="900" text-anchor="middle" font-family="monospace">${scorePercent}%</text>
    <text x="130" y="160" fill="#94a3b8" font-size="13" font-weight="700" text-anchor="middle" letter-spacing="1" font-family="system-ui, sans-serif">OVERALL PROFILE</text>
  </g>

  <!-- Footer CTA Bar -->
  <g transform="translate(60, 560)">
    <line x1="0" y1="0" x2="1080" y2="0" stroke="#1e293b" stroke-width="1" />
    <text x="0" y="28" fill="#64748b" font-size="13" font-weight="500" font-family="system-ui, sans-serif">Scientific psychometric evaluation and dimension breakdown</text>
    <text x="1080" y="28" fill="#2dd4bf" font-size="14" font-weight="800" text-anchor="end" font-family="system-ui, sans-serif">Discover your profile →</text>
  </g>
</svg>`;
  }

  private assertAttemptOwnership(
    attempt: AssessmentAttemptRow,
    userId?: string | null,
    guestSessionId?: string | null
  ): void {
    if (userId && attempt.user_id === userId) return;
    if (guestSessionId && attempt.session_id === guestSessionId) return;
    if (!attempt.user_id && !attempt.session_id) return;
    throw new ForbiddenError('Unauthorized: You do not have permission to share this assessment result.');
  }
}
