import type { D1Database } from '@cloudflare/workers-types';
import { logger } from '@/lib/logger';
import { InternalError } from '@/lib/errors';

/**
 * Executes a prepared query safely with error logging
 */
export async function executeQuery<T = unknown>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const stmt = db.prepare(query).bind(...params);
    const { results } = await stmt.all<T>();
    return results || [];
  } catch (error) {
    logger.error('Database query execution error', { query, paramsCount: params.length }, error instanceof Error ? error : new Error(String(error)));
    throw new InternalError('Database query execution failed');
  }
}

/**
 * Fetches a single row safely
 */
export async function fetchFirst<T = unknown>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T | null> {
  try {
    const stmt = db.prepare(query).bind(...params);
    return await stmt.first<T>();
  } catch (error) {
    logger.error('Database fetchFirst execution error', { query }, error instanceof Error ? error : new Error(String(error)));
    throw new InternalError('Database fetch failed');
  }
}

/**
 * Executes a mutation (INSERT, UPDATE, DELETE) safely
 */
export async function executeMutation(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<{ success: boolean; meta: Record<string, unknown> }> {
  try {
    const stmt = db.prepare(query).bind(...params);
    const result = await stmt.run();
    return {
      success: result.success,
      meta: (result.meta as Record<string, unknown>) || {}
    };
  } catch (error) {
    logger.error('Database mutation error', { query }, error instanceof Error ? error : new Error(String(error)));
    throw new InternalError('Database mutation failed');
  }
}
