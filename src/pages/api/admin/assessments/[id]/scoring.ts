import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AssessmentBuilderService } from '@/services/assessment-builder.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse, ValidationError } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const scoringRulesSchema = z.object({
  rules: z.array(
    z.object({
      id: z.string().optional(),
      question_id: z.string().min(1, 'Question ID is required'),
      dimension_id: z.string().min(1, 'Dimension ID is required'),
      option_id: z.string().nullable().optional(),
      score: z.number(),
      weight: z.number().optional().default(1.0),
      reverse_scoring: z.boolean().optional().default(false)
    })
  )
});

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const { id } = params;
    if (!id) throw new ValidationError('Assessment ID is required');

    const body = await request.json();
    const data = validateSchema(scoringRulesSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentBuilderService(db);

    await service.saveScoringRules(id, data.rules, adminUser.id);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Scoring rules saved successfully' },
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
