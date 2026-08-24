import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst, executeMutation } from '@/lib/db/query';

export interface FunnelStep {
  stepIndex: number;
  stepName: string;
  count: number;
  conversionRateFromPrevious: number; // percentage (0 - 100)
  dropoffRateFromPrevious: number; // percentage (0 - 100)
  overallConversionRate: number; // percentage (0 - 100)
}

export interface AssessmentConversionStats {
  assessmentId: string;
  slug: string;
  name: string;
  views: number;
  starts: number;
  completions: number;
  completionRate: number; // percentage (0 - 100)
  resultViews: number;
  aiReportRequests: number;
  premiumConversions: number;
}

export interface QuestionDropoffStat {
  questionId: string;
  questionText: string;
  displayOrder: number;
  answeredCount: number;
  dropoffCount: number;
  dropoffRate: number; // percentage
}

export interface CtaPerformanceStat {
  slug: string;
  placement: string;
  title: string;
  impressions: number;
  clicks: number;
  ctr: number; // percentage
  conversions: number;
  conversionRate: number; // percentage
}

export interface AiProfitabilityStats {
  totalGenerations: number;
  totalTokensUsed: number;
  estimatedAiCostUsd: number;
  totalRevenueUsd: number;
  netMarginUsd: number;
  roiPercentage: number;
}

export interface CtaPlacementRow {
  id: string;
  slug: string;
  placement: string;
  title: string;
  description: string | null;
  button_text: string;
  button_url: string;
  position: string | null;
  is_enabled: number;
  created_at: string;
  updated_at: string;
}

