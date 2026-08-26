import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/auth/guards';
import { getD1Database } from '@/lib/db/client';
import { AssessmentImportExportService } from '@/services/assessment-import-export.service';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const admin = requireAdmin(locals);
    const env = locals.runtime?.env;
    const db = getD1Database(env);

    const contentType = request.headers.get('content-type') || '';
    let csvContent = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'No CSV file uploaded.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: 'CSV file exceeds 5MB size limit.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      csvContent = await file.text();
    } else {
      const body = await request.json().catch(() => ({}));
      csvContent = body.csv || body.content || '';
    }

    if (!csvContent || !csvContent.trim()) {
      return new Response(
        JSON.stringify({ error: 'CSV content is empty.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const service = new AssessmentImportExportService(db);
    const result = await service.validateCsv(csvContent);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err.message || 'Failed to validate CSV assessment.'
      }),
      { status: err.statusCode || 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
