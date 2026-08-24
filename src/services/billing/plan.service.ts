import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, executeMutation, fetchFirst } from '@/lib/db/query';
import type {
  SubscriptionPlanRow,
  PlanEntitlementRow,
  PlanWithEntitlements,
  BillingInterval,
  PlanStatus
} from '@/types/database';

export class PlanService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('PlanService');
    this.db = db;
  }

  /**
   * Retrieves all published plans with their dynamic feature entitlements
   */
  public async getActivePlans(): Promise<PlanWithEntitlements[]> {
    if (!this.db) return [];

    const planRows = await executeQuery<SubscriptionPlanRow>(
      this.db,
      `SELECT * FROM subscription_plans WHERE status = 'active' ORDER BY display_order ASC`
    );

    return this.enrichPlansWithEntitlements(planRows);
  }

  /**
   * Retrieves all plans (including inactive/archived) for Admin management
   */
  public async getAllPlans(): Promise<PlanWithEntitlements[]> {
    if (!this.db) return [];

    const planRows = await executeQuery<SubscriptionPlanRow>(
      this.db,
      `SELECT * FROM subscription_plans ORDER BY display_order ASC`
    );

    return this.enrichPlansWithEntitlements(planRows);
  }

  /**
   * Retrieves a single plan by ID
   */
  public async getPlanById(planId: string): Promise<PlanWithEntitlements | null> {
    if (!this.db) return null;

    const row = await fetchFirst<SubscriptionPlanRow>(
      this.db,
      'SELECT * FROM subscription_plans WHERE id = ?',
      [planId]
    );

    if (!row) return null;
    const [enriched] = await this.enrichPlansWithEntitlements([row]);
    return enriched || null;
  }

  /**
   * Retrieves a single plan by Slug
   */
  public async getPlanBySlug(slug: string): Promise<PlanWithEntitlements | null> {
    if (!this.db) return null;

    const row = await fetchFirst<SubscriptionPlanRow>(
      this.db,
      'SELECT * FROM subscription_plans WHERE slug = ?',
      [slug]
    );

    if (!row) return null;
    const [enriched] = await this.enrichPlansWithEntitlements([row]);
    return enriched || null;
  }

  /**
   * Finds a plan matching a Lemon Squeezy variant ID
   */
  public async getPlanByVariantId(variantId: string): Promise<PlanWithEntitlements | null> {
    if (!this.db) return null;

    const row = await fetchFirst<SubscriptionPlanRow>(
      this.db,
      'SELECT * FROM subscription_plans WHERE lemon_squeezy_variant_id = ?',
      [variantId]
    );

    if (!row) return null;
    const [enriched] = await this.enrichPlansWithEntitlements([row]);
    return enriched || null;
  }

  /**
   * Creates or updates a subscription plan
   */
  public async upsertPlan(data: {
    id?: string;
    name: string;
    slug: string;
    description?: string | null;
    price: number;
    currency?: string;
    billing_interval: BillingInterval;
    features: string[];
    included_credits?: number;
    lemon_squeezy_variant_id?: string | null;
    status: PlanStatus;
    display_order?: number;
  }): Promise<string> {
    if (!this.db) throw new Error('Database unavailable');

    const planId = data.id || `plan_${crypto.randomUUID().slice(0, 8)}`;
    const featuresJson = JSON.stringify(data.features || []);

    await executeMutation(
      this.db,
      `INSERT INTO subscription_plans (
         id, name, slug, description, price, currency, billing_interval, features,
         included_credits, lemon_squeezy_variant_id, status, display_order, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         slug = excluded.slug,
         description = excluded.description,
         price = excluded.price,
         currency = excluded.currency,
         billing_interval = excluded.billing_interval,
         features = excluded.features,
         included_credits = excluded.included_credits,
         lemon_squeezy_variant_id = excluded.lemon_squeezy_variant_id,
         status = excluded.status,
         display_order = excluded.display_order,
         updated_at = CURRENT_TIMESTAMP`,
      [
        planId,
        data.name,
        data.slug,
        data.description || null,
        data.price,
        data.currency || 'USD',
        data.billing_interval,
        featuresJson,
        data.included_credits || 0,
        data.lemon_squeezy_variant_id || null,
        data.status,
        data.display_order ?? 0
      ]
    );

    this.logger.info('Plan upserted successfully', { planId, slug: data.slug });
    return planId;
  }

  /**
   * Sets or updates dynamic entitlements for a plan
   */
  public async setPlanEntitlements(
    planId: string,
    entitlements: Record<string, { is_enabled: boolean; limit_value?: number | null }>
  ): Promise<void> {
    if (!this.db) throw new Error('Database unavailable');

    for (const [featureKey, config] of Object.entries(entitlements)) {
      const entId = `ent_${crypto.randomUUID().slice(0, 8)}`;
      await executeMutation(
        this.db,
        `INSERT INTO plan_entitlements (
           id, plan_id, feature_key, is_enabled, limit_value, updated_at
         ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(plan_id, feature_key) DO UPDATE SET
           is_enabled = excluded.is_enabled,
           limit_value = excluded.limit_value,
           updated_at = CURRENT_TIMESTAMP`,
        [entId, planId, featureKey, config.is_enabled ? 1 : 0, config.limit_value ?? null]
      );
    }
  }

  /**
   * Helper to attach entitlements and parse features JSON
   */
  private async enrichPlansWithEntitlements(planRows: SubscriptionPlanRow[]): Promise<PlanWithEntitlements[]> {
    if (!this.db || planRows.length === 0) return [];

    const planIds = planRows.map((p) => p.id);
    const placeholders = planIds.map(() => '?').join(',');

    const entitlementRows = await executeQuery<PlanEntitlementRow>(
      this.db,
      `SELECT * FROM plan_entitlements WHERE plan_id IN (${placeholders})`,
      planIds
    );

    const entitlementsMap = new Map<string, Record<string, { is_enabled: boolean; limit_value: number | null }>>();
    for (const ent of entitlementRows) {
      if (!entitlementsMap.has(ent.plan_id)) {
        entitlementsMap.set(ent.plan_id, {});
      }
      entitlementsMap.get(ent.plan_id)![ent.feature_key] = {
        is_enabled: ent.is_enabled === 1,
        limit_value: ent.limit_value
      };
    }

    return planRows.map((row) => {
      let parsedFeatures: string[] = [];
      try {
        parsedFeatures = JSON.parse(row.features);
      } catch {
        parsedFeatures = [];
      }

      return {
        ...row,
        features: parsedFeatures,
        entitlements: entitlementsMap.get(row.id) || {}
      };
    });
  }
}
