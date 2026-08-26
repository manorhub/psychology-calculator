import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AdminService } from '@/services/admin.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const adjustCreditsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number().int().refine((val) => val !== 0, {
    message: 'Amount must be non-zero'
  }),
  reason: z.string().max(255).optional().default('Admin credit adjustment')
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const body = await request.json();
    const data = validateSchema(adjustCreditsSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const adminService = new AdminService(db);

    const newBalance = await adminService.adjustUserCredits(
      data.userId,
      data.amount,
      data.reason,
      adminUser.id
    );

    const response: ApiResponse = {
      success: true,
      data: {
        newBalance,
        message: `Successfully ${data.amount > 0 ? 'added' : 'deducted'} ${Math.abs(data.amount)} credits. New balance: ${newBalance} credits.`
      },
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    const errorResponse: ApiResponse = {
      success: false,
      error: body,
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
