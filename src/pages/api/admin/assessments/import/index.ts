import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/guards';
import { AssessmentImportExportService, type AssessmentExportSchema, type ImportOptions } from '@/services/assessment-import-export.service';

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

    const body = await request.json();
    const { payload, mode = 'create_new', newSlug, fileName = 'assessment.json' } = body;

    if (!payload) {
      return new Response(JSON.stringify({ success: false, error: 'Missing import payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const service = new AssessmentImportExportService(db);
    const options: ImportOptions = {
      mode: mode as any,
      newSlug,
      fileName,
      actorId: user.id
    };

    const result = await service.importAssessment(payload as AssessmentExportSchema, options);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        message: `Assessment "${payload.assessment?.name || 'Import'}" imported successfully as draft.`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Import execution failed'
      }),
      {
        status: error.statusCode || (error.name === 'UnauthorizedError' ? 401 : error.name === 'ForbiddenError' ? 403 : 500),
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
