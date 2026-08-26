import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { SystemHealthService } from '@/services/system/system-health.service';
import { TECHNICAL_CONFIG } from '@/config/technical';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const r2Bucket = env?.STORAGE;

  const healthService = new SystemHealthService(db);
  const healthReport = await healthService.getOverallHealth(r2Bucket);

  const isHealthy = healthReport.status !== 'unhealthy';

  const responseBody = {
    success: isHealthy,
    status: healthReport.status,
    version: TECHNICAL_CONFIG.version,
    environment: (env?.APP_ENV as string) || 'production',
    timestamp: new Date().toISOString(),
    checks: healthReport.checks.map((c) => ({
      service: c.service,
      status: c.status,
      latencyMs: c.latencyMs,
      message: c.message
    })),
    meta: {
      requestId: locals.requestId,
      timestamp: new Date().toISOString()
    }
  };

  return new Response(JSON.stringify(responseBody, null, 2), {
    status: isHealthy ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': TECHNICAL_CONFIG.cacheControl.apiNoCache
    }
  });
};
