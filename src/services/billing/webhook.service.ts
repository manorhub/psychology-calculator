import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, executeMutation, fetchFirst } from '@/lib/db/query';
import { LemonSqueezyService } from './lemon-squeezy.service';
import { SubscriptionService } from './subscription.service';
import type { WebhookEventRow } from '@/types/database';
import { UnauthorizedError, ValidationError } from '@/lib/errors';

export class WebhookService extends BaseService {
  private readonly db: D1Database | null;
  private readonly lemonSqueezyService: LemonSqueezyService;
  private readonly subscriptionService: SubscriptionService;

  constructor(db: D1Database | null, lsService?: LemonSqueezyService) {
    super('WebhookService');
    this.db = db;
    this.lemonSqueezyService = lsService || new LemonSqueezyService();
    this.subscriptionService = new SubscriptionService(db, this.lemonSqueezyService);
  }

  /**
   * Ingests, cryptographically verifies, and idempotently processes Lemon Squeezy webhooks
   */
  public async processWebhook(
    rawBody: string,
    signatureHeader: string | null,
    overrideSecret?: string
  ): Promise<{ status: 'processed' | 'duplicate' | 'ignored'; eventId: string; eventName: string }> {
    if (!this.db) throw new Error('Database unavailable');

    // 1. Verify Cryptographic Signature
    const isValidSignature = await this.lemonSqueezyService.verifyWebhookSignature(
      rawBody,
      signatureHeader,
      overrideSecret
    );

    if (!isValidSignature) {
      this.logger.warn('Received unverified or forged Lemon Squeezy webhook');
      throw new UnauthorizedError('Invalid Lemon Squeezy webhook signature');
    }

    // 2. Parse JSON Payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new ValidationError('Malformed webhook JSON payload');
    }

    const eventName = payload.meta?.event_name || payload.event_name || 'unknown_event';
    const eventId = String(
      payload.meta?.webhook_id ||
      payload.data?.id ||
      `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    );

    this.logger.info('Processing verified webhook event', { eventName, eventId });

    // 3. Idempotency Check (Prevent duplicate execution)
    const existingEvent = await fetchFirst<WebhookEventRow>(
      this.db,
      'SELECT * FROM webhook_events WHERE event_id = ?',
      [eventId]
    );

    if (existingEvent && existingEvent.status === 'processed') {
      this.logger.info('Duplicate webhook event ignored (already processed)', { eventId, eventName });
      return { status: 'duplicate', eventId, eventName };
    }

    // 4. Record Pending Event
    const logId = existingEvent ? existingEvent.id : crypto.randomUUID();
    if (!existingEvent) {
      await executeMutation(
        this.db,
        `INSERT INTO webhook_events (
           id, event_id, event_name, provider, payload, status, created_at
         ) VALUES (?, ?, ?, 'lemon_squeezy', ?, 'pending', CURRENT_TIMESTAMP)`,
        [logId, eventId, eventName, rawBody]
      );
    }

    // 5. Dispatch Event Handling
    try {
      const data = payload.data || {};

      if (eventName.startsWith('subscription_')) {
        await this.subscriptionService.handleSubscriptionWebhookEvent(eventName, data);
      } else if (eventName.startsWith('order_')) {
        await this.subscriptionService.handleOrderWebhookEvent(eventName, data);
      } else {
        this.logger.info('Ignored unhandled event type', { eventName });
      }

      // Mark Event Processed
      await executeMutation(
        this.db,
        `UPDATE webhook_events SET status = 'processed', processed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [logId]
      );

      return { status: 'processed', eventId, eventName };
    } catch (err: any) {
      this.logger.error('Failed to process webhook event payload', { eventId, eventName }, err);
      await executeMutation(
        this.db,
        `UPDATE webhook_events SET status = 'failed', error_message = ? WHERE id = ?`,
        [err.message || 'Webhook processing failed', logId]
      );
      throw err;
    }
  }

  /**
   * Lists webhook logs for Admin audit inspection
   */
  public async listWebhookLogs(limit = 100): Promise<WebhookEventRow[]> {
    if (!this.db) return [];

    return executeQuery<WebhookEventRow>(
      this.db,
      'SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  }
}
