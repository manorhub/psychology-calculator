import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst, executeMutation } from '@/lib/db/query';
import type {
  SettingGroupName,
  SiteSettingRow,
  PublicSiteSettings,
  LegalPageRow,
  ConfigExportPayload
} from '@/types/database';
import { ValidationError } from '@/lib/errors';
import { AuditService } from '../audit.service';

export class SettingsService extends BaseService {
  private readonly db: D1Database | null;
  private readonly auditService: AuditService;
  private static cache: Map<string, { value: any; expiresAt: number }> = new Map();
  private static readonly CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory TTL

  // Group definitions for settings categorizations
  public static readonly GROUP_KEYS: Record<SettingGroupName, string[]> = {
    general: [
      'site_name',
      'site_url',
      'tagline',
      'default_language',
      'default_timezone',
      'default_currency',
      'contact_email',
      'support_email'
    ],
    branding: [
      'logo_url',
      'favicon_url',
      'primary_color',
      'secondary_color',
      'accent_color',
      'theme_mode'
    ],
    homepage: [
      'hero_heading',
      'hero_description',
      'hero_cta_text',
      'hero_cta_url',
      'featured_assessments_enabled',
      'how_it_works_enabled',
      'how_it_works_steps',
      'homepage_faqs_enabled',
      'final_cta_heading',
      'final_cta_description',
      'final_cta_button_text',
      'final_cta_button_url'
    ],
    announcement: [
      'announcement_enabled',
      'announcement_message',
      'announcement_link_text',
      'announcement_link_url',
      'announcement_dismissible'
    ],
    maintenance: [
      'maintenance_mode',
      'maintenance_message',
      'maintenance_estimated_return'
    ],
    navigation: ['header_nav_links'],
    footer: ['footer_nav_columns'],
    social: ['social_links'],
    seo: [
      'seo_title_template',
      'seo_default_description',
      'seo_canonical_domain',
      'robots_custom_directives',
      'llms_txt_content'
    ],
    ai: [
      'ai_enabled',
      'default_ai_provider',
      'default_ai_model',
      'ai_max_tokens',
      'ai_temperature',
      'ai_credit_cost'
    ],
    billing: [
      'billing_enabled',
      'lemon_squeezy_store_id',
      'lemon_squeezy_api_key',
      'lemon_squeezy_webhook_secret'
    ],
    email: [
      'smtp_enabled',
      'smtp_host',
      'smtp_port',
      'smtp_username',
      'smtp_password',
      'smtp_security',
      'smtp_from_name',
      'smtp_from_email',
      'smtp_reply_to'
    ],
    analytics: [
      'ga4_measurement_id',
      'search_console_site_id',
      'analytics_retention_days',
      'analytics_timezone'
    ],
    pdf: ['pdf_brand_name', 'pdf_brand_domain', 'pdf_disclaimer'],
    assessments: [
      'guest_assessments_enabled',
      'guest_results_enabled',
      'guest_result_retention_days',
      'guest_ai_reports_enabled',
      'login_required_for_ai_reports',
      'login_required_for_pdf',
      'guest_rate_limit'
    ],
    users: [
      'registration_enabled',
      'guest_assessments_enabled',
      'email_verification_required'
    ],
    security: ['admin_session_timeout', 'rate_limiting_enabled']
  };

  public static readonly SECRET_KEYS = new Set([
    'smtp_password',
    'lemon_squeezy_api_key',
    'lemon_squeezy_webhook_secret',
    'session_secret'
  ]);

  constructor(db?: D1Database | null, auditService?: AuditService) {
    super('SettingsService');
    this.db = db || null;
    this.auditService = auditService || new AuditService(db || null);
  }

  /**
   * Clears in-memory settings cache
   */
  public static invalidateCache(): void {
    SettingsService.cache.clear();
  }

  /**
   * Retrieves single typed setting by key
   */
  public async get<T = string>(key: string, defaultValue: T): Promise<T> {
    const cached = SettingsService.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    if (!this.db) return defaultValue;

    const row = await fetchFirst<SiteSettingRow>(
      this.db,
      'SELECT * FROM site_settings WHERE key = ?',
      [key]
    );

    if (!row) return defaultValue;

    let parsed: any = row.value;
    if (row.type === 'boolean') parsed = row.value === 'true' || row.value === '1';
    else if (row.type === 'number') parsed = Number(row.value);
    else if (row.type === 'json') {
      try {
        parsed = JSON.parse(row.value);
      } catch {
        parsed = defaultValue;
      }
    }

    SettingsService.cache.set(key, {
      value: parsed,
      expiresAt: Date.now() + SettingsService.CACHE_TTL_MS
    });

    return parsed as T;
  }

