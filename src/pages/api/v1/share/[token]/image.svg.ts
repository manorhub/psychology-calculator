import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { ShareService } from '@/services/share.service';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { token } = params;
    if (!token) {
      return new Response('Share token required', { status: 400 });
    }

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const shareService = new ShareService(db);

    const { share } = await shareService.getPublicShare(token);
    const svg = shareService.generateShareCardSvg(share);

    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630"><rect width="1200" height="630" fill="#090d16"/><text x="600" y="315" fill="#94a3b8" font-size="28" text-anchor="middle" font-family="sans-serif">PsychologyCalculator.com - Result Expired</text></svg>`,
      { status: 404, headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } }
    );
  }
};
