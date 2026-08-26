import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { DashboardService } from '@/services/dashboard.service';
import { formatErrorResponse, UnauthorizedError } from '@/lib/errors';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const currentUser = locals.user;
    if (!currentUser) throw new UnauthorizedError('Authentication required');

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const dashboardService = new DashboardService(db);

    const overview = await dashboardService.getDashboardOverview(currentUser.id);

    const response: ApiResponse = {
      success: true,
      data: overview,
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    const errorResponse: ApiResponse = {
      success: false,
      error: body,
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(errorResponse), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
  }
};
