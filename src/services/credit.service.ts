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
      const initialBalance = legacy?.balance ?? 0;
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
        type,
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
