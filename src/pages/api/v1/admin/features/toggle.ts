import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { FeatureService } from '@/services/features/feature.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const admin = requireAdmin(locals);
    const body = await request.json();
    const { key, isEnabled } = body as { key: string; isEnabled: boolean };

    if (!key || typeof isEnabled !== 'boolean') {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Invalid key or isEnabled flag' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const featureService = new FeatureService(db);

    await featureService.toggle(key, isEnabled, admin.id);

    const response: ApiResponse<{ key: string; isEnabled: boolean }> = {
      success: true,
      data: { key, isEnabled },
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    return new Response(JSON.stringify(body), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
