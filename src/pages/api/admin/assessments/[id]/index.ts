import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AssessmentBuilderService } from '@/services/assessment-builder.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse, ValidationError } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const updateAssessmentSchema = z.object({
  name: z.string().min(3).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  category_id: z.string().min(1).optional(),
  short_description: z.string().min(10).optional(),
  long_description: z.string().optional(),
  instructions: z.string().optional(),
  completion_message: z.string().optional(),
  estimated_minutes: z.number().int().positive().optional(),
  access_type: z.enum(['free', 'premium', 'credit_only']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  featured: z.boolean().optional(),
  disclaimer: z.string().optional(),
  display_order: z.number().int().optional(),
  settings: z.record(z.unknown()).optional()
});

export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const { id } = params;
    if (!id) throw new ValidationError('Assessment ID is required');

    const body = await request.json();
    const data = validateSchema(updateAssessmentSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentBuilderService(db);

    const updated = await service.updateAssessment(id, data, adminUser.id);

    const response: ApiResponse = {
      success: true,
      data: updated,
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

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const { id } = params;
    if (!id) throw new ValidationError('Assessment ID is required');

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentBuilderService(db);

    await service.deleteAssessment(id, adminUser.id);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Assessment deleted successfully' },
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
