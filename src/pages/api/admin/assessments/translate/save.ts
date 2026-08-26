import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { AssessmentTranslationService } from '@/services/assessment-translation.service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized. Admin role required.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { assessmentId, targetLocale, translation, status } = body;
  if (!assessmentId || !targetLocale || !translation) {
    return new Response(JSON.stringify({ success: false, error: 'assessmentId, targetLocale, and translation payload are required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const service = new AssessmentTranslationService(db, env || {});

  try {
    const result = await service.saveTranslation(
      assessmentId,
      targetLocale,
      translation,
      status === 'draft' ? 'draft' : 'published',
      user.id
    );

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return new Response(JSON.stringify({ success: false, error: err.message || 'Failed to save translation' }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
