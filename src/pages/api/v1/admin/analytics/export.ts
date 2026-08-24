import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { AnalyticsService } from '@/services/analytics/analytics.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import type { AnalyticsRange } from '@/types/database';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    requireAdmin(locals);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const analyticsService = new AnalyticsService(db);

    const url = new URL(request.url);
    const type = (url.searchParams.get('type') as any) || 'assessments';
    const range = (url.searchParams.get('range') as AnalyticsRange) || '30d';

    const csvContent = await analyticsService.exportCsv(type, range);
    const filename = `psychology_calculator_${type}_${range}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
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
