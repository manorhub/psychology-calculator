import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/auth/guards';
import { getD1Database } from '@/lib/db/client';
import { AssessmentImportExportService } from '@/services/assessment-import-export.service';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const admin = requireAdmin(locals);
    const env = locals.runtime?.env;
    const db = getD1Database(env);

    const body = await request.json().catch(() => ({}));
    const csvContent = body.csv || body.content;
    const assessmentModes = body.assessmentModes || {};
    const customSlugs = body.customSlugs || {};
    const fileName = body.fileName || 'bulk_import.csv';

    if (!csvContent || typeof csvContent !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing CSV content for import.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const service = new AssessmentImportExportService(db);
    const result = await service.importCsvAssessments(csvContent, {
      assessmentModes,
      customSlugs,
      fileName,
      actorId: admin.id
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${result.results.length} assessment draft(s) from CSV.`,
        assessments: result.results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err.message || 'Failed to import assessments from CSV.'
      }),
      { status: err.statusCode || 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
