import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { ResultService } from '@/services/result.service';
import { formatErrorResponse, ValidationError } from '@/lib/errors';

export const GET: APIRoute = async ({ params, cookies, locals, request, url }) => {
  try {
    const { id } = params;
    if (!id) throw new ValidationError('Attempt ID is required');

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const resultService = new ResultService(db);

    const currentUser = locals.user;
    const guestSessionId = cookies.get('mm_guest_id')?.value || request.headers.get('x-guest-session') || null;
    const shareToken = url.searchParams.get('token');

    const result = await resultService.getResult(
      id,
      currentUser?.id || null,
      guestSessionId,
      shareToken
    );

    const response: ApiResponse = {
      success: true,
      data: result,
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
