import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { SettingsService } from '@/services/settings/settings.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { ConfigExportPayload } from '@/types/database';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const admin = requireAdmin(locals);
    const body = (await request.json()) as ConfigExportPayload;

    if (!body || typeof body !== 'object' || !body.settings) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Invalid configuration file format' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const settingsService = new SettingsService(db);

    const result = await settingsService.validateAndImportConfig(body, admin.id);

    const response: ApiResponse<{ importedCount: number }> = {
      success: true,
      data: result,
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
