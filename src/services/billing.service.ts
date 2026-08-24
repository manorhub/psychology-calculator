import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import type {
  SubscriptionPlanRow,
  SubscriptionRow,
  PaymentRow,
  CreditTransactionType
} from '@/types/database';
import { executeQuery, fetchFirst } from '@/lib/db/query';

export class BillingService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('BillingService');
    this.db = db;
  }

  // --- Subscription Plans ---

  public async getPlans(status: string = 'active'): Promise<SubscriptionPlanRow[]> {
    if (!this.db) return [];
    return executeQuery<SubscriptionPlanRow>(
      this.db,
      'SELECT * FROM subscription_plans WHERE status = ? ORDER BY display_order ASC',
      [status]
    );
  }

  public async getPlanBySlug(slug: string): Promise<SubscriptionPlanRow | null> {
    if (!this.db) return null;
    return fetchFirst<SubscriptionPlanRow>(
      this.db,
      'SELECT * FROM subscription_plans WHERE slug = ?',
      [slug]
    );
  }

  public async getPlanById(id: string): Promise<SubscriptionPlanRow | null> {
    if (!this.db) return null;
    return fetchFirst<SubscriptionPlanRow>(
      this.db,
      'SELECT * FROM subscription_plans WHERE id = ?',
      [id]
    );
  }

  // --- Subscriptions ---

  public async getUserSubscription(userId: string): Promise<SubscriptionRow | null> {
    if (!this.db) return null;
    return fetchFirst<SubscriptionRow>(
      this.db,
      "SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('active', 'on_trial') ORDER BY created_at DESC",
      [userId]
    );
  }

  public async createSubscription(data: Omit<SubscriptionRow, 'created_at' | 'updated_at'>): Promise<SubscriptionRow> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        `INSERT INTO subscriptions (
          id, user_id, plan_id, lemon_squeezy_customer_id, lemon_squeezy_subscription_id,
          status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(
        data.id, data.user_id, data.plan_id, data.lemon_squeezy_customer_id || null,
        data.lemon_squeezy_subscription_id || null, data.status, data.current_period_start || null,
        data.current_period_end || null, data.cancel_at_period_end
      )
      .run();

    const created = await fetchFirst<SubscriptionRow>(this.db, 'SELECT * FROM subscriptions WHERE id = ?', [data.id]);
    if (!created) throw new Error('Failed to retrieve created subscription');
    return created;
  }

  // --- Payments ---

  public async recordPayment(data: Omit<PaymentRow, 'created_at' | 'updated_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        `INSERT INTO payments (
          id, user_id, subscription_id, lemon_squeezy_order_id, amount, currency, status, payment_method, receipt_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(
        data.id, data.user_id || null, data.subscription_id || null, data.lemon_squeezy_order_id || null,
        data.amount, data.currency, data.status, data.payment_method || null, data.receipt_url || null
      )
      .run();
  }

  // --- Credit System ---

  public async getCreditBalance(userId: string): Promise<number> {
    if (!this.db) return 0;
    const row = await fetchFirst<{ balance: number }>(
      this.db,
      'SELECT balance FROM credit_balances WHERE user_id = ?',
      [userId]
    );
    return row?.balance ?? 0;
  }

  public async addCreditTransaction(params: {
    userId: string;
    amount: number;
    transactionType: CreditTransactionType;
    source: string;
    referenceId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<number> {
    if (!this.db) throw new Error('Database not available');

    const txId = crypto.randomUUID();
    const metaJson = params.metadata ? JSON.stringify(params.metadata) : null;

    // Record transaction ledger
    await this.db
      .prepare(
        'INSERT INTO credit_transactions (id, user_id, amount, transaction_type, source, reference_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      )
      .bind(txId, params.userId, params.amount, params.transactionType, params.source, params.referenceId || null, metaJson)
      .run();

    // Update user balance atomically
    await this.db
      .prepare(
        `INSERT INTO credit_balances (user_id, balance, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           balance = credit_balances.balance + excluded.balance,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(params.userId, params.amount)
      .run();

    return this.getCreditBalance(params.userId);
  }
}
