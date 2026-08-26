import type { APIRoute } from 'astro';
import { GoogleOAuthClient } from '@/lib/auth/google';
import { getD1Database } from '@/lib/db/client';
import { AuthService } from '@/services/auth.service';
import { setSessionCookie } from '@/lib/auth/cookies';
import { fetchFirst } from '@/lib/db/query';
import { logger } from '@/lib/logger';

export const GET: APIRoute = async ({ url, cookies, locals, clientAddress, request }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const storedState = cookies.get('oauth_state')?.value;
  const returnRedirect = cookies.get('oauth_redirect')?.value || '/dashboard';
  cookies.delete('oauth_state', { path: '/' });
  cookies.delete('oauth_redirect', { path: '/' });

  if (error) {
    logger.warn('Google OAuth provider returned error', { error });
    return new Response(null, {
      status: 302,
      headers: { Location: `/login?error=oauth_denied&redirect=${encodeURIComponent(returnRedirect)}` }
    });
  }

  // CSRF validation
  if (!state || !storedState || state !== storedState || !code) {
    logger.warn('Google OAuth state mismatch / invalid state');
    return new Response(null, {
      status: 302,
      headers: { Location: `/login?error=invalid_state&redirect=${encodeURIComponent(returnRedirect)}` }
    });
  }

  try {
    const origin = url.origin;
    const redirectUri = `${origin}/auth/callback`;

    const env = locals.runtime?.env as any;
    const db = getD1Database(env);

    let clientId = env?.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
    let clientSecret = env?.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';

    if ((!clientId || !clientSecret) && db) {
      const [clientIdRow, clientSecretRow] = await Promise.all([
        fetchFirst<{ value: string }>(db, "SELECT value FROM site_settings WHERE key = 'google_client_id'"),
        fetchFirst<{ value: string }>(db, "SELECT value FROM site_settings WHERE key = 'google_client_secret'")
      ]);
      if (clientIdRow?.value) clientId = clientIdRow.value;
      if (clientSecretRow?.value) clientSecret = clientSecretRow.value;
    }

    const googleClient = new GoogleOAuthClient({ clientId, clientSecret, redirectUri });
    const googleUser = await googleClient.exchangeCode(code);

    const authService = new AuthService(db);
    const guestSessionId = cookies.get('mm_guest_id')?.value || request.headers.get('x-guest-session') || null;

    const result = await authService.handleGoogleUser(
      googleUser,
      clientAddress,
      'Google-OAuth-Web',
      guestSessionId
    );

    if (result.success && result.sessionToken) {
      const isProduction = env?.APP_ENV === 'production' || url.protocol === 'https:';
      setSessionCookie(cookies, result.sessionToken, isProduction);
    }

    return new Response(null, {
      status: 302,
      headers: { Location: returnRedirect }
    });
  } catch (err) {
    logger.error('Google OAuth callback error', undefined, err instanceof Error ? err : new Error(String(err)));
    return new Response(null, {
      status: 302,
      headers: { Location: `/login?error=oauth_failed&redirect=${encodeURIComponent(returnRedirect)}` }
    });
  }
};
