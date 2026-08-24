import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AssessmentRuntimeService } from '@/services/assessment-runtime.service';
import { formatErrorResponse, ValidationError } from '@/lib/errors';

export const POST: APIRoute = async ({ params, cookies, locals, request }) => {
  try {
    const { id } = params;
    if (!id) throw new ValidationError('Assessment ID is required');

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const runtimeService = new AssessmentRuntimeService(db);

    const currentUser = locals.user;
    let guestSessionId: string | null = null;

    if (!currentUser) {
      guestSessionId = cookies.get('mm_guest_id')?.value || request.headers.get('x-guest-session') || null;
      if (!guestSessionId) {
        guestSessionId = crypto.randomUUID();
        cookies.set('mm_guest_id', guestSessionId, {
          path: '/',
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 // 30 days
        });
      }
    }

    const { attempt, isResumed } = await runtimeService.startOrResumeAttempt(
      id,
      currentUser?.id || null,
      guestSessionId
    );

    const response: ApiResponse = {
      success: true,
      data: {
        attemptId: attempt.id,
        assessmentId: attempt.assessment_id,
        status: attempt.status,
        isResumed
      },
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };

    return new Response(JSON.stringify(response), {
      status: isResumed ? 200 : 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    const errorResponse: ApiResponse = {
      success: false,
      error: body,
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
