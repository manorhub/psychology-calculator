import type { APIRoute } from 'astro';
import { PlanService } from '@/services/billing/plan.service';
import { formatErrorResponse } from '@/lib/errors';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const env = locals.runtime?.env;
    const db = env?.DB || null;

    const planService = new PlanService(db);
    const plans = await planService.getActivePlans();

    return new Response(
      JSON.stringify({
        success: true,
        data: plans
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=300'
        }
      }
    );
  } catch (error) {
    const formatted = formatErrorResponse(error);
    return new Response(JSON.stringify(formatted.body), {
      status: formatted.statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
