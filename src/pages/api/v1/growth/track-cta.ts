import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { GrowthService } from '@/services/growth/growth.service';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const growthService = new GrowthService(db);

  try {
    const body = (await request.json()) as any;
    const { ctaSlug, eventType, metadata } = body;

    if (!ctaSlug || !eventType) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'ctaSlug and eventType are required' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sessionId = cookies.get('session')?.value || null;

    await growthService.trackCtaEvent(
      ctaSlug,
      eventType,
      locals.user?.id || null,
      sessionId,
      metadata
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: { message: 'Failed to record CTA event' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
