import type { APIRoute } from 'astro';
import { GoogleOAuthClient } from '@/lib/auth/google';
import { getD1Database } from '@/lib/db/client';
import { fetchFirst } from '@/lib/db/query';

export const GET: APIRoute = async ({ url, cookies, locals }) => {
  const origin = url.origin;
  const redirectUri = `${origin}/auth/callback`;

  // Get credentials from runtime env or site_settings
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

  const client = new GoogleOAuthClient({ clientId, clientSecret, redirectUri });

  // Get custom return redirect URL (e.g., /results/123 or /dashboard)
  const returnUrl = url.searchParams.get('redirect') || '/dashboard';
  cookies.set('oauth_redirect', returnUrl, {
    path: '/',
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  });

  if (!client.isConfigured()) {
    return new Response(
      `<!DOCTYPE html><html lang="en"><head><title>Google OAuth Setup Required</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://cdn.tailwindcss.com"></head><body class="bg-slate-50 min-h-screen flex items-center justify-center p-4 font-sans"><div class="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-5 text-center"><div class="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold shadow-sm">⚠️</div><div class="space-y-1.5"><h2 class="text-xl font-black text-slate-900">Google OAuth Setup Required</h2><p class="text-xs text-slate-600 leading-relaxed">Google Authentication is ready on the frontend, but requires Google Cloud API keys in Cloudflare Worker configuration.</p></div><div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs text-slate-700 space-y-2"><p class="font-bold text-slate-900">Required Environment Secrets:</p><ul class="list-disc pl-4 space-y-1 font-mono text-[11px] text-teal-700"><li>GOOGLE_CLIENT_ID</li><li>GOOGLE_CLIENT_SECRET</li></ul><p class="text-[11px] text-slate-500 pt-1">Authorized redirect URI in Google Cloud Console:</p><code class="block bg-white p-2 rounded-xl border border-slate-200 font-mono text-[10px] break-all select-all">${origin}/auth/callback</code></div><div class="pt-2 flex flex-col gap-2"><a href="${returnUrl}" class="w-full py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors">Return to Previous Page</a><a href="/login" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors">Use Email / Password Login</a></div></div></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
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
