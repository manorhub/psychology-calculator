import type { APIRoute } from 'astro';
import { SeoService } from '@/services/seo/seo.service';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env;
  const db = env?.DB || null;

  const seoService = new SeoService(db);
  const sitemapXml = await seoService.generateSitemapXml();

  return new Response(sitemapXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400'
    }
  });
};
