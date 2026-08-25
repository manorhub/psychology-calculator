import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/guards';
import { AssessmentImportExportService } from '@/services/assessment-import-export.service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = requireAdmin(locals);
    const env = locals.runtime?.env;
    const db = getD1Database(env);

    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let rawJson: any;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      rawJson = await request.json();
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return new Response(JSON.stringify({ success: false, error: 'No JSON file or payload provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const text = await file.text();
      try {
        rawJson = JSON.parse(text);
      } catch (parseErr: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid JSON format: Unable to parse file as valid JSON',
            details: parseErr.message
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const service = new AssessmentImportExportService(db);
    const validation = await service.validateJson(rawJson);

    return new Response(
      JSON.stringify({
        success: true,
        data: validation
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Validation request failed'
      }),
      {
        status: error.statusCode || (error.name === 'UnauthorizedError' ? 401 : error.name === 'ForbiddenError' ? 403 : 500),
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
