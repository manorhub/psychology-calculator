import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, executeMutation, fetchFirst } from '@/lib/db/query';
import { PlanService } from './plan.service';
import { CreditService } from '../credit.service';
import { LemonSqueezyService } from './lemon-squeezy.service';
import type {
  SubscriptionRow,
  SubscriptionInternalStatus,
  PaymentRow,
  UserSubscriptionSummary
} from '@/types/database';
import { NotFoundError } from '@/lib/errors';

export class SubscriptionService extends BaseService {
  private readonly db: D1Database | null;
  private readonly planService: PlanService;
  private readonly creditService: CreditService;
  private readonly lemonSqueezyService: LemonSqueezyService;

  constructor(db: D1Database | null, lsService?: LemonSqueezyService) {
    super('SubscriptionService');
    this.db = db;
    this.planService = new PlanService(db);
    this.creditService = new CreditService(db);
    this.lemonSqueezyService = lsService || new LemonSqueezyService();
  }

  /**
   * Resolves the current active subscription & entitlement state for a user
   */
  public async getUserSubscriptionSummary(userId: string): Promise<UserSubscriptionSummary> {
    if (!this.db) {
      return this.getFallbackFreeSummary();
    }

    const subRow = await fetchFirst<
      SubscriptionRow & {
        plan_name: string;
        plan_slug: string;
        billing_interval: any;
        price: number;
        currency: string;
      }
    >(
      this.db,
      `SELECT s.*, p.name as plan_name, p.slug as plan_slug, p.billing_interval, p.price, p.currency
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC LIMIT 1`,
      [userId]
    );

    if (!subRow) {
      // Default to Free Explorer plan
      const freePlan = await this.planService.getPlanBySlug('free');
      return {
        hasSubscription: false,
        isPremium: false,
        status: 'free',
        planId: freePlan?.id || 'plan_free',
        planName: freePlan?.name || 'Free Explorer',
        planSlug: freePlan?.slug || 'free',
        billingInterval: 'none',
        price: 0,
        currency: 'USD',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        entitlements: {
          basic_assessments: true,
          basic_results: true,
          premium_assessments: false,
          premium_ai_reports: false,
          premium_pdf_exports: false
        }
      };
    }

    // Determine if status is currently active / entitled
    const isPeriodValid = !subRow.current_period_end || new Date(subRow.current_period_end).getTime() > Date.now();
    const isPremium = (subRow.status === 'active' || subRow.status === 'on_trial' || (subRow.status === 'cancelled' && isPeriodValid));

    // Get plan entitlements
    const plan = await this.planService.getPlanById(subRow.plan_id);
    const entitlementsObj: Record<string, boolean> = {};
    if (plan && plan.entitlements) {
      for (const [k, v] of Object.entries(plan.entitlements)) {
        entitlementsObj[k] = isPremium ? v.is_enabled : false;
      }
    }

    let customerPortalUrl: string | undefined;
    if (subRow.lemon_squeezy_customer_id) {
      const portal = await this.lemonSqueezyService.getCustomerPortalUrl(subRow.lemon_squeezy_customer_id);
      if (portal) customerPortalUrl = portal;
    }

    return {
      hasSubscription: true,
      isPremium,
      status: subRow.status,
      planId: subRow.plan_id,
      planName: subRow.plan_name,
      planSlug: subRow.plan_slug,
      billingInterval: subRow.billing_interval,
      price: subRow.price,
      currency: subRow.currency,
      currentPeriodEnd: subRow.current_period_end,
      cancelAtPeriodEnd: subRow.cancel_at_period_end === 1,
      customerPortalUrl,
      entitlements: entitlementsObj
    };
  }

