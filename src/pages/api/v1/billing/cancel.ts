import type { APIRoute } from 'astro';
import { SubscriptionService } from '@/services/billing/subscription.service';
import { LemonSqueezyService } from '@/services/billing/lemon-squeezy.service';
import { formatErrorResponse, UnauthorizedError } from '@/lib/errors';
import { executeQuery } from '@/lib/db/query';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      throw new UnauthorizedError('Authentication required to cancel subscription');
    }

    const env = locals.runtime?.env;
    const db = env?.DB || null;

    const settings = await executeQuery<{ key: string; value: string }>(
      db as any,
      'SELECT key, value FROM site_settings WHERE key IN (?, ?)',
      ['lemon_squeezy_api_key', 'lemon_squeezy_store_id']
    );

    const configMap: Record<string, string> = {};
    for (const s of settings) {
      configMap[s.key] = s.value;
    }

    const lsService = new LemonSqueezyService({
      apiKey: configMap.lemon_squeezy_api_key,
      storeId: configMap.lemon_squeezy_store_id
    });

    const subscriptionService = new SubscriptionService(db, lsService);
    await subscriptionService.cancelUserSubscription(user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription has been scheduled for cancellation at the end of your billing cycle'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return new Response(JSON.stringify(formatted.body), {
      status: formatted.statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
