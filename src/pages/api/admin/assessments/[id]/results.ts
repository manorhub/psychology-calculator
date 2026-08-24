import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AssessmentBuilderService } from '@/services/assessment-builder.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse, ValidationError } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const resultTypesSchema = z.object({
  resultTypes: z.array(
    z.object({
      id: z.string().optional(),
      dimension_id: z.string().nullable().optional(),
      name: z.string().min(1, 'Result type name is required'),
      slug: z.string().min(1, 'Result type slug is required').regex(/^[a-z0-9-]+$/),
      description: z.string().optional(),
      minimum_score: z.number().default(0),
      maximum_score: z.number().default(100),
      display_order: z.number().int().optional(),
      status: z.enum(['active', 'inactive']).optional().default('active'),
      contents: z
        .array(
          z.object({
            id: z.string().optional(),
            section_type: z.enum([
              'overview',
              'strengths',
              'challenges',
              'communication',
              'relationships',
              'work_style',
              'growth_suggestions',
              'recommendations',
              'custom'
            ]),
            title: z.string().min(1, 'Section title is required'),
            content: z.string().min(1, 'Section content is required'),
            display_order: z.number().int().optional()
          })
        )
        .optional()
    })
  )
});

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const { id } = params;
    if (!id) throw new ValidationError('Assessment ID is required');

    const body = await request.json();
    const data = validateSchema(resultTypesSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentBuilderService(db);

    const saved = await service.saveResultTypes(id, data.resultTypes, adminUser.id);

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
