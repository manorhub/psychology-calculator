import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { AnalyticsService } from '@/services/analytics/analytics.service';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';
import type { ApiResponse } from '@/types/api';

export const prerender = false;

const trackEventSchema = z.object({
  eventName: z.string().min(1).max(100),
  sessionId: z.string().min(1).max(100),
  entityType: z.string().max(50).optional(),
  entityId: z.string().max(100).optional(),
  metadata: z.record(z.any()).optional()
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const data = validateSchema(trackEventSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const analyticsService = new AnalyticsService(db);

    const eventId = await analyticsService.track(
      data.eventName,
      {
        userId: locals.user?.id || null,
        sessionId: data.sessionId,
        entityType: data.entityType,
        entityId: data.entityId
      },
      data.metadata || {}
    );

    const response: ApiResponse<{ eventId: string }> = {
      success: true,
      data: { eventId },
      meta: {
        requestId: locals.requestId,
        timestamp: new Date().toISOString()
      }
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
