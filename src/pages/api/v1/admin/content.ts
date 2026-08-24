import type { APIRoute } from 'astro';
import { CmsService } from '@/services/content/cms.service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || (user.role !== 'admin' && (user.role as string) !== 'super_admin')) {
    return new Response(JSON.stringify({ success: false, message: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = locals.runtime?.env;
  const db = env?.DB || null;
  const cmsService = new CmsService(db);

  try {
    const body = (await request.json()) as any;
    const { entity, data } = body;

    if (!entity || !data) {
      return new Response(
        JSON.stringify({ success: false, message: 'Entity type and data payload required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (entity === 'author') {
      const id = await cmsService.upsertAuthor(data);
      return new Response(
        JSON.stringify({ success: true, id, message: 'Author saved successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (entity === 'category') {
      const id = await cmsService.upsertBlogCategory(data);
      return new Response(
        JSON.stringify({ success: true, id, message: 'Category saved successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (entity === 'page') {
      const id = await cmsService.upsertPage(data);
      return new Response(
        JSON.stringify({ success: true, id, message: 'Page saved successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (entity === 'cta') {
      const id = await cmsService.upsertContentCta(data);
      return new Response(
        JSON.stringify({ success: true, id, message: 'CTA saved successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: `Unsupported entity type: ${entity}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
