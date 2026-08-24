import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { EmailService } from '@/services/email.service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, message: 'Forbidden: Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const emailService = new EmailService(db);

  try {
    const body = (await request.json()) as any;
    const { action, template } = body;

    if (action === 'upsert') {
      if (!template) {
        return new Response(JSON.stringify({ success: false, message: 'Template payload required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const id = await emailService.upsertTemplate(template);
      return new Response(
        JSON.stringify({ success: true, message: 'Email template saved successfully', id }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: false, message: `Unknown action: ${action}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
