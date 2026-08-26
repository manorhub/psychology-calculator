import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { SettingsService } from '@/services/settings/settings.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { SettingGroupName } from '@/types/database';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const admin = requireAdmin(locals);
    const body = await request.json();
    const { group, settings } = body as { group: SettingGroupName; settings: Record<string, any> };

    if (!group || !settings || typeof settings !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Invalid group or settings payload' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const settingsService = new SettingsService(db);

    await settingsService.setGroup(group, settings, admin.id);

    const response: ApiResponse<{ updated: boolean }> = {
      success: true,
      data: { updated: true },
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
