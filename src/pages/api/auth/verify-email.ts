import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AuthService } from '@/services/auth.service';
import { formatErrorResponse, ValidationError } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const verifySchema = z.object({
  token: z.string().optional(),
  email: z.string().email().optional(),
  action: z.enum(['verify', 'resend']).default('verify')
});

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  try {
    const body = await request.json();
    const data = validateSchema(verifySchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const authService = new AuthService(db);

    if (data.action === 'resend') {
      if (!data.email) throw new ValidationError('Email is required to resend verification.');
      await authService.resendVerification(data.email, clientAddress);
      const response: ApiResponse = {
        success: true,
        data: { message: 'If an unverified account exists with that email, a new verification link was sent.' },
        meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
      };
      return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (!data.token) throw new ValidationError('Token is required for verification.');
    const verified = await authService.verifyEmail(data.token);

    if (!verified) {
      throw new ValidationError('Verification token is invalid or has expired.');
    }

    const response: ApiResponse = {
      success: true,
      data: { message: 'Email verified successfully! You can now log in.' },
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
