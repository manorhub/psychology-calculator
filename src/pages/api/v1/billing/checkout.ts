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
      packageId?: string;
      packageSlug?: string;
      planId?: string;
      planSlug?: string;
    };

    const targetPkgId = body.packageId || body.planId;
    const targetPkgSlug = body.packageSlug || body.planSlug;

    const { CreditService } = await import('@/services/credit.service');
    const creditService = new CreditService(db as any);

    let creditPkg = targetPkgId
      ? await creditService.getPackageById(targetPkgId)
      : targetPkgSlug
      ? await creditService.getPackageBySlug(targetPkgSlug)
      : null;

    if (!creditPkg) {
      const activePackages = await creditService.getPackages(true);
      creditPkg = activePackages[0] || null;
    }

    if (!creditPkg) {
      throw new NotFoundError('Selected credit package does not exist or is currently inactive');
    }

    const lsService = new LemonSqueezyService({
      apiKey: configMap.lemon_squeezy_api_key,
      storeId: configMap.lemon_squeezy_store_id,
      mode: (configMap.lemon_squeezy_mode as any) || 'test'
    });

    const origin = url.origin;
    const variantId = creditPkg.lemon_squeezy_variant_id || 'var_credits_20';

    const checkoutResult = await lsService.createCheckout({
      variantId,
      userEmail: user.email,
      userName: user.profile?.displayName || undefined,
      userId: user.id,
      planId: creditPkg.id,
      successUrl: `${origin}/dashboard/credits?status=success`,
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
