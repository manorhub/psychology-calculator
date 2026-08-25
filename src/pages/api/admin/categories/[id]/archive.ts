import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AssessmentCategoryService } from '@/services/assessment-category.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';

export const prerender = false;

export const POST: APIRoute = async ({ params, locals }) => {
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

    const category = await service.archiveCategory(id, adminUser.id);

    const response: ApiResponse = {
      success: true,
      data: { category },
      message: `Category ${category.status === 'archived' ? 'archived' : 'restored to active'} successfully`
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
};
