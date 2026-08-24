import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AuthService } from '@/services/auth.service';
import { clearSessionCookie } from '@/lib/auth/cookies';
import { formatErrorResponse, UnauthorizedError } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const deleteAccountSchema = z.object({
  passwordConfirmation: z.string().min(1, 'Password confirmation is required')
});

export const POST: APIRoute = async ({ request, cookies, locals, clientAddress }) => {
  try {
    if (!locals.user) {
      throw new UnauthorizedError('You must be logged in to delete your account.');
    }

    const body = await request.json();
    const data = validateSchema(deleteAccountSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const authService = new AuthService(db);

    await authService.deleteAccount(
      locals.user.id,
      data.passwordConfirmation,
      clientAddress
    );

    clearSessionCookie(cookies);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Account deleted successfully.' },
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
