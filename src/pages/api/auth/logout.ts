import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AuthService } from '@/services/auth.service';
import { getSessionCookie, clearSessionCookie } from '@/lib/auth/cookies';

export const POST: APIRoute = async ({ cookies, locals, clientAddress }) => {
  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const authService = new AuthService(db);
  const sessionToken = getSessionCookie(cookies);

  if (sessionToken) {
    await authService.logout(sessionToken, locals.user?.id, clientAddress);
    clearSessionCookie(cookies);
  }

  const response: ApiResponse = {
    success: true,
    data: { message: 'Logged out successfully' },
    meta: {
      requestId: locals.requestId,
      timestamp: new Date().toISOString()
    }
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
