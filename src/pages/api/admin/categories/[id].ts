import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AssessmentCategoryService } from '@/services/assessment-category.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

export const prerender = false;

const updateCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be URL-safe (lowercase letters, numbers, hyphens)').optional(),
  short_description: z.string().max(500).optional().nullable(),
  description: z.string().optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  image: z.string().max(500).optional().nullable(),
  status: z.enum(['active', 'draft', 'archived', 'inactive']).optional(),
  featured: z.boolean().or(z.number()).optional(),
  sort_order: z.number().int().optional(),
  display_order: z.number().int().optional(),
  seo_title: z.string().max(120).optional().nullable(),
  seo_description: z.string().max(300).optional().nullable(),
  canonical: z.string().max(500).optional().nullable(),
  og_title: z.string().max(120).optional().nullable(),
  og_description: z.string().max(300).optional().nullable(),
  og_image: z.string().max(500).optional().nullable()
});

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    requireAdmin(locals);
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Category ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentCategoryService(db);

    const category = await service.getCategoryById(id);
    if (!category) {
      return new Response(JSON.stringify({ success: false, error: 'Category not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response: ApiResponse = {
      success: true,
      data: { category }
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Category ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const data = validateSchema(updateCategorySchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentCategoryService(db);

    const category = await service.updateCategory(
      id,
      {
        ...data,
        display_order: data.sort_order ?? data.display_order,
        featured: data.featured !== undefined ? Boolean(data.featured) : undefined
      },
      adminUser.id
    );

    const response: ApiResponse = {
      success: true,
      data: { category },
      message: 'Category updated successfully'
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const adminUser = requireAdmin(locals);
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Category ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const service = new AssessmentCategoryService(db);

    await service.deleteCategory(id, adminUser.id);

    const response: ApiResponse = {
      success: true,
      message: 'Category deleted successfully'
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
};
