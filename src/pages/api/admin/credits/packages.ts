import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { CreditService } from '@/services/credit.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse, ValidationError } from '@/lib/errors';
import { z } from 'zod';

export const prerender = false;

const packageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Package name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  short_description: z.string().optional(),
  price: z.number().positive('Price must be greater than 0'),
  currency: z.string().default('USD'),
  credits: z.number().int().positive('Credits must be greater than 0'),
  is_active: z.number().int().min(0).max(1).default(1),
  is_featured: z.number().int().min(0).max(1).default(0),
  sort_order: z.number().int().default(1),
  lemon_squeezy_product_id: z.string().optional(),
  lemon_squeezy_variant_id: z.string().optional()
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    requireAdmin(locals);
    const body = await request.json();
    const data = packageSchema.parse(body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const creditService = new CreditService(db);

    const created = await creditService.createPackage(data);

    const response: ApiResponse = {
      success: true,
      data: created,
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    return new Response(JSON.stringify({ success: false, error: body }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    requireAdmin(locals);
    const body = await request.json();
    if (!body.id) throw new ValidationError('Package ID is required for updates');
    const data = packageSchema.parse(body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const creditService = new CreditService(db);

    const updated = await creditService.updatePackage(body.id, data);

    const response: ApiResponse = {
      success: true,
      data: updated,
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    return new Response(JSON.stringify({ success: false, error: body }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    requireAdmin(locals);
    const body = await request.json();
    if (!body.id) throw new ValidationError('Package ID is required for deletion');

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const creditService = new CreditService(db);

    await creditService.deletePackage(body.id);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Package deleted successfully' },
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    return new Response(JSON.stringify({ success: false, error: body }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
