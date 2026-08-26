import { defineMiddleware } from 'astro:middleware';
import { getSecurityHeaders } from '@/lib/security';
import { logger } from '@/lib/logger';
import { getD1Database } from '@/lib/db/client';
import { validateSessionToken } from '@/lib/auth/session';
import { getSessionCookie, clearSessionCookie } from '@/lib/auth/cookies';
import { AuthService } from '@/services/auth.service';
import { fetchFirst } from '@/lib/db/query';

export const onRequest = defineMiddleware(async (context, next) => {
  const requestId = crypto.randomUUID();
  context.locals.requestId = requestId;

  const url = new URL(context.request.url);
  const start = performance.now();

  // 0. Universal Domain Normalization & workers.dev / pages.dev Duplicate Prevention
  // Enforces 301 redirect for all non-preferred hosts to https://www.psychologycalculator.com
  const targetHost = 'www.psychologycalculator.com';
  const reqHost = (
    context.request.headers.get('x-forwarded-host') ||
    context.request.headers.get('host') ||
    url.hostname ||
    ''
  ).toLowerCase().split(':')[0];

  const isExcluded = url.pathname.startsWith('/api/health') || url.pathname.startsWith('/api/webhooks');

  if (
    !isExcluded &&
    reqHost &&
    reqHost !== 'localhost' &&
    reqHost !== '127.0.0.1' &&
    reqHost !== targetHost
  ) {
    const canonicalTarget = `https://${targetHost}${url.pathname}${url.search}`;
    return new Response(null, {
      status: 301,
      headers: {
        Location: canonicalTarget,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  }

  // 1. Resolve User Session from Cookie
  const env = context.locals.runtime?.env;
  const db = getD1Database(env);
  const sessionToken = getSessionCookie(context.cookies);

  let currentUser = null;
  if (db && sessionToken) {
    try {
      const validated = await validateSessionToken(db, sessionToken);
      if (validated) {
        currentUser = validated.user;
      } else {
        // Invalid or expired session cookie, clear it
        clearSessionCookie(context.cookies);
      }
    } catch (err) {
      logger.error('Session validation error in middleware', undefined, err instanceof Error ? err : new Error(String(err)));
    }
  }

  context.locals.user = currentUser;

  const authService = new AuthService(db);
  const authContext = authService.resolveAuthContext(currentUser);

  // 2. Global Maintenance Mode Check
  if (db) {
    try {
      const maintenanceSetting = await fetchFirst<{ value: string }>(
        db,
        "SELECT value FROM site_settings WHERE key = 'maintenance_mode'"
      );

      const isMaintenance = maintenanceSetting?.value === 'true';
      const isAdminOrAuth =
        authContext.isAdmin ||
        url.pathname.startsWith('/admin') ||
        url.pathname.startsWith('/login') ||
        url.pathname.startsWith('/auth') ||
        url.pathname.startsWith('/api/health');

      if (isMaintenance && !isAdminOrAuth) {
        return new Response(
          `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <title>Maintenance Mode | MindMetrics</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f8fafc; color: #0f172a; text-align: center; padding: 20px; }
              .card { background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px 32px; max-width: 480px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
              .icon { font-size: 40px; margin-bottom: 16px; display: inline-block; }
              h1 { font-size: 24px; font-weight: 800; margin: 0 0 12px 0; }
              p { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 24px 0; }
              .badge { display: inline-block; background-color: #fef3c7; color: #92400e; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">🛠️</div>
              <span class="badge">Scheduled Maintenance</span>
              <h1 style="margin-top: 16px;">We'll be right back</h1>
              <p>MindMetrics is currently undergoing scheduled platform maintenance. Please check back shortly.</p>
            </div>
          </body>
          </html>`,
          {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '300' }
          }
        );
      }
    } catch {
      // Ignore database transient error during maintenance check
    }
  }

  // 3. Route Protection Rules

  // Rule A: Authenticated user routes (/account, /dashboard)
  if (url.pathname.startsWith('/account') || url.pathname.startsWith('/dashboard')) {
    if (!authContext.isAuthenticated) {
      return context.redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
    }
    if (currentUser?.status === 'suspended') {
      return new Response('Your account is suspended. Please contact support.', { status: 403 });
    }
  }

  // Rule B: Admin UI routes (/admin/*)
  if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login')) {
    if (!authContext.isAuthenticated) {
      return context.redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
    }
    if (!authContext.isAdmin) {
      return new Response(
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>403 Forbidden | MindMetrics</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f8fafc; color: #0f172a; text-align: center; padding: 20px; }
            .card { background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px 32px; max-width: 480px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
            h1 { font-size: 24px; font-weight: 800; margin: 16px 0 8px 0; color: #e11d48; }
            p { font-size: 14px; color: #64748b; margin: 0 0 24px 0; }
            a { display: inline-block; background-color: #0f172a; color: white; padding: 10px 24px; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>403 Forbidden</h1>
            <p>Access Denied: You do not have administrator permissions to access this area.</p>
            <a href="/">Return to Homepage</a>
          </div>
        </body>
        </html>`,
        {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      );
    }
  }

  // Rule C: Admin API routes (/api/admin/*)
  if (url.pathname.startsWith('/api/admin')) {
    if (!authContext.isAuthenticated) {
      return new Response(JSON.stringify({ success: false, error: { message: 'Authentication required' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!authContext.isAdmin) {
      return new Response(JSON.stringify({ success: false, error: { message: 'Administrator privileges required' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 4. Execute Request
  const response = await next();

  const durationMs = Math.round(performance.now() - start);

  // 5. Inject Production Security Headers
  const securityHeaders = getSecurityHeaders();
  for (const [header, value] of Object.entries(securityHeaders)) {
    response.headers.set(header, value);
  }

  response.headers.set('X-Request-Id', requestId);

  // Log API / Auth / Admin requests
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/auth')) {
    logger.info(`HTTP ${context.request.method} ${url.pathname} [${response.status}] ${durationMs}ms`, {
      requestId,
      method: context.request.method,
      path: url.pathname,
      status: response.status,
      userId: currentUser?.id,
      durationMs
    });
  }

  return response;
});
