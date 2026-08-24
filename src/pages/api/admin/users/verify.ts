import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AdminService } from '@/services/admin.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const verifySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  isVerified: z.boolean()
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const body = await request.json();
    const data = validateSchema(verifySchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const adminService = new AdminService(db);

    await adminService.setUserVerification(data.userId, data.isVerified, adminUser.id);

    const response: ApiResponse = {
      success: true,
      data: {
        message: data.isVerified
          ? 'Account successfully marked as verified by Administrator'
          : 'Account verification revoked by Administrator'
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