  /**
   * Sets single setting with automatic audit logging and cache invalidation
   */
  public async set(
    key: string,
    value: any,
    options: { type?: 'string' | 'json' | 'number' | 'boolean'; isPublic?: boolean; description?: string } = {},
    actorId?: string
  ): Promise<void> {
    if (!this.db) return;

    let stringValue = String(value);
    let detectedType: 'string' | 'json' | 'number' | 'boolean' = options.type || 'string';

    if (typeof value === 'boolean') {
      stringValue = value ? 'true' : 'false';
      detectedType = 'boolean';
    } else if (typeof value === 'number') {
      stringValue = String(value);
      detectedType = 'number';
    } else if (typeof value === 'object' && value !== null) {
      stringValue = JSON.stringify(value);
      detectedType = 'json';
    }

    const isSecret = SettingsService.SECRET_KEYS.has(key);
    const isPublic = isSecret ? 0 : options.isPublic !== undefined ? (options.isPublic ? 1 : 0) : 1;

    await executeMutation(
      this.db,
      `INSERT INTO site_settings (key, value, type, is_public, description, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         type = excluded.type,
         is_public = excluded.is_public,
         description = COALESCE(excluded.description, site_settings.description),
         updated_at = CURRENT_TIMESTAMP`,
      [key, stringValue, detectedType, isPublic, options.description || null]
    );

    SettingsService.invalidateCache();

    if (actorId) {
      await this.auditService.record({
        actorId,
        actorRole: 'admin',
        action: 'setting_updated',
        entityType: 'setting',
        entityId: key,
        details: isSecret ? { key, masked: true } : { key, value: stringValue }
      });
    }
  }

  /**
   * Retrieves all settings in a functional group
   */
  public async getGroup(groupName: SettingGroupName): Promise<Record<string, any>> {
    const keys = SettingsService.GROUP_KEYS[groupName] || [];
    const result: Record<string, any> = {};

    for (const key of keys) {
      result[key] = await this.get(key, null);
      if (SettingsService.SECRET_KEYS.has(key) && result[key]) {
        result[key] = '••••••••';
      }
    }

    return result;
  }

  /**
   * Sets all settings in a group in bulk
   */
  public async setGroup(
    groupName: SettingGroupName,
    settings: Record<string, any>,
    actorId?: string
  ): Promise<void> {
    for (const [key, val] of Object.entries(settings)) {
      if (val === '••••••••') continue; // Do not overwrite secret with mask
      await this.set(key, val, {}, actorId);
    }
  }

  /**
   * Retrieves all settings for Admin control center view
   */
  public async getAllSettings(maskSecrets = true): Promise<Record<string, any>> {
    if (!this.db) return {};

    const rows = await executeQuery<SiteSettingRow>(this.db, 'SELECT * FROM site_settings');
    const result: Record<string, any> = {};

    for (const r of rows) {
      let val: any = r.value;
      if (r.type === 'boolean') val = r.value === 'true' || r.value === '1';
      else if (r.type === 'number') val = Number(r.value);
      else if (r.type === 'json') {
        try {
          val = JSON.parse(r.value);
        } catch {
          val = r.value;
        }
      }

      if (maskSecrets && SettingsService.SECRET_KEYS.has(r.key) && val) {
        val = '••••••••';
      }

      result[r.key] = val;
    }

    return result;
  }

