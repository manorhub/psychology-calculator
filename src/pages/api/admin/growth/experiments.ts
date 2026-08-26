import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { ExperimentService } from '@/services/growth/experiment.service';
import { AuditService } from '@/services/audit.service';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const experimentService = new ExperimentService(db);
  const auditService = new AuditService(db);

  try {
    const body = (await request.json()) as any;
    const { action, experimentId, status, experimentData } = body;

    if (action === 'set_status') {
      if (!experimentId || !status) {
        return new Response(JSON.stringify({ success: false, error: { message: 'experimentId and status required' } }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await experimentService.setExperimentStatus(experimentId, status);

      await auditService.record({
        actorId: locals.user?.id || 'admin',
        action: 'admin_experiment_status_changed',
        entityType: 'experiment',
        entityId: experimentId,
        details: { status }
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'create') {
      const createdId = await experimentService.createExperiment(experimentData);

      await auditService.record({
        actorId: locals.user?.id || 'admin',
        action: 'admin_experiment_created',
        entityType: 'experiment',
        entityId: createdId,
        details: { slug: experimentData?.slug }
      });

      return new Response(JSON.stringify({ success: true, experimentId: createdId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: { message: 'Invalid action' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: { message: err?.message || 'Experiment operation failed' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
