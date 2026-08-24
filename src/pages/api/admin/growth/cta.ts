import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { GrowthService } from '@/services/growth/growth.service';
import { AuditService } from '@/services/audit.service';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const growthService = new GrowthService(db);
  const auditService = new AuditService(db);

  try {
    const body = (await request.json()) as any;
    const { slug, placement, title, description, button_text, button_url, position, is_enabled } = body;

    if (!slug || !placement || !title || !button_text || !button_url) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Missing required CTA fields' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ctaId = await growthService.upsertCtaPlacement({
      slug,
      placement,
      title,
      description,
      button_text,
      button_url,
      position,
      is_enabled: Boolean(is_enabled)
    });

    await auditService.record({
      actorId: locals.user?.id || 'admin',
      action: 'admin_cta_updated',
      entityType: 'cta_placement',
      entityId: ctaId,
      details: { slug, placement, is_enabled }
    });

    return new Response(JSON.stringify({ success: true, ctaId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: { message: err?.message || 'Failed to update CTA' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