  /**
   * Aggregates clean, safe public settings for frontend layout hydration
   */
  public async getPublicSettings(): Promise<PublicSiteSettings> {
    const [
      siteName,
      siteUrl,
      tagline,
      logoUrl,
      faviconUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      themeMode,
      annEnabled,
      annMessage,
      annLinkText,
      annLinkUrl,
      annDismissible,
      maintMode,
      maintMsg,
      maintReturn,
      headerLinks,
      footerColumns,
      socialLinks,
      heroHeading,
      heroDescription,
      heroCtaText,
      heroCtaUrl,
      featEnabled,
      howItWorksEnabled,
      howItWorksSteps,
      faqEnabled,
      finalHeading,
      finalDesc,
      finalBtnText,
      finalBtnUrl
    ] = await Promise.all([
      this.get('site_name', 'Psychology Calculator'),
      this.get('site_url', 'https://psychologycalculator.com'),
      this.get('tagline', 'Evidence-Based Psychometrics & Insights'),
      this.get('logo_url', '/images/logo.svg'),
      this.get('favicon_url', '/favicon.svg'),
      this.get('primary_color', '#4F46E5'),
      this.get('secondary_color', '#0D9488'),
      this.get('accent_color', '#F59E0B'),
      this.get<'light' | 'dark' | 'system'>('theme_mode', 'system'),
      this.get('announcement_enabled', false),
      this.get('announcement_message', ''),
      this.get('announcement_link_text', ''),
      this.get('announcement_link_url', ''),
      this.get('announcement_dismissible', true),
      this.get('maintenance_mode', false),
      this.get('maintenance_message', 'Under maintenance.'),
      this.get('maintenance_estimated_return', '1 hour'),
      this.get<any[]>('header_nav_links', []),
      this.get<any[]>('footer_nav_columns', []),
      this.get<Record<string, string>>('social_links', {}),
      this.get('hero_heading', 'Discover Your Mind Through Scientific Psychometrics'),
      this.get('hero_description', 'Take validated psychological evaluations.'),
      this.get('hero_cta_text', 'Explore Assessments'),
      this.get('hero_cta_url', '/assessments'),
      this.get('featured_assessments_enabled', true),
      this.get('how_it_works_enabled', true),
      this.get<any[]>('how_it_works_steps', []),
      this.get('homepage_faqs_enabled', true),
      this.get('final_cta_heading', 'Ready to Understand Yourself?'),
      this.get('final_cta_description', 'Join thousands taking psychological assessments.'),
      this.get('final_cta_button_text', 'Start Free Assessment'),
      this.get('final_cta_button_url', '/assessments/big-five-personality-test')
    ]);

    // Load active feature flags
    const featureRows = this.db
      ? await executeQuery<{ key: string; is_enabled: number }>(
          this.db,
          'SELECT key, is_enabled FROM feature_flags'
        )
      : [];

    const features: Record<string, boolean> = {};
    for (const f of featureRows) {
      features[f.key] = f.is_enabled === 1;
    }

    return {
      siteName,
      siteUrl,
      tagline,
      logoUrl,
      faviconUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      themeMode,
      announcement: {
        enabled: annEnabled,
        message: annMessage,
        linkText: annLinkText,
        linkUrl: annLinkUrl,
        dismissible: annDismissible
      },
      maintenance: {
        enabled: maintMode,
        message: maintMsg,
        estimatedReturn: maintReturn
      },
      navigation: {
        headerLinks: Array.isArray(headerLinks) ? headerLinks : [],
        footerColumns: Array.isArray(footerColumns) ? footerColumns : [],
        socialLinks: typeof socialLinks === 'object' && socialLinks !== null ? socialLinks : {}
      },
      homepage: {
        heroHeading,
        heroDescription,
        heroCtaText,
        heroCtaUrl,
        featuredAssessmentsEnabled: featEnabled,
        howItWorksEnabled,
        howItWorksSteps: Array.isArray(howItWorksSteps) ? howItWorksSteps : [],
        homepageFaqsEnabled: faqEnabled,
        finalCtaHeading: finalHeading,
        finalCtaDescription: finalDesc,
        finalCtaButtonText: finalBtnText,
        finalCtaButtonUrl: finalBtnUrl
      },
      features
    };
  }

