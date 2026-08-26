import type { APIRoute } from 'astro';
import { PlanService } from '@/services/billing/plan.service';
import { LemonSqueezyService } from '@/services/billing/lemon-squeezy.service';
import { formatErrorResponse, UnauthorizedError, ValidationError, NotFoundError } from '@/lib/errors';
import { executeQuery } from '@/lib/db/query';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, url }) => {
  try {
    const user = locals.user;
    if (!user) {
      throw new UnauthorizedError('Authentication required to start subscription checkout');
    }

    const env = locals.runtime?.env;
    const db = env?.DB || null;

    // Check if Lemon Squeezy is enabled
    const settings = await executeQuery<{ key: string; value: string }>(
      db as any,
      'SELECT key, value FROM site_settings WHERE key IN (?, ?, ?, ?)',
      ['lemon_squeezy_enabled', 'lemon_squeezy_api_key', 'lemon_squeezy_store_id', 'lemon_squeezy_mode']
    );

    const configMap: Record<string, string> = {};
    for (const s of settings) {
      configMap[s.key] = s.value;
    }

    if (configMap.lemon_squeezy_enabled === 'false') {
      throw new ValidationError('Subscription purchases are currently paused for system maintenance');
    }

    const body = (await request.json().catch(() => ({}))) as {
      planId?: string;
      planSlug?: string;
    };

    const targetPlanId = body.planId;
    const targetPlanSlug = body.planSlug;

    if (!targetPlanId && !targetPlanSlug) {
      throw new ValidationError('Plan ID or Slug is required');
    }

    const planService = new PlanService(db);
    const plan = targetPlanId
      ? await planService.getPlanById(targetPlanId)
      : await planService.getPlanBySlug(targetPlanSlug!);

    if (!plan || plan.status !== 'active') {
      throw new NotFoundError('Selected subscription plan does not exist or is currently inactive');
    }

    if (plan.price === 0 || !plan.lemon_squeezy_variant_id) {
      // Free plan does not need checkout redirect
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            checkoutUrl: '/dashboard/subscription?status=activated&plan=free'
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const lsService = new LemonSqueezyService({
      apiKey: configMap.lemon_squeezy_api_key,
      storeId: configMap.lemon_squeezy_store_id,
      mode: (configMap.lemon_squeezy_mode as any) || 'test'
    });

    const origin = url.origin;
    const checkoutResult = await lsService.createCheckout({
      variantId: plan.lemon_squeezy_variant_id,
      userEmail: user.email,
      userName: user.profile?.displayName || undefined,
      userId: user.id,
      planId: plan.id,
      successUrl: `${origin}/dashboard/subscription?status=success`,
      cancelUrl: `${origin}/pricing?status=cancelled`
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: checkoutResult
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
