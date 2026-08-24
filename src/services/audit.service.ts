import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';

export interface RecordAuditParams {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('AuditService');
    this.db = db;
  }

  public async record(params: RecordAuditParams): Promise<void> {
    this.logger.info(`Audit: [${params.action}] on ${params.entityType}:${params.entityId || 'general'}`, {
      actorId: params.actorId,
      action: params.action
    });

    if (!this.db) {
      return;
    }

    try {
      const id = crypto.randomUUID();
      const detailsJson = params.details ? JSON.stringify(params.details) : null;

      await this.db
        .prepare(
          'INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
        )
        .bind(
          id,
          params.actorId || null,
          params.actorRole || null,
          params.action,
          params.entityType,
          params.entityId || null,
          detailsJson,
          params.ipAddress || null,
          params.userAgent || null
        )
        .run();
    } catch (error) {
      this.logger.error('Failed to write audit log to D1', undefined, error instanceof Error ? error : new Error(String(error)));
    }
  }
}