  /**
   * Processes a verified Lemon Squeezy subscription webhook event
   */
  public async handleSubscriptionWebhookEvent(
    eventName: string,
    payloadData: any
  ): Promise<{ success: boolean; subscriptionId?: string }> {
    if (!this.db) throw new Error('Database unavailable');

    const attributes = payloadData.attributes || {};
    const customData = attributes.custom_data || payloadData.meta?.custom_data || {};
    const lsSubscriptionId = String(payloadData.id || attributes.first_subscription_item?.subscription_id || '');
    const lsCustomerId = String(attributes.customer_id || '');
    const lsVariantId = String(attributes.variant_id || attributes.first_subscription_item?.variant_id || '');

    this.logger.info('Processing subscription webhook event', { eventName, lsSubscriptionId, lsCustomerId });

    // 1. Resolve Target User ID
    let userId: string | null = customData.user_id || null;
    const userEmail = attributes.user_email || attributes.customer_email || customData.user_email;

    if (!userId && userEmail) {
      const user = await fetchFirst<{ id: string }>(this.db, 'SELECT id FROM users WHERE email = ?', [userEmail]);
      if (user) userId = user.id;
    }

    if (!userId) {
      // Look up existing subscription by Lemon Squeezy Customer ID or Subscription ID
      const existing = await fetchFirst<SubscriptionRow>(
        this.db,
        'SELECT user_id FROM subscriptions WHERE lemon_squeezy_subscription_id = ? OR lemon_squeezy_customer_id = ?',
        [lsSubscriptionId, lsCustomerId]
      );
      if (existing) userId = existing.user_id;
    }

    if (!userId) {
      this.logger.warn('Could not map Lemon Squeezy subscription event to user ID', { eventName, lsSubscriptionId, userEmail });
      return { success: false };
    }

    // 2. Resolve Plan
    let plan = customData.plan_id ? await this.planService.getPlanById(customData.plan_id) : null;
    if (!plan && lsVariantId) {
      plan = await this.planService.getPlanByVariantId(lsVariantId);
    }
    if (!plan) {
      // Fallback to Pro Monthly if variant not yet mapped
      plan = (await this.planService.getPlanBySlug('pro-monthly')) || (await this.planService.getPlanBySlug('free'));
    }

    if (!plan) {
      throw new NotFoundError('Unable to match subscription to a valid system plan');
    }

    // 3. Normalize Internal Subscription Status
    const rawStatus = (attributes.status || '').toLowerCase();
    let status: SubscriptionInternalStatus = 'active';

    if (rawStatus === 'on_trial') status = 'on_trial';
    else if (rawStatus === 'active') status = 'active';
    else if (rawStatus === 'paused') status = 'paused';
    else if (rawStatus === 'past_due') status = 'past_due';
    else if (rawStatus === 'unpaid') status = 'unpaid';
    else if (rawStatus === 'cancelled') status = 'cancelled';
    else if (rawStatus === 'expired') status = 'expired';

    // Check period dates
    const currentPeriodStart = attributes.created_at || attributes.renews_at || new Date().toISOString();
    const currentPeriodEnd = attributes.ends_at || attributes.renews_at || null;
    const cancelAtPeriodEnd = attributes.cancelled === true || attributes.cancel_at_period_end === true ? 1 : 0;

    // 4. Upsert Subscription Record
    const subId = crypto.randomUUID();
    await executeMutation(
      this.db,
      `INSERT INTO subscriptions (
         id, user_id, plan_id, lemon_squeezy_customer_id, lemon_squeezy_subscription_id,
         status, current_period_start, current_period_end, cancel_at_period_end, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(lemon_squeezy_subscription_id) DO UPDATE SET
         plan_id = excluded.plan_id,
         lemon_squeezy_customer_id = excluded.lemon_squeezy_customer_id,
         status = excluded.status,
         current_period_start = excluded.current_period_start,
         current_period_end = excluded.current_period_end,
         cancel_at_period_end = excluded.cancel_at_period_end,
         updated_at = CURRENT_TIMESTAMP`,
      [
        subId,
        userId,
        plan.id,
        lsCustomerId || null,
        lsSubscriptionId || null,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd
      ]
    );

    // 5. Grant Included Credits on initial activation or renewal
    if (eventName === 'subscription_created' || eventName === 'subscription_payment_success') {
      if (plan.included_credits > 0) {
        await this.creditService.addCredits(
          userId,
          plan.included_credits,
          'subscription_grant',
          `${plan.name} subscription credit allotment`
        );
      }
    }

    this.logger.info('Subscription successfully synced from webhook', { userId, planId: plan.id, status });
    return { success: true, subscriptionId: lsSubscriptionId };
  }

