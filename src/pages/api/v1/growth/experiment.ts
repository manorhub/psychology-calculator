import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { ExperimentService } from '@/services/growth/experiment.service';

export const GET: APIRoute = async ({ request, locals, cookies }) => {
  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const experimentService = new ExperimentService(db);

  const url = new URL(request.url);
  const placement = url.searchParams.get('placement');

  if (!placement) {
    return new Response(JSON.stringify({ success: false, error: { message: 'placement query parameter is required' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const activeExp = await experimentService.getActiveExperimentForPlacement(placement);
  if (!activeExp) {
    return new Response(JSON.stringify({ success: true, active: false, experiment: null, variant: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const sessionId = cookies.get('session')?.value || null;

  const assignment = await experimentService.getOrAssignVariant(
    activeExp.id,
    locals.user?.id || null,
    sessionId
  );

  return new Response(
    JSON.stringify({
      success: true,
      active: true,
      experiment: {
        id: activeExp.id,
        name: activeExp.name,
        slug: activeExp.slug,
        primaryMetric: activeExp.primary_metric
      },
      variant: assignment ? {
        id: assignment.variant.id,
        key: assignment.variant.variant_key,
        name: assignment.variant.name,
        payload: assignment.parsedPayload
      } : null
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
