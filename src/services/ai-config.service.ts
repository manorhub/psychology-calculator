import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import type { AiConfigurationRow, AiPromptRow, AiProvider } from '@/types/database';
import { executeQuery, fetchFirst } from '@/lib/db/query';

export class AiConfigService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('AiConfigService');
    this.db = db;
  }

  public async getConfigurations(enabledOnly = true): Promise<AiConfigurationRow[]> {
    if (!this.db) return [];
    let query = 'SELECT * FROM ai_configurations';
    if (enabledOnly) {
      query += ' WHERE is_enabled = 1';
    }
    query += ' ORDER BY priority ASC';
    return executeQuery<AiConfigurationRow>(this.db, query);
  }

  public async getActiveConfiguration(provider?: AiProvider): Promise<AiConfigurationRow | null> {
    if (!this.db) return null;
    if (provider) {
      return fetchFirst<AiConfigurationRow>(
        this.db,
        'SELECT * FROM ai_configurations WHERE provider = ? AND is_enabled = 1 ORDER BY priority ASC',
        [provider]
      );
    }
    return fetchFirst<AiConfigurationRow>(
      this.db,
      'SELECT * FROM ai_configurations WHERE is_enabled = 1 ORDER BY priority ASC'
    );
  }

  public async getPrompts(status: string = 'active'): Promise<AiPromptRow[]> {
    if (!this.db) return [];
    return executeQuery<AiPromptRow>(
      this.db,
      'SELECT * FROM ai_prompts WHERE status = ? ORDER BY name ASC',
      [status]
    );
  }

  public async getPromptBySlug(slug: string): Promise<AiPromptRow | null> {
    if (!this.db) return null;
    return fetchFirst<AiPromptRow>(
      this.db,
      "SELECT * FROM ai_prompts WHERE slug = ? AND status = 'active'",
      [slug]
    );
  }

  public async getPromptByPurpose(purpose: string): Promise<AiPromptRow | null> {
    if (!this.db) return null;
    return fetchFirst<AiPromptRow>(
      this.db,
      "SELECT * FROM ai_prompts WHERE purpose = ? AND status = 'active' ORDER BY version DESC",
      [purpose]
    );
  }
}
