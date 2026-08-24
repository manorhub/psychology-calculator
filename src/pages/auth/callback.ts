import type { APIRoute } from 'astro';
import { GoogleOAuthClient } from '@/lib/auth/google';
import { getD1Database } from '@/lib/db/client';
import { AuthService } from '@/services/auth.service';
import { setSessionCookie } from '@/lib/auth/cookies';
import { logger } from '@/lib/logger';

export const GET: APIRoute = async ({ url, cookies, locals, clientAddress }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const storedState = cookies.get('oauth_state')?.value;
  cookies.delete('oauth_state', { path: '/' });

  if (error) {
    logger.warn('Google OAuth provider returned error', { error });
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=oauth_denied' }
    });
  }

  // CSRF validation
  if (!state || !storedState || state !== storedState || !code) {
    logger.warn('Google OAuth state mismatch / invalid state');
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=invalid_state' }
    });
  }

  try {
    const origin = url.origin;
    const redirectUri = `${origin}/auth/callback`;
    const googleClient = new GoogleOAuthClient({ redirectUri });

    const googleUser = await googleClient.exchangeCode(code);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const authService = new AuthService(db);

    const result = await authService.handleGoogleUser(
      googleUser,
      clientAddress,
      'Google-OAuth-Web'
    );

    if (result.success && result.sessionToken) {
      const isProduction = env?.APP_ENV === 'production';
      setSessionCookie(cookies, result.sessionToken, isProduction);
    }

    return new Response(null, {
      status: 302,
      headers: { Location: '/dashboard' }
    });
  } catch (err) {
    logger.error('Google OAuth callback error', undefined, err instanceof Error ? err : new Error(String(err)));
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=oauth_failed' }
    });
  }
};
