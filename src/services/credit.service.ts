import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import { executeQuery, executeMutation, fetchFirst } from '@/lib/db/query';
import type {
  CreditTransactionType,
  CreditTransactionRow,
  CreditWalletRow,
  CreditPackageRow
} from '@/types/database';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';

export class CreditService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('CreditService');
    this.db = db;
  }

  /**
   * Retrieves or initializes the user's credit wallet
   */
  public async getUserWallet(userId: string): Promise<CreditWalletRow> {
    if (!this.db) {
      return {
        id: `wlt_${userId}`,
        user_id: userId,
        balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    let wallet = await fetchFirst<CreditWalletRow>(
      this.db,
      'SELECT * FROM credit_wallets WHERE user_id = ?',
      [userId]
    );

    if (!wallet) {
      // Check legacy credit_balances
      const legacy = await fetchFirst<{ balance: number }>(
        this.db,
        'SELECT balance FROM credit_balances WHERE user_id = ?',
        [userId]
      );
      
      let initialBalance = legacy?.balance;
      if (initialBalance === undefined || initialBalance === null) {
        try {
          const settingRow = await fetchFirst<{ value: string }>(
            this.db,
            "SELECT value FROM site_settings WHERE key = 'signup_bonus_credits' OR key = 'new_user_initial_credits' LIMIT 1"
          );
          if (settingRow && settingRow.value !== undefined) {
            const parsed = parseInt(settingRow.value, 10);
            initialBalance = isNaN(parsed) ? 10 : Math.max(0, parsed);
          } else {
            initialBalance = 10;
          }
        } catch {
          initialBalance = 10;
        }
      }

      const walletId = `wlt_${userId}`;

      await executeMutation(
        this.db,
        `INSERT INTO credit_wallets (id, user_id, balance, created_at, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
        [walletId, userId, initialBalance]
      );

      // Keep credit_balances in sync
      await executeMutation(
        this.db,
        `INSERT INTO credit_balances (user_id, balance, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET balance = excluded.balance, updated_at = CURRENT_TIMESTAMP`,
        [userId, initialBalance]
      );

      if (initialBalance > 0 && !legacy) {
        try {
          await executeMutation(
            this.db,
            `INSERT INTO credit_transactions (id, user_id, amount, transaction_type, source, reference_id, metadata, created_at)
             VALUES (?, ?, ?, 'signup_bonus', 'system', 'welcome_bonus', ?, CURRENT_TIMESTAMP)`,
            [`tx_${crypto.randomUUID()}`, userId, initialBalance, JSON.stringify({ reason: 'Initial signup welcome credits' })]
          );
        } catch {
          // ignore duplicate tx
        }
      }

      wallet = await fetchFirst<CreditWalletRow>(
        this.db,
        'SELECT * FROM credit_wallets WHERE user_id = ?',
        [userId]
      );
    }

    return wallet || {
      id: `wlt_${userId}`,
      user_id: userId,
      balance: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Retrieves the current credit balance for a user
   */
  public async getUserBalance(userId: string): Promise<{ balance: number }> {
    const wallet = await this.getUserWallet(userId);
    return { balance: wallet.balance };
  }

  /**
   * Atomically spends credits for an action (e.g. AI report generation)
   * Records full auditable ledger with balance_before and balance_after
   */
  public async spendCredits(
    userId: string,
    amount: number,
    referenceId?: string,
    description?: string,
    referenceType = 'report'
  ): Promise<number> {
    if (!this.db) throw new Error('Database unavailable');
    const absAmount = Math.abs(amount);
    const wallet = await this.getUserWallet(userId);

    if (wallet.balance < absAmount) {
      throw new ForbiddenError(
        `Insufficient credit balance: Action requires ${absAmount} credits, but you currently have ${wallet.balance} credits.`
      );
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - absAmount;
    const txId = crypto.randomUUID();
    const finalDesc = description || `Detailed AI report generation (${absAmount} credits)`;

    // 1. Record Ledger Transaction
    await executeMutation(
      this.db,
      `INSERT INTO credit_transactions (
         id, user_id, amount, transaction_type, source, reference_id, metadata, created_at
       ) VALUES (?, ?, ?, 'ai_report_usage', ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        txId,
        userId,
        -absAmount,
        referenceType,
        referenceId || null,
        JSON.stringify({
          walletId: wallet.id,
          balanceBefore,
          balanceAfter,
          description: finalDesc,
          referenceType
        })
      ]
    );

    // 2. Atomically update wallet & balance
    await executeMutation(
      this.db,
      `UPDATE credit_wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [absAmount, userId]
    );

    await executeMutation(
      this.db,
      `INSERT INTO credit_balances (user_id, balance, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET balance = excluded.balance, updated_at = CURRENT_TIMESTAMP`,
      [userId, balanceAfter]
    );

    this.logger.info('Spent credits for user', { userId, amount: absAmount, balanceBefore, balanceAfter });
    return balanceAfter;
  }

  /**
   * Grants or refunds credits atomically
   */
  public async addCredits(
    userId: string,
    amount: number,
    type: CreditTransactionType = 'purchase',
    description?: string,
    referenceId?: string,
    referenceType = 'order'
  ): Promise<number> {
    if (!this.db) throw new Error('Database unavailable');
    const absAmount = Math.abs(amount);
    const wallet = await this.getUserWallet(userId);

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + absAmount;
    const txId = crypto.randomUUID();
    const finalDesc = description || (type === 'purchase' ? `Purchased ${absAmount} credits` : `Credit adjustment (+${absAmount})`);
    const validTypes = ['signup_bonus', 'subscription_grant', 'purchase', 'ai_report_usage', 'pdf_export_usage', 'admin_adjustment', 'refund'];
    let normalizedType: string = type;
    if (type === 'bonus' as any) normalizedType = 'signup_bonus';
    if (type === 'report_usage' as any) normalizedType = 'ai_report_usage';
    if (!validTypes.includes(normalizedType)) normalizedType = 'admin_adjustment';

    // 1. Record Ledger Transaction
    await executeMutation(
      this.db,
      `INSERT INTO credit_transactions (
         id, user_id, amount, transaction_type, source, reference_id, metadata, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        txId,
        userId,
        absAmount,
        normalizedType,
        referenceType,
        referenceId || null,
        JSON.stringify({
          walletId: wallet.id,
          balanceBefore,
          balanceAfter,
          description: finalDesc,
          referenceType
        })
      ]
    );

    // 2. Update wallet & balance
    await executeMutation(
      this.db,
      `UPDATE credit_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [absAmount, userId]
    );

    await executeMutation(
      this.db,
      `INSERT INTO credit_balances (user_id, balance, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET balance = excluded.balance, updated_at = CURRENT_TIMESTAMP`,
      [userId, balanceAfter]
    );

    this.logger.info('Added credits for user', { userId, amount: absAmount, type, balanceBefore, balanceAfter });
    return balanceAfter;
  }

  /**
   * Admin manual adjustment with audit reasons
   */
  public async adminAdjustCredits(
    userId: string,
    adminId: string,
    adjustmentAmount: number,
    reason: string
  ): Promise<{ balance: number; transactionId: string }> {
    if (!this.db) throw new Error('Database unavailable');
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('A detailed reason is required for administrative credit adjustments.');
    }

    const wallet = await this.getUserWallet(userId);
    const balanceBefore = wallet.balance;
    const balanceAfter = Math.max(0, balanceBefore + adjustmentAmount);
    const actualDelta = balanceAfter - balanceBefore;
    const txId = crypto.randomUUID();

    // 1. Record Transaction
    await executeMutation(
      this.db,
      `INSERT INTO credit_transactions (
         id, user_id, amount, transaction_type, source, reference_id, metadata, created_at
       ) VALUES (?, ?, ?, 'admin_adjustment', 'admin_panel', ?, ?, CURRENT_TIMESTAMP)`,
      [
        txId,
        userId,
        actualDelta,
        adminId,
        JSON.stringify({
          adminId,
          reason,
          walletId: wallet.id,
          balanceBefore,
          balanceAfter,
          description: `Admin adjustment: ${reason}`
        })
      ]
    );

    // 2. Update Wallets
    await executeMutation(
      this.db,
      `UPDATE credit_wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [balanceAfter, userId]
    );

    await executeMutation(
      this.db,
      `INSERT INTO credit_balances (user_id, balance, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET balance = excluded.balance, updated_at = CURRENT_TIMESTAMP`,
      [userId, balanceAfter]
    );

    this.logger.info('Admin adjusted credits', { userId, adminId, actualDelta, balanceBefore, balanceAfter, reason });
    return { balance: balanceAfter, transactionId: txId };
  }

  /**
   * Retrieves transaction history for a user
   */
  public async getUserTransactions(userId: string, limit = 50): Promise<any[]> {
    if (!this.db) return [];

    const rows = await executeQuery<CreditTransactionRow>(
      this.db,
      'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );

    return rows.map((r) => {
      let meta: any = {};
      try {
        if (r.metadata) meta = JSON.parse(r.metadata);
      } catch {}
      return {
        id: r.id,
        userId: r.user_id,
        amount: r.amount,
        transactionType: r.transaction_type,
        source: r.source,
        referenceId: r.reference_id,
        description: meta.description || (r.amount > 0 ? 'Credit Grant' : 'AI Report Usage'),
        balanceBefore: meta.balanceBefore ?? null,
        balanceAfter: meta.balanceAfter ?? null,
        createdAt: r.created_at
      };
    });
  }

  /**
   * Retrieves all transactions for Admin Ledger Explorer
   */
  public async getAllTransactions(limit = 100): Promise<any[]> {
    if (!this.db) return [];

    const rows = await executeQuery<CreditTransactionRow>(
      this.db,
      'SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT ?',
      [limit]
    );

    return rows.map((r) => {
      let meta: any = {};
      try {
        if (r.metadata) meta = JSON.parse(r.metadata);
      } catch {}
      return {
        id: r.id,
        userId: r.user_id,
        amount: r.amount,
        transactionType: r.transaction_type,
        source: r.source,
        referenceId: r.reference_id,
        description: meta.description || (r.amount > 0 ? 'Credit Grant' : 'AI Report Usage'),
        balanceBefore: meta.balanceBefore ?? null,
        balanceAfter: meta.balanceAfter ?? null,
        adminId: meta.adminId ?? null,
        reason: meta.reason ?? null,
        createdAt: r.created_at
      };
    });
  }

  // --- Dynamic Credit Packages CRUD ---

  public async getPackages(activeOnly = true): Promise<CreditPackageRow[]> {
    if (!this.db) return [];
    if (activeOnly) {
      return executeQuery<CreditPackageRow>(
        this.db,
        'SELECT * FROM credit_packages WHERE is_active = 1 ORDER BY sort_order ASC'
      );
    }
    return executeQuery<CreditPackageRow>(
      this.db,
      'SELECT * FROM credit_packages ORDER BY sort_order ASC'
    );
  }

  public async getActivePackages(): Promise<CreditPackageRow[]> {
    return this.getPackages(true);
  }

  public async getPackageBySlug(slug: string): Promise<CreditPackageRow | null> {
    if (!this.db) return null;
    return fetchFirst<CreditPackageRow>(
      this.db,
      'SELECT * FROM credit_packages WHERE slug = ?',
      [slug]
    );
  }

  public async getPackageById(id: string): Promise<CreditPackageRow | null> {
    if (!this.db) return null;
    return fetchFirst<CreditPackageRow>(
      this.db,
      'SELECT * FROM credit_packages WHERE id = ?',
      [id]
    );
  }

  public async createPackage(data: {
    name: string;
    slug: string;
    description?: string;
    short_description?: string;
    price: number;
    currency?: string;
    credits: number;
    is_active?: number;
    is_featured?: number;
    sort_order?: number;
    lemon_squeezy_product_id?: string;
    lemon_squeezy_variant_id?: string;
  }): Promise<CreditPackageRow> {
    if (!this.db) throw new Error('Database unavailable');
    const id = `pkg_${crypto.randomUUID().slice(0, 8)}`;
    await executeMutation(
      this.db,
      `INSERT INTO credit_packages (
         id, name, slug, description, short_description, price, currency, credits, billing_type,
         lemon_squeezy_product_id, lemon_squeezy_variant_id, is_active, is_featured, sort_order, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'one_time', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        id,
        data.name,
        data.slug,
        data.description || null,
        data.short_description || null,
        data.price,
        data.currency || 'USD',
        data.credits,
        data.lemon_squeezy_product_id || null,
        data.lemon_squeezy_variant_id || null,
        data.is_active ?? 1,
        data.is_featured ?? 0,
        data.sort_order ?? 1
      ]
    );

    const pkg = await this.getPackageById(id);
    if (!pkg) throw new Error('Failed to create package');
    return pkg;
  }

  public async updatePackage(
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      short_description?: string;
      price?: number;
      currency?: string;
      credits?: number;
      is_active?: number;
      is_featured?: number;
      sort_order?: number;
      lemon_squeezy_product_id?: string;
      lemon_squeezy_variant_id?: string;
    }
  ): Promise<CreditPackageRow> {
    if (!this.db) throw new Error('Database unavailable');
    const existing = await this.getPackageById(id);
    if (!existing) throw new NotFoundError('Package not found');

    await executeMutation(
      this.db,
      `UPDATE credit_packages SET
         name = ?, slug = ?, description = ?, short_description = ?, price = ?, currency = ?,
         credits = ?, is_active = ?, is_featured = ?, sort_order = ?,
         lemon_squeezy_product_id = ?, lemon_squeezy_variant_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.name ?? existing.name,
        data.slug ?? existing.slug,
        data.description !== undefined ? data.description : existing.description,
        data.short_description !== undefined ? data.short_description : existing.short_description,
        data.price ?? existing.price,
        data.currency ?? existing.currency,
        data.credits ?? existing.credits,
        data.is_active ?? existing.is_active,
        data.is_featured ?? existing.is_featured,
        data.sort_order ?? existing.sort_order,
        data.lemon_squeezy_product_id !== undefined ? data.lemon_squeezy_product_id : existing.lemon_squeezy_product_id,
        data.lemon_squeezy_variant_id !== undefined ? data.lemon_squeezy_variant_id : existing.lemon_squeezy_variant_id,
        id
      ]
    );

    const updated = await this.getPackageById(id);
    if (!updated) throw new Error('Failed to retrieve updated package');
    return updated;
  }

  public async deletePackage(id: string): Promise<boolean> {
    if (!this.db) throw new Error('Database unavailable');
    await executeMutation(this.db, 'DELETE FROM credit_packages WHERE id = ?', [id]);
    return true;
  }

  /**
   * Retrieves configured AI Report Credit Cost dynamically (default 5)
   */
  public async getReportCreditCost(): Promise<number> {
    if (!this.db) return 5;
    const setting = await fetchFirst<{ value: string }>(
      this.db,
      "SELECT value FROM site_settings WHERE key = 'ai_report_credit_cost'"
    );
    const parsed = setting?.value ? parseInt(setting.value, 10) : 5;
    return isNaN(parsed) || parsed <= 0 ? 5 : parsed;
  }

  /**
   * Dynamically calculates how many reports a given number of credits can generate
   */
  public calculateReportsAvailable(credits: number, reportCost = 5): number {
    if (reportCost <= 0) return credits;
    return Math.floor(credits / reportCost);
  }
}
