import type { APIRoute } from 'astro';
import { BlogService } from '@/services/content/blog.service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const authContext = locals.auth;
  if (!authContext?.isAuthenticated || authContext.user?.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, message: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = locals.runtime?.env;
  const db = env?.DB || null;
  const blogService = new BlogService(db);

  try {
    const body = await request.json();
    const { action, post, id } = body;

    if (action === 'create' || action === 'update') {
      if (!post) {
        return new Response(
          JSON.stringify({ success: false, message: 'Post data payload required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const savedId = await blogService.upsertPost(post);
      return new Response(
        JSON.stringify({ success: true, id: savedId, message: 'Article saved successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'duplicate') {
      if (!id) {
        return new Response(
          JSON.stringify({ success: false, message: 'Post ID required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const newId = await blogService.duplicatePost(id);
      return new Response(
        JSON.stringify({ success: true, newId, message: 'Article duplicated' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      if (!id) {
        return new Response(
          JSON.stringify({ success: false, message: 'Post ID required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      await blogService.deletePost(id);
      return new Response(
        JSON.stringify({ success: true, message: 'Article deleted' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: `Unknown action: ${action}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
