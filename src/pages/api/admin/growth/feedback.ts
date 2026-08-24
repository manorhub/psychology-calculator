import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { FeedbackService } from '@/services/growth/feedback.service';
import { AuditService } from '@/services/audit.service';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const feedbackService = new FeedbackService(db);
  const auditService = new AuditService(db);

  try {
    const body = (await request.json()) as any;
    const { feedbackId, status } = body;

    if (!feedbackId || !status) {
      return new Response(JSON.stringify({ success: false, error: { message: 'feedbackId and status required' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await feedbackService.updateFeedbackStatus(feedbackId, status);

    await auditService.record({
      actorId: locals.user?.id || 'admin',
      action: 'admin_feedback_status_updated',
      entityType: 'user_feedback',
      entityId: feedbackId,
      details: { status }
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: { message: err?.message || 'Failed to update feedback status' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
