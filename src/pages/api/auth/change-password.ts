import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AuthService } from '@/services/auth.service';
import { getSessionCookie } from '@/lib/auth/cookies';
import { formatErrorResponse, UnauthorizedError } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

export const POST: APIRoute = async ({ request, cookies, locals, clientAddress }) => {
  try {
    if (!locals.user) {
      throw new UnauthorizedError('You must be logged in to change your password.');
    }

    const body = await request.json();
    const data = validateSchema(changePasswordSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const authService = new AuthService(db);
    const sessionToken = getSessionCookie(cookies);

    await authService.changePassword(
      locals.user.id,
      data.currentPassword,
      data.newPassword,
      sessionToken,
      clientAddress
    );

    const response: ApiResponse = {
      success: true,
      data: { message: 'Password changed successfully!' },
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
