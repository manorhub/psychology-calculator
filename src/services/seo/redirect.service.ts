import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst, executeMutation } from '@/lib/db/query';
import type { RedirectRow } from '@/types/database';
import { ValidationError } from '@/lib/errors';

export interface RedirectResult {
  found: boolean;
  targetPath?: string;
  statusCode?: number;
}

export class RedirectService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('RedirectService');
    this.db = db;
  }

  /**
   * Normalizes URL path for consistent matching
   */
  public normalizePath(path: string): string {
    let clean = path.trim();
    if (!clean.startsWith('/')) clean = `/${clean}`;
    if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
    return clean;
  }

  /**
   * Resolves URL redirect with loop detection and multi-hop safety
   */
  public async resolveRedirect(requestPath: string): Promise<RedirectResult> {
    if (!this.db) return { found: false };

    const normalized = this.normalizePath(requestPath);
    let currentPath = normalized;
    let finalTarget: string | undefined;
    let finalStatus: number = 301;
    const visited = new Set<string>();

    // Traverse up to 4 hops to resolve chains while detecting loops
    for (let hop = 0; hop < 4; hop++) {
      if (visited.has(currentPath)) {
        this.logger.warn('Redirect loop detected', { path: requestPath, currentPath });
        return { found: false };
      }
      visited.add(currentPath);

      const redirect = await fetchFirst<RedirectRow>(
        this.db,
        'SELECT * FROM redirects WHERE old_path = ? AND is_active = 1',
        [currentPath]
      );

      if (!redirect) break;

      finalTarget = redirect.new_path;
      finalStatus = redirect.status_code;
      currentPath = this.normalizePath(redirect.new_path);

      // Increment hit count asynchronously
      executeMutation(this.db, 'UPDATE redirects SET hit_count = hit_count + 1 WHERE id = ?', [redirect.id]).catch(
        () => {}
      );
    }

    if (finalTarget && finalTarget !== normalized) {
      return {
        found: true,
        targetPath: finalTarget,
        statusCode: finalStatus
      };
    }

    return { found: false };
  }

  /**
   * Creates or updates a redirect with anti-loop validation
   */
  public async createRedirect(
    oldPath: string,
    newPath: string,
    statusCode: 301 | 302 = 301
  ): Promise<string> {
    if (!this.db) throw new Error('Database unavailable');

    const cleanOld = this.normalizePath(oldPath);
    const cleanNew = this.normalizePath(newPath);

    if (cleanOld === cleanNew) {
      throw new ValidationError('Source path and destination path cannot be identical (self-redirect)');
    }

    // Check if newPath redirects back to oldPath (direct circular loop)
    const reverse = await fetchFirst<RedirectRow>(
      this.db,
      'SELECT * FROM redirects WHERE old_path = ? AND is_active = 1',
      [cleanNew]
    );

    if (reverse && this.normalizePath(reverse.new_path) === cleanOld) {
      throw new ValidationError(`Redirect loop detected: "${cleanNew}" already redirects to "${cleanOld}"`);
    }

    const id = `red_${crypto.randomUUID().slice(0, 8)}`;
    await executeMutation(
      this.db,
      `INSERT INTO redirects (id, old_path, new_path, status_code, is_active, updated_at)
       VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(old_path) DO UPDATE SET
         new_path = excluded.new_path,
         status_code = excluded.status_code,
         is_active = 1,
         updated_at = CURRENT_TIMESTAMP`,
      [id, cleanOld, cleanNew, statusCode]
    );

    this.logger.info('Redirect created/updated', { oldPath: cleanOld, newPath: cleanNew, statusCode });
    return id;
  }

  /**
   * Retrieves all redirects for Admin ledger
   */
  public async getAllRedirects(): Promise<RedirectRow[]> {
    if (!this.db) return [];

    return executeQuery<RedirectRow>(
      this.db,
      'SELECT * FROM redirects ORDER BY created_at DESC'
    );
  }

  /**
   * Deletes a redirect rule
   */
  public async deleteRedirect(id: string): Promise<boolean> {
    if (!this.db) return false;

    await executeMutation(this.db, 'DELETE FROM redirects WHERE id = ?', [id]);
    return true;
  }
}
