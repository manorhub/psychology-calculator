import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst, executeMutation } from '@/lib/db/query';
import { ValidationError, NotFoundError } from '@/lib/errors';

export interface ExperimentRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: 'draft' | 'running' | 'paused' | 'concluded';
  target_placement: string;
  primary_metric: string;
  starts_at: string | null;
  ends_at: string | null;
  winner_variant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExperimentVariantRow {
  id: string;
  experiment_id: string;
  variant_key: string;
  name: string;
  payload: string; // JSON
  weight: number;
  is_control: number;
  created_at: string;
}

export interface VariantAnalytics {
  variantId: string;
  variantKey: string;
  name: string;
  isControl: boolean;
  participants: number;
  conversions: number;
  conversionRate: number; // percentage
  upliftPercentage: number; // relative to control
}

export interface ExperimentAnalyticsReport {
  experiment: ExperimentRow;
  totalParticipants: number;
  totalConversions: number;
  variants: VariantAnalytics[];
  statusMessage: string;
  hasStatisticalSignificance: boolean;
}

export class ExperimentService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db?: D1Database | null) {
    super('ExperimentService');
    this.db = db || null;
  }

  /**
   * Retrieves active running experiment for a placement
   */
  public async getActiveExperimentForPlacement(placement: string): Promise<ExperimentRow | null> {
    if (!this.db) return null;

    return fetchFirst<ExperimentRow>(
      this.db,
      `SELECT * FROM experiments 
       WHERE target_placement = ? AND status = 'running' 
       AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
       AND (ends_at IS NULL OR ends_at >= CURRENT_TIMESTAMP)
       LIMIT 1`,
      [placement]
    );
  }

  /**
   * Gets existing assignment or deterministically assigns variant to visitor
   */
  public async getOrAssignVariant(
    experimentId: string,
    userId?: string | null,
    sessionId?: string | null
  ): Promise<{ variant: ExperimentVariantRow; parsedPayload: Record<string, unknown> } | null> {
    if (!this.db) return null;

    const variants = await executeQuery<ExperimentVariantRow>(
      this.db,
      `SELECT * FROM experiment_variants WHERE experiment_id = ? ORDER BY is_control DESC, created_at ASC`,
      [experimentId]
    );

    if (variants.length === 0) return null;

    // 1. Check existing assignment
    let existingAssignment: { variant_id: string } | null = null;
    if (userId) {
      existingAssignment = await fetchFirst<{ variant_id: string }>(
        this.db,
        `SELECT variant_id FROM experiment_assignments WHERE experiment_id = ? AND user_id = ? LIMIT 1`,
        [experimentId, userId]
      );
    } else if (sessionId) {
      existingAssignment = await fetchFirst<{ variant_id: string }>(
        this.db,
        `SELECT variant_id FROM experiment_assignments WHERE experiment_id = ? AND session_id = ? LIMIT 1`,
        [experimentId, sessionId]
      );
    }

    if (existingAssignment) {
      const matched = variants.find((v) => v.id === existingAssignment!.variant_id);
      if (matched) {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(matched.payload);
        } catch {}
        return { variant: matched, parsedPayload: payload };
      }
    }

    // 2. Deterministic assignment based on user/session hash
    const identifier = userId || sessionId || crypto.randomUUID();
    let hashNum = 0;
    for (let i = 0; i < identifier.length; i++) {
      hashNum = (hashNum << 5) - hashNum + identifier.charCodeAt(i);
      hashNum |= 0;
    }
    const normalizedHash = Math.abs(hashNum) % 100;

    let cumulativeWeight = 0;
    let selectedVariant = variants[0];

    for (const v of variants) {
      cumulativeWeight += v.weight;
      if (normalizedHash < cumulativeWeight) {
        selectedVariant = v;
        break;
      }
    }

    // 3. Persist assignment
    const assignmentId = crypto.randomUUID();
    await executeMutation(
      this.db,
      `INSERT INTO experiment_assignments (id, experiment_id, variant_id, user_id, session_id, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [assignmentId, experimentId, selectedVariant.id, userId || null, sessionId || null]
    );

    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(selectedVariant.payload);
    } catch {}

    return { variant: selectedVariant, parsedPayload };
  }

  /**
   * Tracks an experiment conversion event
   */
  public async trackConversion(
    experimentId: string,
    variantId: string,
    metric: string,
    userId?: string | null,
    sessionId?: string | null
  ): Promise<void> {
    if (!this.db) return;

    const eventId = crypto.randomUUID();
    await executeMutation(
      this.db,
      `INSERT INTO analytics_events (id, event_name, entity_type, entity_id, user_id, session_id, metadata, created_at)
       VALUES (?, 'experiment_conversion', 'experiment', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [eventId, experimentId, userId || null, sessionId || null, JSON.stringify({ variantId, metric })]
    );
  }

  /**
   * Computes experiment analytics report with real user data
   */
  public async getExperimentAnalytics(experimentId: string): Promise<ExperimentAnalyticsReport> {
    if (!this.db) throw new Error('Database unavailable');

    const experiment = await fetchFirst<ExperimentRow>(
      this.db,
      `SELECT * FROM experiments WHERE id = ?`,
      [experimentId]
    );

    if (!experiment) throw new NotFoundError('Experiment not found');

    const variants = await executeQuery<ExperimentVariantRow>(
      this.db,
      `SELECT * FROM experiment_variants WHERE experiment_id = ? ORDER BY is_control DESC, created_at ASC`,
      [experimentId]
    );

    const variantStats: VariantAnalytics[] = [];
    let totalParticipants = 0;
    let totalConversions = 0;
    let controlConversionRate = 0;

    for (const v of variants) {
      const [partsRow, convsRow] = await Promise.all([
        fetchFirst<{ count: number }>(
          this.db,
          `SELECT COUNT(*) as count FROM experiment_assignments WHERE experiment_id = ? AND variant_id = ?`,
          [experimentId, v.id]
        ),
        fetchFirst<{ count: number }>(
          this.db,
          `SELECT COUNT(*) as count FROM analytics_events 
           WHERE event_name = 'experiment_conversion' AND entity_id = ? 
           AND json_extract(metadata, '$.variantId') = ?`,
          [experimentId, v.id]
        )
      ]);

      const participants = partsRow?.count || 0;
      const conversions = convsRow?.count || 0;
      const conversionRate = participants > 0 ? Math.round((conversions / participants) * 1000) / 10 : 0;

      totalParticipants += participants;
      totalConversions += conversions;

      if (v.is_control === 1) {
        controlConversionRate = conversionRate;
      }

      variantStats.push({
        variantId: v.id,
        variantKey: v.variant_key,
        name: v.name,
        isControl: v.is_control === 1,
        participants,
        conversions,
        conversionRate,
        upliftPercentage: 0
      });
    }

    // Calculate uplift relative to control
    for (const stat of variantStats) {
      if (!stat.isControl && controlConversionRate > 0) {
        stat.upliftPercentage = Math.round(((stat.conversionRate - controlConversionRate) / controlConversionRate) * 1000) / 10;
      }
    }

    let statusMessage = 'Experiment Active';
    let hasStatisticalSignificance = false;

    if (totalParticipants < 30) {
      statusMessage = 'Insufficient data: Minimum 30 participants required for valid directional results';
    } else {
      hasStatisticalSignificance = true;
      const best = [...variantStats].sort((a, b) => b.conversionRate - a.conversionRate)[0];
      statusMessage = `Leading variant: ${best.name} (${best.conversionRate}%)`;
    }

    return {
      experiment,
      totalParticipants,
      totalConversions,
      variants: variantStats,
      statusMessage,
      hasStatisticalSignificance
    };
  }

  /**
   * Admin Experiment Management CRUD
   */
  public async getAllExperiments(): Promise<ExperimentRow[]> {
    if (!this.db) return [];
    return executeQuery<ExperimentRow>(
      this.db,
      `SELECT * FROM experiments ORDER BY created_at DESC`
    );
  }

  public async createExperiment(data: {
    name: string;
    slug: string;
    description?: string;
    targetPlacement: string;
    primaryMetric?: string;
    variants: Array<{ name: string; variantKey: string; payload: Record<string, unknown>; weight?: number; isControl?: boolean }>;
  }): Promise<string> {
    if (!this.db) return '';
    if (!data.name || !data.slug || !data.targetPlacement || data.variants.length < 2) {
      throw new ValidationError('Experiment requires a name, slug, target placement, and at least 2 variants');
    }

    const experimentId = `exp_${crypto.randomUUID().slice(0, 8)}`;
    await executeMutation(
      this.db,
      `INSERT INTO experiments (id, name, slug, description, status, target_placement, primary_metric, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [experimentId, data.name, data.slug, data.description || null, data.targetPlacement, data.primaryMetric || 'cta_click']
    );

    for (const v of data.variants) {
      const variantId = `var_${crypto.randomUUID().slice(0, 8)}`;
      await executeMutation(
        this.db,
        `INSERT INTO experiment_variants (id, experiment_id, variant_key, name, payload, weight, is_control, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [variantId, experimentId, v.variantKey, v.name, JSON.stringify(v.payload), v.weight || 50, v.isControl ? 1 : 0]
      );
    }

    return experimentId;
  }

  public async setExperimentStatus(
    experimentId: string,
    status: 'draft' | 'running' | 'paused' | 'concluded'
  ): Promise<void> {
    if (!this.db) return;

    await executeMutation(
      this.db,
      `UPDATE experiments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, experimentId]
    );
  }
}
