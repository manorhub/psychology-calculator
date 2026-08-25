import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AIService } from '@/services/ai/ai.service';
import { formatErrorResponse, ValidationError, UnauthorizedError } from '@/lib/errors';

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const currentUser = locals.user;
    if (!currentUser) {
      throw new UnauthorizedError('Authentication required: Please sign in or create an account with credits to generate an AI narrative report.');
    }

    const body = (await request.json().catch(() => ({}))) as { attemptId?: string; configId?: string };
    const { attemptId, configId } = body;
    if (!attemptId) throw new ValidationError('attemptId is required');

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const aiService = new AIService(db, (env as any) || {});

    const guestSessionId = cookies.get('mm_guest_id')?.value || request.headers.get('x-guest-session') || null;

    const report = await aiService.generateReportForAttempt(
      attemptId,
      currentUser.id,
      guestSessionId,
      configId
    );

    const response: ApiResponse = {
      success: true,
      data: report,
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
