import { defineMiddleware } from 'astro:middleware';
import { AuthService } from '@/services/auth.service';
import { RedirectService } from '@/services/seo/redirect.service';
import { getD1Database } from '@/lib/db/client';
import { getSecurityHeaders } from '@/lib/security';
import { getSessionCookie } from '@/lib/auth/cookies';
import { logger } from '@/lib/logger';
import {
  isValidLocale,
  stripLocaleFromPath,
  isNonLocalizedPath,
  type SupportedLocale
} from '@/i18n';
import { fetchFirst } from '@/lib/db/query';

export const onRequest = defineMiddleware(async (context, next) => {
  const start = performance.now();
  const requestId = crypto.randomUUID();
  const url = new URL(context.request.url);

  // 1. Session and Authentication Context
  const env = context.locals.runtime?.env;
  const db = getD1Database(env);
  const sessionKv = env?.SESSION;

  const authService = new AuthService(db, sessionKv);
  const sessionToken = getSessionCookie(context.cookies);

  let currentUser = null;
  let authContext = {
    isAuthenticated: false,
    isAdmin: false,
    user: null as any
  };

  if (sessionToken) {
    try {
      currentUser = await authService.validateSession(sessionToken);
      if (currentUser) {
        authContext = {
          isAuthenticated: true,
          isAdmin: currentUser.role === 'admin',
          user: currentUser
        };
      }
    } catch (err) {
      logger.error('Session validation error in middleware', undefined, err instanceof Error ? err : new Error(String(err)));
    }
  }

  // Inject into Astro locals for downstream SSR access
  context.locals.user = currentUser;
  context.locals.auth = authContext;
  context.locals.requestId = requestId;

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
            <title>Maintenance Mode | Psychology Calculator</title>
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
              <p>Psychology Calculator is currently undergoing scheduled platform maintenance. Please check back shortly.</p>
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

  // 3. Canonical Path Normalization & Legacy Route Corrections
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/_astro/')) {
    const search = url.search || '';

    // A. Trailing slash normalization: e.g. /pt/ -> /pt, /about/ -> /about
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      const cleanPath = url.pathname.replace(/\/+$/, '');
      return context.redirect(`${cleanPath}${search}`, 301);
    }

    // B. Legacy / Malformed mailto relative URL normalization
    if (url.pathname.includes('/mailto:') || url.pathname.startsWith('mailto:')) {
      const email = 'support@psychologycalculator.com';
      return new Response(null, {
        status: 302,
        headers: { Location: `mailto:${email}` }
      });
    }

    // C. Non-localized routes requested with language prefixes (e.g. /es/login -> /login, /pt/blog -> /blog, /de/dashboard/... -> /dashboard/...)
    const pathSegments = url.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0 && isValidLocale(pathSegments[0])) {
      const strippedPath = stripLocaleFromPath(url.pathname);
      if (isNonLocalizedPath(strippedPath)) {
        return context.redirect(`${strippedPath}${search}`, 301);
      }
    }

    // D. Legacy /p/{slug} and /{lang}/p/{slug} normalization (e.g. /es/p/about -> /es/about, /fr/p/disclaimer -> /disclaimer)
    const pMatch = url.pathname.match(/^(?:\/([a-z]{2}))?\/p\/([^/?#]+)$/i);
    if (pMatch) {
      const locale = pMatch[1];
      const pageSlug = pMatch[2].toLowerCase();
      const nonPrefixedPages = ['privacy-policy', 'terms-of-service', 'disclaimer', 'terms', 'privacy'];

      let targetSlug = pageSlug;
      if (pageSlug === 'terms') targetSlug = 'terms-of-service';
      if (pageSlug === 'privacy') targetSlug = 'privacy-policy';

      if (locale && isValidLocale(locale) && !nonPrefixedPages.includes(pageSlug)) {
        return context.redirect(`/${locale}/${targetSlug}${search}`, 301);
      }
      return context.redirect(`/${targetSlug}${search}`, 301);
    }

    // E. Short Category normalization (/categories/{slug} and /{lang}/categories/{slug})
    const catMatch = url.pathname.match(/^(?:\/([a-z]{2}))?\/categories\/([^/?#]+)$/i);
    if (catMatch) {
      const locale = catMatch[1];
      let catSlug = catMatch[2].toLowerCase();
      if (catSlug === 'relationships-attachment' || catSlug === 'cat_relationships') catSlug = 'relationships';
      if (catSlug === 'social-communication' || catSlug === 'cat_communication') catSlug = 'communication';
      if (catSlug === 'cat_personality') catSlug = 'personality';
      if (catSlug === 'cat_self_dev' || catSlug === 'cat_self_development') catSlug = 'self-development';
      if (catSlug === 'cat_eq' || catSlug === 'cat_emotional_intelligence') catSlug = 'emotional-intelligence';
      if (catSlug === 'cat_cognitive_style') catSlug = 'cognitive-style';
      if (catSlug === 'cat_mental_wellbeing') catSlug = 'mental-wellbeing';
      if (catSlug === 'cat_career' || catSlug === 'cat_career_work') catSlug = 'career-work';

      const target = (locale && isValidLocale(locale))
        ? `/${locale}/assessments/category/${catSlug}${search}`
        : `/assessments/category/${catSlug}${search}`;
      return context.redirect(target, 301);
    }

    // F. Assessment Category ID / Alias normalization (e.g. /assessments/category/cat_relationships -> /assessments/category/relationships)
    const asmCatIdMatch = url.pathname.match(/^(?:\/([a-z]{2}))?\/assessments\/category\/(cat_[^/?#]+)$/i);
    if (asmCatIdMatch) {
      const locale = asmCatIdMatch[1];
      const rawId = asmCatIdMatch[2].toLowerCase();
      const idToSlugMap: Record<string, string> = {
        'cat_relationships': 'relationships',
        'cat_personality': 'personality',
        'cat_communication': 'communication',
        'cat_self_dev': 'self-development',
        'cat_self_development': 'self-development',
        'cat_eq': 'emotional-intelligence',
        'cat_emotional_intelligence': 'emotional-intelligence',
        'cat_cognitive_style': 'cognitive-style',
        'cat_mental_wellbeing': 'mental-wellbeing',
        'cat_career': 'career-work',
        'cat_career_work': 'career-work'
      };
      const resolvedSlug = idToSlugMap[rawId] || rawId.replace(/^cat_/, '').replace(/_/g, '-');
      const target = (locale && isValidLocale(locale))
        ? `/${locale}/assessments/category/${resolvedSlug}${search}`
        : `/assessments/category/${resolvedSlug}${search}`;
      return context.redirect(target, 301);
    }

    // G. Specific assessment slug aliases
    if (url.pathname.includes('attachment-style-relationship-quiz')) {
      const clean = url.pathname.replace('attachment-style-relationship-quiz', 'attachment-style-test');
      return context.redirect(`${clean}${search}`, 301);
    }

    // H. Contact Us alias
    if (url.pathname === '/contact-us' || url.pathname.endsWith('/contact-us')) {
      const clean = url.pathname.replace(/\/contact-us$/, '/contact');
      return context.redirect(`${clean}${search}`, 301);
    }

    // I. Dynamic Database URL Redirect Resolution (with multi-language support)
    if (db) {
      try {
        const redirectService = new RedirectService(db);
        const redirectMatch = await redirectService.resolveRedirect(url.pathname);
        if (redirectMatch.found && redirectMatch.targetPath) {
          return context.redirect(redirectMatch.targetPath, (redirectMatch.statusCode as 301 | 302) || 301);
        }
      } catch {
        // Ignore redirect check error to avoid blocking request
      }
    }
  }

  // 4. Route Protection Rules

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
          <title>403 Forbidden | Psychology Calculator</title>
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

  // Rule C: Admin API routes (/api/admin/* and /api/v1/admin/*)
  if (url.pathname.startsWith('/api/admin') || url.pathname.startsWith('/api/v1/admin')) {
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
