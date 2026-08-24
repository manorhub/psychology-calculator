import type { APIRoute } from 'astro';
import { GoogleOAuthClient } from '@/lib/auth/google';

export const GET: APIRoute = ({ url, cookies }) => {
  const origin = url.origin;
  const redirectUri = `${origin}/auth/callback`;

  const client = new GoogleOAuthClient({ redirectUri });
  if (!client.isConfigured()) {
    return new Response('Google OAuth is not configured in this environment.', { status: 500 });
  }

  const { url: authUrl, state } = client.generateAuthUrl();

  // Store state in short-lived HTTP-only cookie for CSRF validation
  cookies.set('oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  });

  return new Response(null, {
    status: 302,
    headers: { Location: authUrl }
  });
};