  /**
   * Processes a verified Lemon Squeezy Order / Payment webhook event for one-time credits
   */
  public async handleOrderWebhookEvent(eventName: string, payloadData: any): Promise<boolean> {
    if (!this.db) return false;

    const attributes = payloadData.attributes || {};
    const orderId = String(payloadData.id || attributes.identifier || attributes.first_order_item?.order_id || '');
    const userEmail = attributes.user_email || attributes.customer_email;
    const totalAmount = (attributes.total || attributes.total_usd || 0) / 100;
    const currency = attributes.currency || 'USD';
    const status = attributes.status === 'paid' ? 'paid' : attributes.status === 'refunded' ? 'refunded' : 'pending';
    const receiptUrl = attributes.urls?.receipt || null;
    const variantId = String(attributes.first_order_item?.variant_id || attributes.variant_id || '');
    const productId = String(attributes.first_order_item?.product_id || attributes.product_id || '');

    let userId: string | null = attributes.custom_data?.user_id || payloadData.meta?.custom_data?.user_id || null;
    let packageId: string | null = attributes.custom_data?.package_id || payloadData.meta?.custom_data?.package_id || null;

    if (!userId && userEmail) {
      const user = await fetchFirst<{ id: string }>(this.db, 'SELECT id FROM users WHERE email = ?', [userEmail]);
      if (user) userId = user.id;
    }

    if (!userId) {
      this.logger.warn('Could not map Lemon Squeezy order event to user ID', { orderId, userEmail });
      return false;
    }

    // 1. Resolve Package (default to 20 AI Report Credits)
    let creditPackage = packageId ? await this.creditService.getPackageById(packageId) : null;
    if (!creditPackage && variantId) {
      creditPackage = await fetchFirst<any>(
        this.db,
        'SELECT * FROM credit_packages WHERE lemon_squeezy_variant_id = ? LIMIT 1',
        [variantId]
      );
    }
    if (!creditPackage) {
      const packages = await this.creditService.getPackages(true);
      creditPackage = packages[0] || null;
    }

    const creditsToGrant = creditPackage?.credits || 20;

    // 2. Check Order Idempotency (prevent duplicate credit grants)
    const existingOrder = await fetchFirst<any>(
      this.db,
      'SELECT * FROM orders WHERE provider_order_id = ?',
      [orderId]
    );

    if (status === 'paid' && !existingOrder) {
      const orderDbId = crypto.randomUUID();
      await executeMutation(
        this.db,
        `INSERT INTO orders (
           id, user_id, provider, provider_order_id, package_id, product_id, variant_id,
           amount, currency, status, credits_granted, receipt_url, created_at, updated_at
         ) VALUES (?, ?, 'lemonsqueezy', ?, ?, ?, ?, ?, ?, 'paid', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          orderDbId,
          userId,
          orderId,
          creditPackage?.id || 'pkg_credits_20',
          productId || null,
          variantId || null,
          totalAmount || 4.00,
          currency,
          creditsToGrant,
          receiptUrl
        ]
      );

      // Grant credits to user wallet
      await this.creditService.addCredits(
        userId,
        creditsToGrant,
        'purchase',
        `Purchased ${creditsToGrant} AI Report Credits (Order #${orderId})`,
        orderId,
        'order'
      );

      this.logger.info('Granted one-time credits from verified order', { userId, orderId, credits: creditsToGrant });
    } else if (status === 'refunded' && existingOrder && existingOrder.status !== 'refunded') {
      await executeMutation(
        this.db,
        `UPDATE orders SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE provider_order_id = ?`,
        [orderId]
      );

      // Record refund transaction safely
      const wallet = await this.creditService.getUserWallet(userId);
      const creditsToDeduct = Math.min(wallet.balance, existingOrder.credits_granted || creditsToGrant);
      if (creditsToDeduct > 0) {
        await this.creditService.addCredits(
          userId,
          -creditsToDeduct,
          'refund',
          `Refund for order #${orderId} (-${creditsToDeduct} credits)`,
          orderId,
          'order'
        );
      }
      this.logger.info('Processed order refund in ledger', { userId, orderId, refundedCredits: creditsToDeduct });
    }

    // Also update legacy payments table for backward compatibility
    const paymentId = crypto.randomUUID();
    await executeMutation(
      this.db,
      `INSERT INTO payments (
         id, user_id, lemon_squeezy_order_id, amount, currency, status, receipt_url, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(lemon_squeezy_order_id) DO UPDATE SET
         status = excluded.status,
         receipt_url = excluded.receipt_url,
         updated_at = CURRENT_TIMESTAMP`,
      [paymentId, userId, orderId, totalAmount || 4.00, currency, status, receiptUrl]
    );

    return true;
  }

  /**
   * Cancels user subscription (marks cancel_at_period_end)
   */
  public async cancelUserSubscription(userId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database unavailable');

    const sub = await fetchFirst<SubscriptionRow>(
      this.db,
      `SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('active', 'on_trial') ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (!sub) {
      throw new NotFoundError('No active subscription found to cancel');
    }

    // Call Lemon Squeezy API if configured
    if (sub.lemon_squeezy_subscription_id) {
      await this.lemonSqueezyService.cancelSubscription(sub.lemon_squeezy_subscription_id);
    }

    // Update D1 to cancel at period end
    await executeMutation(
      this.db,
      `UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [sub.id]
    );

    this.logger.info('User scheduled subscription cancellation', { userId, subId: sub.id });
    return true;
  }

  /**
   * Lists user payments and invoices
   */
  public async getUserPayments(userId: string, limit = 20): Promise<PaymentRow[]> {
    if (!this.db) return [];

    return executeQuery<PaymentRow>(
      this.db,
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
  }

  /**
   * Lists all transactions for Admin ledger
   */
  public async getAllTransactions(limit = 100): Promise<any[]> {
    if (!this.db) return [];

    return executeQuery<any>(
      this.db,
      `SELECT p.*, u.email as user_email, prof.display_name as user_name
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN profiles prof ON p.user_id = prof.user_id
       ORDER BY p.created_at DESC LIMIT ?`,
      [limit]
    );
  }

  /**
   * Lists all user subscriptions for Admin panel
   */
  public async getAllSubscriptions(limit = 100): Promise<any[]> {
    if (!this.db) return [];

    return executeQuery<any>(
      this.db,
      `SELECT s.*, u.email as user_email, prof.display_name as user_name, pl.name as plan_name, pl.slug as plan_slug
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN profiles prof ON s.user_id = prof.user_id
       LEFT JOIN subscription_plans pl ON s.plan_id = pl.id
       ORDER BY s.created_at DESC LIMIT ?`,
      [limit]
    );
  }

  private getFallbackFreeSummary(): UserSubscriptionSummary {
    return {
      hasSubscription: false,
      isPremium: false,
      status: 'free',
      planId: 'plan_free',
      planName: 'Free Explorer',
      planSlug: 'free',
      billingInterval: 'none',
      price: 0,
      currency: 'USD',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      entitlements: {
        basic_assessments: true,
        basic_results: true,
        premium_assessments: false,
        premium_ai_reports: false,
        premium_pdf_exports: false
      }
    };
  }
}
