import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AIService } from '@/services/ai/ai.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const toggleProviderSchema = z.object({
  configId: z.string().min(1, 'Config ID is required'),
  isEnabled: z.boolean()
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const body = await request.json();
    const data = validateSchema(toggleProviderSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const aiService = new AIService(db, (env as any) || {});

    await aiService.toggleProvider(data.configId, data.isEnabled, adminUser.id);

    const response: ApiResponse = {
      success: true,
      data: {
        message: data.isEnabled
          ? 'AI provider successfully enabled'
          : 'AI provider successfully disabled'
      },
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
