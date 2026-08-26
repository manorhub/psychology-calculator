import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AdminService } from '@/services/admin.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const toggleSchema = z.object({
  key: z.string().min(1, 'Feature flag key is required'),
  isEnabled: z.boolean()
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const body = await request.json();
    const data = validateSchema(toggleSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const adminService = new AdminService(db);

    await adminService.toggleFeatureFlag(data.key, data.isEnabled, adminUser.id);

    const response: ApiResponse = {
      success: true,
      data: { message: `Feature flag '${data.key}' set to ${data.isEnabled}` },
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