  /**
   * Exports sanitized configuration payload (strictly excluding secrets)
   */
  public async exportSanitizedConfig(): Promise<ConfigExportPayload> {
    const rawSettings = await this.getAllSettings(false);
    const sanitizedSettings: Record<string, any> = {};

    for (const [k, v] of Object.entries(rawSettings)) {
      if (!SettingsService.SECRET_KEYS.has(k)) {
        sanitizedSettings[k] = v;
      }
    }

    const featureRows = this.db
      ? await executeQuery<{ key: string; is_enabled: number }>(this.db, 'SELECT key, is_enabled FROM feature_flags')
      : [];

    const featureFlags: Record<string, boolean> = {};
    for (const f of featureRows) {
      featureFlags[f.key] = f.is_enabled === 1;
    }

    const legalPages = await this.getLegalPages();

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      appName: 'Psychology Calculator',
      settings: sanitizedSettings,
      featureFlags,
      legalPages: legalPages.map((l) => ({
        slug: l.slug,
        title: l.title,
        content_markdown: l.content_markdown
      }))
    };
  }

  /**
   * Validates and imports sanitized configuration payload
   */
  public async validateAndImportConfig(
    payload: ConfigExportPayload,
    actorId?: string
  ): Promise<{ importedCount: number }> {
    if (!payload || typeof payload !== 'object' || !payload.settings) {
      throw new ValidationError('Invalid configuration import payload format');
    }

    let importedCount = 0;

    for (const [key, value] of Object.entries(payload.settings)) {
      if (SettingsService.SECRET_KEYS.has(key)) continue; // Never import secrets
      await this.set(key, value, {}, actorId);
      importedCount++;
    }

    if (payload.featureFlags && typeof payload.featureFlags === 'object') {
      for (const [key, isEnabled] of Object.entries(payload.featureFlags)) {
        if (this.db) {
          await executeMutation(
            this.db,
            'UPDATE feature_flags SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
            [isEnabled ? 1 : 0, key]
          );
        }
      }
    }

    if (Array.isArray(payload.legalPages)) {
      for (const l of payload.legalPages) {
        if (l.slug && l.title && l.content_markdown) {
          await this.upsertLegalPage(l.slug, l.title, l.content_markdown, true, actorId);
        }
      }
    }

    return { importedCount };
  }

  /**
   * Comprehensive full system backup covering all dynamic platform entities (Secrets strictly excluded)
   */
  public async exportFullSystemBackup(): Promise<
    ConfigExportPayload & { backupType?: string; entities?: Record<string, unknown> }
  > {
    const baseConfig = await this.exportSanitizedConfig();
    if (!this.db) return baseConfig;

    const [assessments, categories, faqs, prompts, plans, blogPosts] = await Promise.all([
      executeQuery(this.db, 'SELECT id, slug, name, short_description, category_id, status, featured FROM assessments'),
      executeQuery(this.db, 'SELECT id, slug, name, description, icon FROM assessment_categories'),
      executeQuery(this.db, 'SELECT id, question, answer, category, entity_type, entity_id FROM faqs'),
      executeQuery(this.db, 'SELECT id, name, slug, purpose, prompt_template, version FROM ai_prompts'),
      executeQuery(this.db, 'SELECT id, name, slug, price, currency, billing_interval, features FROM subscription_plans'),
      executeQuery(this.db, 'SELECT id, slug, title, excerpt, status FROM posts')
    ]);

    return {
      ...baseConfig,
      backupType: 'FULL_SYSTEM',
      entities: {
        assessments,
        categories,
        faqs,
        prompts,
        plans,
        blogPosts
      }
    };
  }

  /**
   * Legal Pages CRUD
   */
  public async getLegalPages(): Promise<LegalPageRow[]> {
    if (!this.db) return [];
    return executeQuery<LegalPageRow>(
      this.db,
      'SELECT * FROM legal_pages ORDER BY created_at ASC'
    );
  }

  public async getLegalPageBySlug(slug: string): Promise<LegalPageRow | null> {
    if (!this.db) return null;
    return fetchFirst<LegalPageRow>(
      this.db,
      'SELECT * FROM legal_pages WHERE slug = ?',
      [slug]
    );
  }

  public async upsertLegalPage(
    slug: string,
    title: string,
    contentMarkdown: string,
    isPublished = true,
    actorId?: string
  ): Promise<void> {
    if (!this.db) return;

    // Lightweight markdown to HTML parser for standard compliance
    const contentHtml = contentMarkdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/^(.+)$/gim, '<p>$1</p>');

    const id = `leg_${slug.replace(/-/g, '_')}`;

    await executeMutation(
      this.db,
      `INSERT INTO legal_pages (id, slug, title, content_markdown, content_html, is_published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(slug) DO UPDATE SET
         title = excluded.title,
         content_markdown = excluded.content_markdown,
         content_html = excluded.content_html,
         is_published = excluded.is_published,
         updated_at = CURRENT_TIMESTAMP`,
      [id, slug, title.trim(), contentMarkdown, contentHtml, isPublished ? 1 : 0]
    );

    if (actorId) {
      await this.auditService.record({
        actorId,
        actorRole: 'admin',
        action: 'legal_page_updated',
        entityType: 'legal_page',
        entityId: slug,
        details: { slug, title }
      });
    }
  }
}
