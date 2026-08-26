import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AssessmentBuilderService } from '@/services/assessment-builder.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse, ValidationError } from '@/lib/errors';

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const { id, questionId } = params;
    if (!id || !questionId) throw new ValidationError('Assessment ID and Question ID are required');

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentBuilderService(db);

    await service.deleteQuestion(id, questionId, adminUser.id);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Question deleted successfully' },
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
