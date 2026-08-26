import type { D1Database } from '@cloudflare/workers-types';
import type { Env } from '@/types/env';
import { logger } from '@/lib/logger';

export function getD1Database(env?: Env): D1Database | null {
  if (env?.DB) {
    return env.DB;
  }

  // Check globalThis if bound in Cloudflare Worker environment
  const globalEnv = globalThis as unknown as { DB?: D1Database };
  if (globalEnv.DB) {
    return globalEnv.DB;
  }

  return null;
}

export async function checkD1Health(db: D1Database | null): Promise<{ status: 'connected' | 'disconnected' | 'mock'; latencyMs?: number }> {
  if (!db) {
    return { status: 'mock' };
  }

  const start = performance.now();
  try {
    const result = await db.prepare('SELECT 1 as health').first<{ health: number }>();
    const latencyMs = Math.round(performance.now() - start);
    return {
      status: result?.health === 1 ? 'connected' : 'disconnected',
      latencyMs
    };
  } catch (error) {
    logger.error('D1 health check query failed', undefined, error instanceof Error ? error : new Error(String(error)));
    return { status: 'disconnected' };
  }
}
