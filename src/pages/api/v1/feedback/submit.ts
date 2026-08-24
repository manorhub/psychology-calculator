import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { FeedbackService } from '@/services/growth/feedback.service';
import { ErrorMonitoringService } from '@/services/system/error-monitoring.service';
import { ValidationError } from '@/lib/errors';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const feedbackService = new FeedbackService(db);
  const errorMonitor = new ErrorMonitoringService(db);

  try {
    const body = (await request.json()) as any;
    const { entityType, entityId, rating, isHelpful, comment } = body;

    if (!entityType || !entityId) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'entityType and entityId are required' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ipAddress = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const sessionId = cookies.get('session')?.value || null;

    const result = await feedbackService.submitFeedback({
      entityType,
      entityId,
      userId: locals.user?.id || null,
      sessionId,
      rating: rating !== undefined ? Number(rating) : null,
      isHelpful: isHelpful !== undefined ? Boolean(isHelpful) : null,
      comment: comment || null,
      ipAddress
    });

    return new Response(JSON.stringify({ success: true, feedbackId: result.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return new Response(JSON.stringify({ success: false, error: { message: err.message } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const errorId = await errorMonitor.captureError({
      service: 'FeedbackAPI',
      errorType: 'FEEDBACK_SUBMISSION_ERROR',
      error: err,
      userId: locals.user?.id,
      path: '/api/v1/feedback/submit'
    });

    return new Response(
      JSON.stringify({ success: false, error: { message: 'Failed to submit feedback. Please try again.', errorId } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
