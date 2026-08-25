import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/auth/guards';
import { AssessmentImportExportService } from '@/services/assessment-import-export.service';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    requireAdmin(locals);

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'template';

    const service = new AssessmentImportExportService(null);
    let csvContent = '';
    let fileName = 'assessment_template.csv';

    if (type === 'example') {
      csvContent = service.generateFullExampleCsv();
      fileName = 'full_example_assessments.csv';
    } else {
      csvContent = service.generateDemoCsvTemplate();
      fileName = 'assessment_template.csv';
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to download CSV template.' }),
      { status: err.statusCode || 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
