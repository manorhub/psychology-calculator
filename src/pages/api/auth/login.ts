import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AuthService } from '@/services/auth.service';
import { setSessionCookie } from '@/lib/auth/cookies';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  guestSessionId: z.string().optional()
});

export const POST: APIRoute = async ({ request, cookies, locals, clientAddress }) => {
  try {
    const body = await request.json();
    const data = validateSchema(loginSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const authService = new AuthService(db);

    const guestSessionId = data.guestSessionId || cookies.get('mm_guest_id')?.value || request.headers.get('x-guest-session') || null;

    const result = await authService.login({
      email: data.email,
      password: data.password,
      ipAddress: clientAddress || request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
      guestSessionId
    });

    if (result.success && result.sessionToken) {
      const isProduction = env?.APP_ENV === 'production';
      setSessionCookie(cookies, result.sessionToken, isProduction);
    }

    const response: ApiResponse = {
      success: result.success,
      data: {
        user: result.user,
        requiresEmailVerification: result.requiresEmailVerification,
        message: result.message
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
