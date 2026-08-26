import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { IndexNowService } from '@/services/seo/indexnow.service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const user = locals.user;

  // Optional: check admin authorization if logged in user is making request
  if (user && user.role !== 'admin') {
    return new Response(
      JSON.stringify({ success: false, error: { message: 'Forbidden: Admin access required.' } }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const indexNowService = new IndexNowService(db);

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const host = body.host || new URL(request.url).hostname;
    let result;

    if (body.urls && Array.isArray(body.urls) && body.urls.length > 0) {
      result = await indexNowService.submitUrls(body.urls, host);
    } else {
      result = await indexNowService.submitEntireSite(host);
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        data: result
      }),
      {
        status: result.success ? 200 : result.statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: err?.message || 'Failed to process IndexNow submission.' }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
