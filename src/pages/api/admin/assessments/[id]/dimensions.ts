import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AssessmentBuilderService } from '@/services/assessment-builder.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse, ValidationError } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const dimensionsSchema = z.object({
  dimensions: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, 'Dimension name is required'),
      slug: z.string().min(1, 'Dimension slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be URL-safe'),
      description: z.string().optional(),
      display_order: z.number().int().optional(),
      status: z.enum(['active', 'inactive']).optional().default('active')
    })
  )
});

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const { id } = params;
    if (!id) throw new ValidationError('Assessment ID is required');

    const body = await request.json();
    const data = validateSchema(dimensionsSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentBuilderService(db);

    const saved = await service.saveDimensions(id, data.dimensions, adminUser.id);

    const response: ApiResponse = {
      success: true,
      data: saved,
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
