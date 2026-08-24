import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import { fetchFirst } from '@/lib/db/query';
import type { CreditTransactionType } from '@/types/database';

export class CreditService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('CreditService');
    this.db = db;
  }

  /**
   * Retrieves the current credit balance for a user
   */
  public async getUserBalance(userId: string): Promise<{ balance: number }> {
    if (!this.db) return { balance: 0 };
    const row = await fetchFirst<{ balance: number }>(
      this.db,
      'SELECT balance FROM credit_balances WHERE user_id = ?',
      [userId]
    );
    return { balance: row?.balance ?? 0 };
  }

  /**
   * Spends credits for an action (e.g. AI report generation)
   */
  public async spendCredits(
    userId: string,
    amount: number,
    referenceId?: string,
    description?: string
  ): Promise<number> {
    if (!this.db) throw new Error('Database unavailable');
    const absAmount = Math.abs(amount);
    const txId = crypto.randomUUID();

    // Insert transaction
    await this.db
      .prepare(
        `INSERT INTO credit_transactions (
           id, user_id, amount, transaction_type, source, reference_id, metadata, created_at
         ) VALUES (?, ?, ?, 'ai_report_usage', 'ai_report_generation', ?, ?, CURRENT_TIMESTAMP)`
      )
      .bind(txId, userId, -absAmount, referenceId || null, JSON.stringify({ description }))
      .run();

    // Atomically decrement balance
    await this.db
      .prepare(
        `INSERT INTO credit_balances (user_id, balance, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           balance = credit_balances.balance - excluded.balance,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(userId, absAmount)
      .run();

    const updated = await this.getUserBalance(userId);
    return updated.balance;
  }

  /**
   * Grants or refunds credits
   */
  public async addCredits(
    userId: string,
    amount: number,
    type: CreditTransactionType = 'admin_adjustment',
    description?: string
  ): Promise<number> {
    if (!this.db) throw new Error('Database unavailable');
    const absAmount = Math.abs(amount);
    const txId = crypto.randomUUID();

    await this.db
      .prepare(
        `INSERT INTO credit_transactions (
           id, user_id, amount, transaction_type, source, metadata, created_at
         ) VALUES (?, ?, ?, ?, 'system_adjustment', ?, CURRENT_TIMESTAMP)`
      )
      .bind(txId, userId, absAmount, type, JSON.stringify({ description }))
      .run();

    await this.db
      .prepare(
        `INSERT INTO credit_balances (user_id, balance, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           balance = credit_balances.balance + excluded.balance,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(userId, absAmount)
      .run();

    const updated = await this.getUserBalance(userId);
    return updated.balance;
  }
}
