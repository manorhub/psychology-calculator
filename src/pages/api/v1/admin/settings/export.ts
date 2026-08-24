import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { SettingsService } from '@/services/settings/settings.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    requireAdmin(locals);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const settingsService = new SettingsService(db);

    const exportData = await settingsService.exportSanitizedConfig();
    const filename = `psychology-calculator-config-${new Date().toISOString().split('T')[0]}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    return new Response(JSON.stringify(body), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
