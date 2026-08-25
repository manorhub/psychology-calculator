import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/auth/guards';
import { AssessmentImportExportService } from '@/services/assessment-import-export.service';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    requireAdmin(locals);
    const service = new AssessmentImportExportService(null);
    const template = service.generateDemoTemplate();

    const jsonStr = JSON.stringify(template, null, 2);

    return new Response(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="assessment-demo-template-v1.0.json"'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: error.statusCode || 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
