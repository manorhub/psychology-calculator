import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AIService } from '@/services/ai/ai.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const saveConfigSchema = z.object({
  configId: z.string().min(1, 'Config ID is required'),
  model: z.string().min(1, 'Model name is required').optional(),
  priority: z.number().int().min(1).max(99).optional(),
  creditCost: z.number().int().min(0).max(999).optional(),
  isEnabled: z.boolean().optional(),
  apiKey: z.string().optional(),
  systemPrompt: z.string().optional()
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const body = await request.json();
    const data = validateSchema(saveConfigSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const aiService = new AIService(db, (env as any) || {});

    await aiService.updateProviderConfig(data.configId, data, adminUser.id);

    const response: ApiResponse = {
      success: true,
      data: { message: 'AI configuration and API credentials updated successfully' },
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
