import type { APIRoute } from 'astro';
import { MediaService } from '@/services/content/media.service';

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
  const bucket = (env?.R2_STORAGE as any) || null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const altText = (formData.get('alt_text') as string) || undefined;
    const caption = (formData.get('caption') as string) || undefined;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, message: 'No file uploaded' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const buffer = await file.arrayBuffer();
    const mediaService = new MediaService(db, bucket);

    const item = await mediaService.uploadMedia({
      filename: file.name,
      data: buffer,
      mimeType: file.type,
      altText,
      caption
    });

    return new Response(
      JSON.stringify({ success: true, item, message: 'Media uploaded successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || 'Media upload failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || (user.role !== 'admin' && (user.role as string) !== 'super_admin')) {
    return new Response(JSON.stringify({ success: false, message: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ success: false, message: 'Media ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = locals.runtime?.env;
  const db = env?.DB || null;
  const bucket = (env?.R2_STORAGE as any) || null;
  const mediaService = new MediaService(db, bucket);

  try {
    await mediaService.deleteMedia(id);
    return new Response(
      JSON.stringify({ success: true, message: 'Media deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || 'Media deletion failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
