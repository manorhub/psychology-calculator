import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import type { PageRow, FaqRow, FeatureFlagRow, SeoMetadataRow, PageStatus } from '@/types/database';
import { executeQuery, fetchFirst } from '@/lib/db/query';

export class ContentService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('ContentService');
    this.db = db;
  }

  // --- Dynamic Pages ---

  public async getPages(status: PageStatus = 'published'): Promise<PageRow[]> {
    if (!this.db) return [];
    return executeQuery<PageRow>(
      this.db,
      'SELECT * FROM pages WHERE status = ? ORDER BY title ASC',
      [status]
    );
  }

  public async getPageBySlug(slug: string): Promise<PageRow | null> {
    if (!this.db) return null;
    return fetchFirst<PageRow>(
      this.db,
      "SELECT * FROM pages WHERE slug = ? AND status = 'published'",
      [slug]
    );
  }

  public async createPage(data: Omit<PageRow, 'created_at' | 'updated_at'>): Promise<PageRow> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        'INSERT INTO pages (id, title, slug, content, status, seo_title, seo_description, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .bind(data.id, data.title, data.slug, data.content, data.status, data.seo_title || null, data.seo_description || null, data.published_at || null)
      .run();

    const created = await this.getPageBySlug(data.slug);
    if (!created) throw new Error('Failed to retrieve created page');
    return created;
  }

  // --- FAQs ---

  public async getFaqs(options: { category?: string; entityType?: string; entityId?: string | null } = {}): Promise<FaqRow[]> {
    if (!this.db) return [];
    let query = "SELECT * FROM faqs WHERE status = 'active'";
    const params: unknown[] = [];

    if (options.category) {
      query += ' AND category = ?';
      params.push(options.category);
    }
    if (options.entityType) {
      query += ' AND entity_type = ?';
      params.push(options.entityType);
    }
    if (options.entityId !== undefined) {
      if (options.entityId === null) {
        query += ' AND entity_id IS NULL';
      } else {
        query += ' AND entity_id = ?';
        params.push(options.entityId);
      }
    }

    query += ' ORDER BY display_order ASC';
    return executeQuery<FaqRow>(this.db, query, params);
  }

  // --- Feature Flags ---

  public async getFeatureFlags(): Promise<Record<string, boolean>> {
    if (!this.db) return {};
    const rows = await executeQuery<FeatureFlagRow>(this.db, 'SELECT key, is_enabled FROM feature_flags');
    const flags: Record<string, boolean> = {};
    for (const row of rows) {
      flags[row.key] = row.is_enabled === 1;
    }
    return flags;
  }

  public async isFeatureEnabled(key: string, defaultValue = false): Promise<boolean> {
    if (!this.db) return defaultValue;
    const row = await fetchFirst<{ is_enabled: number }>(
      this.db,
      'SELECT is_enabled FROM feature_flags WHERE key = ?',
      [key]
    );
    return row ? row.is_enabled === 1 : defaultValue;
  }

  public async setFeatureFlag(key: string, isEnabled: boolean): Promise<void> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        'INSERT INTO feature_flags (key, name, is_enabled, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET is_enabled = excluded.is_enabled, updated_at = CURRENT_TIMESTAMP'
      )
      .bind(key, key, isEnabled ? 1 : 0)
      .run();
  }

  // --- SEO Metadata ---

  public async getSeoMetadata(pageType: string, entityId?: string | null): Promise<SeoMetadataRow | null> {
    if (!this.db) return null;
    if (entityId) {
      return fetchFirst<SeoMetadataRow>(
        this.db,
        'SELECT * FROM seo_metadata WHERE page_type = ? AND entity_id = ?',
        [pageType, entityId]
      );
    }
    return fetchFirst<SeoMetadataRow>(
      this.db,
      'SELECT * FROM seo_metadata WHERE page_type = ? AND entity_id IS NULL',
      [pageType]
    );
  }
}