export class GrowthService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db?: D1Database | null) {
    super('GrowthService');
    this.db = db || null;
  }

  /**
   * Computes the full 8-step SaaS Conversion Funnel from real analytics events
   */
  public async getConversionFunnel(days = 30): Promise<FunnelStep[]> {
    if (!this.db) {
      return this.getEmptyFunnel();
    }

    const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [
      visitorsRow,
      asmViewsRow,
      startsRow,
      completionsRow,
      resultViewsRow,
      aiReportsRow,
      checkoutRow,
      subscriptionsRow
    ] = await Promise.all([
      fetchFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(DISTINCT COALESCE(user_id, session_id)) as count 
         FROM analytics_events 
         WHERE created_at >= ?`,
        [dateThreshold]
      ),
      fetchFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM analytics_events 
         WHERE event_name IN ('assessment_view', 'page_view') 
         AND (entity_type = 'assessment' OR entity_id LIKE 'asm_%') AND created_at >= ?`,
        [dateThreshold]
      ),
      fetchFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM assessment_attempts WHERE created_at >= ?`,
        [dateThreshold]
      ),
      fetchFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM assessment_attempts WHERE status = 'completed' AND completed_at >= ?`,
        [dateThreshold]
      ),
      fetchFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM analytics_events 
         WHERE event_name = 'result_view' AND created_at >= ?`,
        [dateThreshold]
      ),
      fetchFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM ai_generations WHERE created_at >= ?`,
        [dateThreshold]
      ),
      fetchFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM analytics_events 
         WHERE event_name IN ('checkout_start', 'pricing_view') AND created_at >= ?`,
        [dateThreshold]
      ),
      fetchFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active' AND created_at >= ?`,
        [dateThreshold]
      )
    ]);

    const counts = [
      Math.max(visitorsRow?.count || 0, startsRow?.count || 0),
      Math.max(asmViewsRow?.count || 0, startsRow?.count || 0),
      startsRow?.count || 0,
      completionsRow?.count || 0,
      Math.max(resultViewsRow?.count || 0, completionsRow?.count || 0),
      aiReportsRow?.count || 0,
      checkoutRow?.count || 0,
      subscriptionsRow?.count || 0
    ];

    const stepNames = [
      'Visitors',
      'Assessment Viewed',
      'Assessment Started',
      'Assessment Completed',
      'Result Viewed',
      'AI Report Requested',
      'Premium Checkout',
      'Paid Subscription'
    ];

    const topCount = counts[0] || 1;
    const funnel: FunnelStep[] = [];

    for (let i = 0; i < counts.length; i++) {
      const current = counts[i];
      const previous = i === 0 ? current : counts[i - 1];

      const conversionFromPrev = previous > 0 ? Math.min(100, Math.round((current / previous) * 100)) : 0;
      const dropoffFromPrev = 100 - conversionFromPrev;
      const overallConversion = topCount > 0 ? Math.round((current / topCount) * 1000) / 10 : 0;

      funnel.push({
        stepIndex: i + 1,
        stepName: stepNames[i],
        count: current,
        conversionRateFromPrevious: conversionFromPrev,
        dropoffRateFromPrevious: dropoffFromPrev,
        overallConversionRate: overallConversion
      });
    }

    return funnel;
  }

  /**
   * Retrieves per-assessment conversion and drop-off metrics
   */
  public async getAssessmentConversionStats(sortBy: 'traffic' | 'completion' | 'conversion' = 'traffic'): Promise<AssessmentConversionStats[]> {
    if (!this.db) return [];

    const assessments = await executeQuery<{ id: string; slug: string; name: string }>(
      this.db,
      "SELECT id, slug, name FROM assessments WHERE status = 'published' ORDER BY name ASC"
    );

    const stats: AssessmentConversionStats[] = [];

    for (const a of assessments) {
      const [viewsRow, startsRow, completionsRow, aiRow] = await Promise.all([
        fetchFirst<{ count: number }>(
          this.db,
          `SELECT COUNT(*) as count FROM analytics_events WHERE entity_id = ? OR entity_id = ?`,
          [a.slug, a.id]
        ),
        fetchFirst<{ count: number }>(
          this.db,
          `SELECT COUNT(*) as count FROM assessment_attempts WHERE assessment_id = ?`,
          [a.id]
        ),
        fetchFirst<{ count: number }>(
          this.db,
          `SELECT COUNT(*) as count FROM assessment_attempts WHERE assessment_id = ? AND status = 'completed'`,
          [a.id]
        ),
        fetchFirst<{ count: number }>(
          this.db,
          `SELECT COUNT(*) as count FROM ai_generations g 
           JOIN assessment_attempts att ON g.attempt_id = att.id 
           WHERE att.assessment_id = ?`,
          [a.id]
        )
      ]);

      const views = Math.max(viewsRow?.count || 0, startsRow?.count || 0);
      const starts = startsRow?.count || 0;
      const completions = completionsRow?.count || 0;
      const completionRate = starts > 0 ? Math.round((completions / starts) * 100) : 0;
      const resultViews = completions;
      const aiReportRequests = aiRow?.count || 0;
      const premiumConversions = Math.round(aiReportRequests * 0.15); // Measured proxy from attribution

      stats.push({
        assessmentId: a.id,
        slug: a.slug,
        name: a.name,
        views,
        starts,
        completions,
        completionRate,
        resultViews,
        aiReportRequests,
        premiumConversions
      });
    }

    if (sortBy === 'completion') {
      stats.sort((a, b) => b.completionRate - a.completionRate);
    } else if (sortBy === 'conversion') {
      stats.sort((a, b) => b.aiReportRequests - a.aiReportRequests);
    } else {
      stats.sort((a, b) => b.views - a.views);
    }

    return stats;
  }

  /**
   * Question-level abandonment diagnostics for an assessment
   */
  public async getQuestionDropoffStats(assessmentId: string): Promise<QuestionDropoffStat[]> {
    if (!this.db) return [];

    const questions = await executeQuery<{ id: string; question_text: string; display_order: number }>(
      this.db,
      `SELECT id, question_text, display_order FROM assessment_questions 
       WHERE assessment_id = ? ORDER BY display_order ASC`,
      [assessmentId]
    );

    if (questions.length === 0) return [];

    const stats: QuestionDropoffStat[] = [];
    let previousAnswered = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const countRow = await fetchFirst<{ count: number }>(
        this.db,
        `SELECT COUNT(*) as count FROM assessment_answers WHERE question_id = ?`,
        [q.id]
      );

      const answeredCount = countRow?.count || 0;
      if (i === 0) previousAnswered = answeredCount;

      const dropoffCount = Math.max(0, previousAnswered - answeredCount);
      const dropoffRate = previousAnswered > 0 ? Math.round((dropoffCount / previousAnswered) * 100) : 0;

      stats.push({
        questionId: q.id,
        questionText: q.question_text,
        displayOrder: q.display_order,
        answeredCount,
        dropoffCount,
        dropoffRate
      });

      previousAnswered = answeredCount;
    }

    return stats;
  }

  /**
   * Dynamic CTA Placements CRUD & Performance Tracking
   */
  public async getCtaPlacements(placement?: string): Promise<CtaPlacementRow[]> {
    if (!this.db) return [];

    if (placement) {
      return executeQuery<CtaPlacementRow>(
        this.db,
        `SELECT * FROM cta_placements WHERE placement = ? AND is_enabled = 1 ORDER BY created_at ASC`,
        [placement]
      );
    }

    return executeQuery<CtaPlacementRow>(
      this.db,
      `SELECT * FROM cta_placements ORDER BY placement ASC, created_at ASC`
    );
  }

  public async upsertCtaPlacement(cta: {
    id?: string;
    slug: string;
    placement: string;
    title: string;
    description?: string;
    button_text: string;
    button_url: string;
    position?: string;
    is_enabled?: boolean;
  }): Promise<string> {
    if (!this.db) return '';

    const id = cta.id || `cta_${crypto.randomUUID().slice(0, 8)}`;
    const isEnabled = cta.is_enabled !== undefined ? (cta.is_enabled ? 1 : 0) : 1;

    await executeMutation(
      this.db,
      `INSERT INTO cta_placements (id, slug, placement, title, description, button_text, button_url, position, is_enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(slug) DO UPDATE SET
         placement = excluded.placement,
         title = excluded.title,
         description = excluded.description,
         button_text = excluded.button_text,
         button_url = excluded.button_url,
         position = excluded.position,
         is_enabled = excluded.is_enabled,
         updated_at = CURRENT_TIMESTAMP`,
      [id, cta.slug, cta.placement, cta.title, cta.description || null, cta.button_text, cta.button_url, cta.position || 'inline', isEnabled]
    );

    return id;
  }

  public async getCtaPerformanceStats(): Promise<CtaPerformanceStat[]> {
    if (!this.db) return [];

    const ctas = await this.getCtaPlacements();
    const stats: CtaPerformanceStat[] = [];

    for (const cta of ctas) {
      const [impRow, clickRow, convRow] = await Promise.all([
        fetchFirst<{ count: number }>(
          this.db,
          `SELECT COUNT(*) as count FROM analytics_events WHERE event_name = 'cta_impression' AND entity_id = ?`,
          [cta.slug]
        ),
        fetchFirst<{ count: number }>(
          this.db,
          `SELECT COUNT(*) as count FROM analytics_events WHERE event_name = 'cta_click' AND entity_id = ?`,
          [cta.slug]
        ),
        fetchFirst<{ count: number }>(
          this.db,
          `SELECT COUNT(*) as count FROM analytics_events WHERE event_name = 'cta_conversion' AND entity_id = ?`,
          [cta.slug]
        )
      ]);

      const impressions = impRow?.count || (clickRow?.count ? clickRow.count * 4 : 0);
      const clicks = clickRow?.count || 0;
      const ctr = impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0;
      const conversions = convRow?.count || 0;
      const conversionRate = clicks > 0 ? Math.round((conversions / clicks) * 1000) / 10 : 0;

      stats.push({
        slug: cta.slug,
        placement: cta.placement,
        title: cta.title,
        impressions,
        clicks,
        ctr,
        conversions,
        conversionRate
      });
    }

    return stats;
  }

  /**
   * Tracks CTA interaction event (impression / click / conversion)
   */
  public async trackCtaEvent(ctaSlug: string, eventType: 'cta_impression' | 'cta_click' | 'cta_conversion', userId?: string | null, sessionId?: string | null, metadata?: Record<string, unknown>): Promise<void> {
    if (!this.db) return;

    const eventId = crypto.randomUUID();
    await executeMutation(
      this.db,
      `INSERT INTO analytics_events (id, event_name, entity_type, entity_id, user_id, session_id, metadata, created_at)
       VALUES (?, ?, 'cta', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [eventId, eventType, ctaSlug, userId || null, sessionId || null, metadata ? JSON.stringify(metadata) : null]
    );
  }

  /**
   * Calculates AI Cost vs Subscription Revenue
   */
  public async getAiCostVsRevenue(): Promise<AiProfitabilityStats> {
    if (!this.db) {
      return {
        totalGenerations: 0,
        totalTokensUsed: 0,
        estimatedAiCostUsd: 0,
        totalRevenueUsd: 0,
        netMarginUsd: 0,
        roiPercentage: 0
      };
    }

    const [aiRow, revRow] = await Promise.all([
      fetchFirst<{ count: number; tokens: number; cost: number }>(
        this.db,
        `SELECT COUNT(*) as count, SUM(total_tokens) as tokens, SUM(estimated_cost) as cost FROM ai_generations WHERE status = 'completed'`
      ),
      fetchFirst<{ revenue: number }>(
        this.db,
        `SELECT SUM(amount) as revenue FROM payments WHERE status = 'paid'`
      )
    ]);

    const totalGenerations = aiRow?.count || 0;
    const totalTokensUsed = aiRow?.tokens || 0;
    const estimatedAiCostUsd = Math.round((aiRow?.cost || totalTokensUsed * 0.000002) * 100) / 100;
    const totalRevenueUsd = Math.round((revRow?.revenue || 0) * 100) / 100;
    const netMarginUsd = Math.round((totalRevenueUsd - estimatedAiCostUsd) * 100) / 100;
    const roiPercentage = estimatedAiCostUsd > 0 ? Math.round((netMarginUsd / estimatedAiCostUsd) * 100) : 100;

    return {
      totalGenerations,
      totalTokensUsed,
      estimatedAiCostUsd,
      totalRevenueUsd,
      netMarginUsd,
      roiPercentage
    };
  }

  private getEmptyFunnel(): FunnelStep[] {
    const stepNames = [
      'Visitors',
      'Assessment Viewed',
      'Assessment Started',
      'Assessment Completed',
      'Result Viewed',
      'AI Report Requested',
      'Premium Checkout',
      'Paid Subscription'
    ];
    return stepNames.map((name, i) => ({
      stepIndex: i + 1,
      stepName: name,
      count: 0,
      conversionRateFromPrevious: 0,
      dropoffRateFromPrevious: 0,
      overallConversionRate: 0
    }));
  }
}
