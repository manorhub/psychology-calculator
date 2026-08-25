import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/guards';
import { AssessmentImportExportService } from '@/services/assessment-import-export.service';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const user = requireAdmin(locals);
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Assessment ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const service = new AssessmentImportExportService(db);
    const exportData = await service.exportAssessment(id, user.id);

    const fileName = `assessment-${exportData.assessment.slug || id}-v1.0.json`;
    const jsonStr = JSON.stringify(exportData, null, 2);

    return new Response(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: error.statusCode || 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
