import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AuthService } from '@/services/auth.service';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  try {
    const body = await request.json();
    const data = validateSchema(resetPasswordSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const authService = new AuthService(db);

    await authService.resetPassword(
      data.token,
      data.password,
      clientAddress || request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')
    );

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Password reset successfully! You can now log in with your new password.'
      },
      meta: {
        requestId: locals.requestId,
        timestamp: new Date().toISOString()
      }
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
      meta: {
        requestId: locals.requestId,
        timestamp: new Date().toISOString()
      }
    };
    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
