import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AssessmentBuilderService } from '@/services/assessment-builder.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const createAssessmentSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must be URL-safe'),
  category_id: z.string().min(1, 'Category is required'),
  short_description: z.string().min(10, 'Short description must be at least 10 characters'),
  long_description: z.string().optional(),
  instructions: z.string().optional(),
  completion_message: z.string().optional(),
  estimated_minutes: z.number().int().positive().optional().default(10),
  access_type: z.enum(['free', 'premium', 'credit_only']).optional().default('free'),
  featured: z.boolean().optional().default(false),
  disclaimer: z.string().optional(),
  display_order: z.number().int().optional().default(0),
  settings: z.record(z.unknown()).optional()
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const body = await request.json();
    const data = validateSchema(createAssessmentSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentBuilderService(db);

    const created = await service.createAssessment(data, adminUser.id);

    const response: ApiResponse = {
      success: true,
      data: created,
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(response), { status: 201, headers: { 'Content-Type': 'application/json' } });
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
