import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/auth/guards';
import { getD1Database } from '@/lib/db/client';
import { AssessmentImportExportService } from '@/services/assessment-import-export.service';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const admin = requireAdmin(locals);
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Assessment ID is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const env = locals.runtime?.env;
    const db = getD1Database(env);

    const service = new AssessmentImportExportService(db);
    const { csv, fileName } = await service.exportAssessmentToCsv(id, admin.id);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to export assessment as CSV.' }),
      { status: err.statusCode || 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
