import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AssessmentCategoryService } from '@/services/assessment-category.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

export const prerender = false;

const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be URL-safe (lowercase letters, numbers, hyphens)').optional(),
  short_description: z.string().max(500).optional().nullable(),
  description: z.string().optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  image: z.string().max(500).optional().nullable(),
  status: z.enum(['active', 'draft', 'archived', 'inactive']).optional().default('active'),
  featured: z.boolean().or(z.number()).optional().default(false),
  sort_order: z.number().int().optional().default(0),
  display_order: z.number().int().optional(),
  seo_title: z.string().max(120).optional().nullable(),
  seo_description: z.string().max(300).optional().nullable(),
  canonical: z.string().max(500).optional().nullable(),
  og_title: z.string().max(120).optional().nullable(),
  og_description: z.string().max(300).optional().nullable(),
  og_image: z.string().max(500).optional().nullable()
});

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    requireAdmin(locals);

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const featuredOnly = url.searchParams.get('featured') === 'true';

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentCategoryService(db);

    const categories = await service.getCategories({ status, search, featuredOnly });

    const response: ApiResponse = {
      success: true,
      data: { categories }
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const body = await request.json();
    const data = validateSchema(createCategorySchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentCategoryService(db);

    const category = await service.createCategory(
      {
        ...data,
        display_order: data.sort_order ?? data.display_order ?? 0,
        featured: Boolean(data.featured)
      },
      adminUser.id
    );

    const response: ApiResponse = {
      success: true,
      data: { category },
      message: 'Category created successfully'
    };
    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
};
