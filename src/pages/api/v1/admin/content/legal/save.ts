import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { SettingsService } from '@/services/settings/settings.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const admin = requireAdmin(locals);
    const body = await request.json();
    const { slug, title, content_markdown, is_published } = body as {
      slug: string;
      title: string;
      content_markdown: string;
      is_published?: boolean;
    };

    if (!slug || !title || !content_markdown) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Missing required legal document fields' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const settingsService = new SettingsService(db);

    await settingsService.upsertLegalPage(slug, title, content_markdown, is_published !== false, admin.id);

    const response: ApiResponse<{ slug: string; saved: boolean }> = {
      success: true,
      data: { slug, saved: true },
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    return new Response(JSON.stringify(body), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
