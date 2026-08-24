import type { APIRoute } from 'astro';
import { RedirectService } from '@/services/seo/redirect.service';
import { formatErrorResponse, UnauthorizedError, ValidationError } from '@/lib/errors';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user;
    if (!user || (user.role !== 'admin' && (user.role as string) !== 'super_admin')) {
      throw new UnauthorizedError('Admin permissions required');
    }

    const env = locals.runtime?.env;
    const db = env?.DB || null;

    const redirectService = new RedirectService(db);
    const redirects = await redirectService.getAllRedirects();

    return new Response(JSON.stringify({ success: true, data: redirects }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return new Response(JSON.stringify(formatted.body), {
      status: formatted.statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user || (user.role !== 'admin' && (user.role as string) !== 'super_admin')) {
      throw new UnauthorizedError('Admin permissions required');
    }

    const env = locals.runtime?.env;
    const db = env?.DB || null;

    const body = (await request.json().catch(() => ({}))) as {
      oldPath?: string;
      newPath?: string;
      statusCode?: number;
    };

    if (!body.oldPath || !body.newPath) {
      throw new ValidationError('Source path and destination path are required');
    }

    const redirectService = new RedirectService(db);
    const id = await redirectService.createRedirect(
      body.oldPath,
      body.newPath,
      (body.statusCode as any) || 301
    );

    return new Response(JSON.stringify({ success: true, data: { id } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return new Response(JSON.stringify(formatted.body), {
      status: formatted.statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user || (user.role !== 'admin' && (user.role as string) !== 'super_admin')) {
      throw new UnauthorizedError('Admin permissions required');
    }

    const env = locals.runtime?.env;
    const db = env?.DB || null;

    const body = (await request.json().catch(() => ({}))) as { id?: string };
    if (!body.id) {
      throw new ValidationError('Redirect ID is required for deletion');
    }

    const redirectService = new RedirectService(db);
    await redirectService.deleteRedirect(body.id);

    return new Response(JSON.stringify({ success: true, message: 'Redirect rule deleted' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return new Response(JSON.stringify(formatted.body), {
      status: formatted.statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
