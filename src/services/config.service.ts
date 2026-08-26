import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import type { DynamicSiteConfig } from '@/types/config';
import type { SiteSettingRow, FeatureFlagRow } from '@/types/database';
import { DEFAULT_DYNAMIC_CONFIG } from '@/config/dynamic';
import { executeQuery } from '@/lib/db/query';

export class ConfigService extends BaseService {
  private static cachedConfig: DynamicSiteConfig | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly TTL_MS = 60 * 1000; // 1 minute in-memory cache

  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('ConfigService');
    this.db = db;
  }

  /**
   * Retrieves the dynamic site configuration merged from D1 database with defaults
   */
  public async getSiteConfig(forceRefresh = false): Promise<DynamicSiteConfig> {
    const now = Date.now();
    if (!forceRefresh && ConfigService.cachedConfig && now - ConfigService.cacheTimestamp < ConfigService.TTL_MS) {
      return ConfigService.cachedConfig;
    }

    if (!this.db) {
      return DEFAULT_DYNAMIC_CONFIG;
    }

    try {
      // 1. Fetch site settings
      const settingRows = await executeQuery<SiteSettingRow>(
        this.db,
        'SELECT key, value, type, is_public FROM site_settings WHERE is_public = 1'
      );

      // 2. Fetch feature flags
      const flagRows = await executeQuery<FeatureFlagRow>(
        this.db,
        'SELECT key, is_enabled FROM feature_flags'
      );

      const dynamicOverrides: Partial<DynamicSiteConfig> = {};

      for (const row of settingRows) {
        try {
          if (row.key === 'site_name') dynamicOverrides.siteName = row.value;
          if (row.key === 'site_tagline') dynamicOverrides.siteTagline = row.value;
          if (row.key === 'site_description') dynamicOverrides.siteDescription = row.value;
          if (row.key === 'disclaimer_text') dynamicOverrides.disclaimerText = row.value;
          if (row.key === 'contact_email') dynamicOverrides.contactEmail = row.value;
          if (row.key === 'header_navigation' && row.type === 'json') {
            dynamicOverrides.headerNavigation = JSON.parse(row.value);
          }
          if (row.key === 'footer_sections' && row.type === 'json') {
            dynamicOverrides.footerSections = JSON.parse(row.value);
          }
        } catch (parseError) {
          this.logger.warn(`Failed to parse site setting key: ${row.key}`, undefined, parseError instanceof Error ? parseError : new Error(String(parseError)));
        }
      }

      // Merge feature flags
      const dynamicFeatures = { ...DEFAULT_DYNAMIC_CONFIG.features };
      for (const flag of flagRows) {
        if (flag.key === 'ai_reports') dynamicFeatures.enableAiReports = flag.is_enabled === 1;
        if (flag.key === 'guest_assessments') dynamicFeatures.enableGuestAssessments = flag.is_enabled === 1;
        if (flag.key === 'social_sharing') dynamicFeatures.enableSocialShare = flag.is_enabled === 1;
        if (flag.key === 'maintenance_mode') dynamicFeatures.maintenanceMode = flag.is_enabled === 1;
      }

      const mergedConfig: DynamicSiteConfig = {
        ...DEFAULT_DYNAMIC_CONFIG,
        ...dynamicOverrides,
        features: dynamicFeatures
      };

      ConfigService.cachedConfig = mergedConfig;
      ConfigService.cacheTimestamp = now;

      return mergedConfig;
    } catch (error) {
      this.logger.error('Failed to load dynamic site settings from D1, using defaults', undefined, error instanceof Error ? error : new Error(String(error)));
      return DEFAULT_DYNAMIC_CONFIG;
    }
  }

  /**
   * Updates a dynamic setting key in D1
   */
  public async setSetting(key: string, value: string, type: 'string' | 'json' | 'number' | 'boolean' = 'string', isPublic = 1): Promise<void> {
    if (!this.db) {
      throw new Error('Database is not available to persist setting');
    }

    await this.db
      .prepare(
        'INSERT INTO site_settings (key, value, type, is_public, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, type = excluded.type, is_public = excluded.is_public, updated_at = CURRENT_TIMESTAMP'
      )
      .bind(key, value, type, isPublic)
      .run();

    // Invalidate cache
    ConfigService.cachedConfig = null;
    this.logger.info(`Updated setting: ${key}`);
  }
}
