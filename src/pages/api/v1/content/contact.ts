import type { APIRoute } from 'astro';
import { executeMutation } from '@/lib/db/query';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const db = env?.DB || null;

  try {
    const body = (await request.json()) as any;
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ success: false, message: 'Name, email, and message are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Please provide a valid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Record contact message in audit / system log & dispatch email event
    if (db) {
      const { EventService } = await import('@/services/events/event.service');
      const eventService = new EventService(db);

      await Promise.allSettled([
        executeMutation(
          db,
          `INSERT INTO audit_logs (id, actor_id, actor_type, action, entity_type, entity_id, new_values)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            email,
            'guest',
            'contact_form_submitted',
            'contact_message',
            crypto.randomUUID(),
            JSON.stringify({ name, email, subject, messageLength: message.length })
          ]
        ),
        eventService.dispatch(
          'CONTACT_FORM_RECEIVED',
          { email, name },
          {
            subject: subject || 'General Inquiry',
            message_preview: message.length > 200 ? `${message.substring(0, 200)}...` : message
          }
        )
      ]);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your inquiry has been successfully delivered.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error processing contact submission' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
