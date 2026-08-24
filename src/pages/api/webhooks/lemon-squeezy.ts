import type { APIRoute } from 'astro';
import { WebhookService } from '@/services/billing/webhook.service';
import { LemonSqueezyService } from '@/services/billing/lemon-squeezy.service';
import { formatErrorResponse, UnauthorizedError } from '@/lib/errors';
import { fetchFirst } from '@/lib/db/query';
import { logger } from '@/lib/logger';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB || null;

    // 1. Extract Signature Header
    const signature = request.headers.get('x-signature') || request.headers.get('X-Signature');
    if (!signature) {
      logger.warn('Lemon Squeezy webhook missing signature header');
      throw new UnauthorizedError('Missing X-Signature header');
    }

    // 2. Read Raw Text Body
    const rawBody = await request.text();

    // 3. Resolve Webhook Secret from D1 Settings
    const secretRow = db
      ? await fetchFirst<{ value: string }>(
          db,
          "SELECT value FROM site_settings WHERE key = 'lemon_squeezy_webhook_secret'"
        )
      : null;

    const webhookSecret = secretRow?.value || (env as any)?.LEMON_SQUEEZY_WEBHOOK_SECRET;

    const lsService = new LemonSqueezyService({
      webhookSecret
    });

    const webhookService = new WebhookService(db, lsService);
    const result = await webhookService.processWebhook(rawBody, signature);

    return new Response(
      JSON.stringify({
        success: true,
        status: result.status,
        eventId: result.eventId,
        eventName: result.eventName
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    const formatted = formatErrorResponse(error);
    logger.error('Webhook processing failed', undefined, error instanceof Error ? error : new Error(String(error)));
    return new Response(JSON.stringify(formatted.body), {
      status: formatted.statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
