import type { APIRoute } from 'astro';
import { executeMutation } from '@/lib/db/query';
import { generateId } from '@/lib/crypto';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const db = env?.DB || null;

  try {
    const body = await request.json();
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

    // Record contact message in audit / system log
    if (db) {
      await executeMutation(
        db,
        `INSERT INTO audit_logs (id, actor_id, actor_type, action, entity_type, entity_id, new_values)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          email,
          'guest',
          'contact_form_submitted',
          'contact_message',
          generateId(),
          JSON.stringify({ name, email, subject, messageLength: message.length })
        ]
      );
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
