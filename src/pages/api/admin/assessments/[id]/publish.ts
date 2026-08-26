import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AssessmentBuilderService } from '@/services/assessment-builder.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse, ValidationError } from '@/lib/errors';

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const { id } = params;
    if (!id) throw new ValidationError('Assessment ID is required');

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentBuilderService(db);

    const published = await service.publishAssessment(id, adminUser.id);

    const response: ApiResponse = {
      success: true,
      data: published,
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
