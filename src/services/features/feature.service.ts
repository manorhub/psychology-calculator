import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst, executeMutation } from '@/lib/db/query';
import type { FeatureFlagRow } from '@/types/database';
import { AuditService } from '../audit.service';
import { SettingsService } from '../settings/settings.service';

export class FeatureService extends BaseService {
  private readonly db: D1Database | null;
  private readonly auditService: AuditService;

  constructor(db?: D1Database | null, auditService?: AuditService) {
    super('FeatureService');
    this.db = db || null;
    this.auditService = auditService || new AuditService(db);
  }

  /**
   * Checks if a feature flag is currently active
   */
  public async isEnabled(key: string, defaultValue = true): Promise<boolean> {
    if (!this.db) return defaultValue;

    const row = await fetchFirst<FeatureFlagRow>(
      this.db,
      'SELECT is_enabled FROM feature_flags WHERE key = ?',
      [key]
    );

    if (!row) return defaultValue;
    return row.is_enabled === 1;
  }

  /**
   * Retrieves all feature flags for Admin view
   */
  public async getAll(): Promise<FeatureFlagRow[]> {
    if (!this.db) return [];
    return executeQuery<FeatureFlagRow>(
      this.db,
      'SELECT * FROM feature_flags ORDER BY key ASC'
    );
  }

  /**
   * Toggles a feature flag state
   */
  public async toggle(key: string, isEnabled: boolean, actorId?: string): Promise<void> {
    if (!this.db) return;

    await executeMutation(
      this.db,
      'UPDATE feature_flags SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      [isEnabled ? 1 : 0, key]
    );

    SettingsService.invalidateCache();

    if (actorId) {
      await this.auditService.record({
        actorId,
        actorRole: 'admin',
        action: 'feature_flag_toggled',
        entityType: 'feature_flag',
        entityId: key,
        details: { key, isEnabled }
      });
    }
  }

  /**
   * Upserts a feature flag definition
   */
  public async createOrUpdate(
    key: string,
    name: string,
    description: string,
    isEnabled = true,
    actorId?: string
  ): Promise<void> {
    if (!this.db) return;

    await executeMutation(
      this.db,
      `INSERT INTO feature_flags (key, name, description, is_enabled, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         is_enabled = excluded.is_enabled,
         updated_at = CURRENT_TIMESTAMP`,
      [key, name, description, isEnabled ? 1 : 0]
    );

    SettingsService.invalidateCache();

    if (actorId) {
      await this.auditService.record({
        actorId,
        actorRole: 'admin',
        action: 'feature_flag_saved',
        entityType: 'feature_flag',
        entityId: key,
        details: { key, name, isEnabled }
      });
    }
  }
}
