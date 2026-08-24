import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AuthService } from '@/services/auth.service';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  try {
    const body = await request.json();
    const data = validateSchema(forgotPasswordSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const authService = new AuthService(db);

    await authService.requestPasswordReset(
      data.email,
      clientAddress || request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')
    );

    // Uniform message preventing email enumeration
    const response: ApiResponse = {
      success: true,
      data: {
        message: 'If an account matches that email, we have sent a password reset link.'
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
