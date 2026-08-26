import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { AssessmentTranslationService } from '@/services/assessment-translation.service';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized. Admin role required.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const assessmentId = url.searchParams.get('assessmentId');

  if (!assessmentId) {
    return new Response(JSON.stringify({ success: false, error: 'Missing assessmentId query parameter.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const service = new AssessmentTranslationService(db, env || {});

  try {
    const statusMap = await service.getTranslationStatusMap(assessmentId);
    return new Response(JSON.stringify({ success: true, data: statusMap }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Failed to fetch translation status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
