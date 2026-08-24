import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import type {
  SeoMetadataRow,
  PageMetadata,
  BreadcrumbItem,
  AssessmentRow,
  AssessmentCategoryRow,
  PageRow
} from '@/types/database';

export interface SeoSettings {
  siteTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  canonicalDomain: string;
  defaultRobots: string;
  defaultOgImage: string;
  twitterHandle: string;
  orgName: string;
  orgLogo: string;
  gscVerification: string;
  bingVerification: string;
  ga4MeasurementId: string;
}

export interface SeoAuditIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'metadata' | 'canonical' | 'indexation' | 'links' | 'schema';
  message: string;
  entityType?: string;
  entityId?: string;
  url?: string;
}

export class SeoService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('SeoService');
    this.db = db;
  }

  /**
   * Retrieves global dynamic SEO settings from site_settings store
   */
  public async getSeoSettings(): Promise<SeoSettings> {
    const defaults: SeoSettings = {
      siteTitle: 'Psychology Calculator',
      titleTemplate: '{{page_title}} | Psychology Calculator',
      defaultDescription: 'Scientifically validated psychological assessments, personality evaluations, and deep psychometric interpretations.',
      canonicalDomain: 'https://psychologycalculator.com',
      defaultRobots: 'index, follow',
      defaultOgImage: '/images/og-default.png',
      twitterHandle: '@PsychCalculator',
      orgName: 'Psychology Calculator',
      orgLogo: '/images/logo.png',
      gscVerification: '',
      bingVerification: '',
      ga4MeasurementId: ''
    };

    if (!this.db) return defaults;

    try {
      const rows = await executeQuery<{ key: string; value: string }>(
        this.db,
        `SELECT key, value FROM site_settings WHERE key LIKE 'seo_%'`
      );

      const map = new Map(rows.map((r) => [r.key, r.value]));

      return {
        siteTitle: map.get('seo_site_title') || defaults.siteTitle,
        titleTemplate: map.get('seo_title_template') || defaults.titleTemplate,
        defaultDescription: map.get('seo_default_description') || defaults.defaultDescription,
        canonicalDomain: (map.get('seo_canonical_domain') || defaults.canonicalDomain).replace(/\/+$/, ''),
        defaultRobots: map.get('seo_default_robots') || defaults.defaultRobots,
        defaultOgImage: map.get('seo_default_og_image') || defaults.defaultOgImage,
        twitterHandle: map.get('seo_twitter_handle') || defaults.twitterHandle,
        orgName: map.get('seo_org_name') || defaults.orgName,
        orgLogo: map.get('seo_org_logo') || defaults.orgLogo,
        gscVerification: map.get('seo_gsc_verification') || '',
        bingVerification: map.get('seo_bing_verification') || '',
        ga4MeasurementId: map.get('seo_ga4_measurement_id') || ''
      };
    } catch {
      return defaults;
    }
  }

  /**
   * Formats page title using the dynamic title template
   */
  public formatTitle(pageTitle: string, template: string): string {
    if (!pageTitle) return 'Psychology Calculator';
    if (!template.includes('{{page_title}}')) return pageTitle;
    return template.replace('{{page_title}}', pageTitle.trim());
  }

  /**
   * Resolves complete dynamic PageMetadata object for any route or entity
   */
  public async getPageMetadata(options: {
    pageType?: 'home' | 'assessment' | 'category' | 'page' | 'result' | 'custom';
    entityId?: string;
    path: string;
    rawTitle?: string;
    defaultDescription?: string;
    ogImage?: string;
    ogType?: 'website' | 'article';
    noindex?: boolean;
    publishedTime?: string;
    modifiedTime?: string;
  }): Promise<PageMetadata> {
    const settings = await this.getSeoSettings();
    const cleanPath = options.path.startsWith('/') ? options.path : `/${options.path}`;
    const canonicalUrl = `${settings.canonicalDomain}${cleanPath === '/' ? '' : cleanPath}`;

    let title = options.rawTitle || settings.siteTitle;
    let description = options.defaultDescription || settings.defaultDescription;
    let ogImage = options.ogImage || settings.defaultOgImage;
    let robots = options.noindex ? 'noindex, nofollow' : settings.defaultRobots;

    // Look for explicit SEO metadata override from seo_metadata table
    if (this.db && options.pageType && options.entityId) {
      const explicitMeta = await fetchFirst<SeoMetadataRow>(
        this.db,
        'SELECT * FROM seo_metadata WHERE page_type = ? AND entity_id = ?',
        [options.pageType, options.entityId]
      );

      if (explicitMeta) {
        if (explicitMeta.title) title = explicitMeta.title;
        if (explicitMeta.description) description = explicitMeta.description;
        if (explicitMeta.og_image) ogImage = explicitMeta.og_image;
        if (explicitMeta.robots) robots = explicitMeta.robots;
      }
    }

    const formattedTitle =
      options.path === '/' || title === settings.siteTitle
        ? title
        : this.formatTitle(title, settings.titleTemplate);

    return {
      title: formattedTitle,
      rawTitle: title,
      description,
      canonicalUrl,
      robots,
      ogTitle: formattedTitle,
      ogDescription: description,
      ogImage: ogImage.startsWith('http') ? ogImage : `${settings.canonicalDomain}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`,
      ogType: options.ogType || 'website',
      twitterCard: 'summary_large_image',
      publishedTime: options.publishedTime,
      modifiedTime: options.modifiedTime,
      noindex: options.noindex || robots.includes('noindex')
    };
  }

  /**
   * Generates Schema.org JSON-LD Structured Data
   */
  public generateStructuredData(
    type: 'Organization' | 'WebSite' | 'WebPage' | 'BreadcrumbList' | 'FAQPage',
    payload: any,
    settings?: SeoSettings
  ): Record<string, any> {
    const canonicalDomain = settings?.canonicalDomain || 'https://psychologycalculator.com';

    switch (type) {
      case 'Organization':
        return {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: settings?.orgName || 'Psychology Calculator',
          url: canonicalDomain,
          logo: settings?.orgLogo?.startsWith('http')
            ? settings.orgLogo
            : `${canonicalDomain}${settings?.orgLogo || '/images/logo.png'}`,
          sameAs: settings?.twitterHandle ? [`https://twitter.com/${settings.twitterHandle.replace('@', '')}`] : []
        };

      case 'WebSite':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: settings?.siteTitle || 'Psychology Calculator',
          url: canonicalDomain,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${canonicalDomain}/assessments?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
          }
        };

      case 'WebPage':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: payload.title,
          description: payload.description,
          url: payload.url,
          isPartOf: {
            '@type': 'WebSite',
            name: settings?.siteTitle || 'Psychology Calculator',
            url: canonicalDomain
          }
        };

      case 'BreadcrumbList':
        const items = (payload.items || []) as BreadcrumbItem[];
        return {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url.startsWith('http') ? item.url : `${canonicalDomain}${item.url.startsWith('/') ? '' : '/'}${item.url}`
          }))
        };

      case 'FAQPage':
        const faqs = (payload.faqs || []) as Array<{ question: string; answer: string }>;
        return {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer
            }
          }))
        };

      default:
        return {};
    }
  }

  /**
   * Generates dynamic XML Sitemap conforming to sitemaps.org standards
   */
  public async generateSitemapXml(): Promise<string> {
    const settings = await this.getSeoSettings();
    const domain = settings.canonicalDomain;
    const now = new Date().toISOString();

    const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];

    // 1. Homepage
    urls.push({
      loc: `${domain}/`,
      lastmod: now,
      changefreq: 'daily',
      priority: '1.0'
    });

    // 2. Static public landing pages
    urls.push({
      loc: `${domain}/assessments`,
      lastmod: now,
      changefreq: 'daily',
      priority: '0.9'
    });
    urls.push({
      loc: `${domain}/pricing`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.8'
    });

    if (this.db) {
      // 3. Published Assessments
      const assessments = await executeQuery<AssessmentRow>(
        this.db,
        `SELECT slug, updated_at FROM assessments WHERE status = 'published' ORDER BY updated_at DESC`
      );

      for (const asm of assessments) {
        urls.push({
          loc: `${domain}/assessments/${asm.slug}`,
          lastmod: asm.updated_at ? new Date(asm.updated_at).toISOString() : now,
          changefreq: 'weekly',
          priority: '0.9'
        });
      }

      // 4. Active Assessment Categories
      const categories = await executeQuery<AssessmentCategoryRow>(
        this.db,
        `SELECT slug, updated_at FROM assessment_categories WHERE status = 'active' ORDER BY display_order ASC`
      );

      for (const cat of categories) {
        urls.push({
          loc: `${domain}/categories/${cat.slug}`,
          lastmod: cat.updated_at ? new Date(cat.updated_at).toISOString() : now,
          changefreq: 'weekly',
          priority: '0.8'
        });
      }

      // 5. Blog Index & Published Articles
      urls.push({
        loc: `${domain}/blog`,
        lastmod: now,
        changefreq: 'daily',
        priority: '0.8'
      });

      const posts = await executeQuery<{ slug: string; updated_at: string }>(
        this.db,
        `SELECT slug, updated_at FROM posts WHERE status = 'published' AND (published_at IS NULL OR datetime(published_at) <= datetime('now')) ORDER BY published_at DESC`
      );

      for (const post of posts) {
        urls.push({
          loc: `${domain}/blog/${post.slug}`,
          lastmod: post.updated_at ? new Date(post.updated_at).toISOString() : now,
          changefreq: 'weekly',
          priority: '0.7'
        });
      }

      // 6. Published Dynamic CMS Pages
      const pages = await executeQuery<PageRow>(
        this.db,
        `SELECT slug, updated_at FROM pages WHERE status = 'published' ORDER BY updated_at DESC`
      );

      for (const p of pages) {
        urls.push({
          loc: `${domain}/p/${p.slug}`,
          lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : now,
          changefreq: 'monthly',
          priority: '0.6'
        });
      }
    }

    // Build XML string
    const urlElements = urls
      .map(
        (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod.split('T')[0]}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
  }

  /**
   * Generates dynamic robots.txt file
   */
  public async generateRobotsTxt(): Promise<string> {
    const settings = await this.getSeoSettings();
    const domain = settings.canonicalDomain;

    if (this.db) {
      const customRow = await fetchFirst<{ value: string }>(
        this.db,
        "SELECT value FROM site_settings WHERE key = 'robots_custom_directives'"
      );
      if (customRow && customRow.value) {
        return customRow.value.trim() + '\n';
      }
    }

    return `# Psychology Calculator Robots Directive
User-agent: *
Allow: /
Allow: /assessments/
Allow: /categories/
Allow: /pricing
Allow: /p/
Allow: /legal/

# Disallow authenticated, private, and transactional endpoints
Disallow: /admin/
Disallow: /dashboard/
Disallow: /api/
Disallow: /results/
Disallow: /reports/
Disallow: /account/
Disallow: /verify-email
Disallow: /reset-password

# Sitemap
Sitemap: ${domain}/sitemap.xml
`;
  }

  /**
   * Performs an application-level SEO health audit across assessments, categories, and pages
   */
  public async runSeoAudit(): Promise<{
    score: number;
    issues: SeoAuditIssue[];
    totalPagesAudited: number;
  }> {
    const issues: SeoAuditIssue[] = [];
    if (!this.db) return { score: 100, issues: [], totalPagesAudited: 0 };

    let totalPages = 0;

    // 1. Audit Assessments
    const assessments = await executeQuery<AssessmentRow>(
      this.db,
      'SELECT id, name, slug, short_description, status FROM assessments'
    );
    totalPages += assessments.length;

    for (const asm of assessments) {
      if (!asm.name || asm.name.trim().length === 0) {
        issues.push({
          severity: 'error',
          category: 'metadata',
          message: `Assessment "${asm.slug}" is missing a title`,
          entityType: 'assessment',
          entityId: asm.id
        });
      }
      if (!asm.short_description || asm.short_description.trim().length < 20) {
        issues.push({
          severity: 'warning',
          category: 'metadata',
          message: `Assessment "${asm.name}" has a short or missing description (<20 chars)`,
          entityType: 'assessment',
          entityId: asm.id
        });
      }
      if (!asm.slug || asm.slug.includes(' ')) {
        issues.push({
          severity: 'error',
          category: 'canonical',
          message: `Assessment "${asm.name}" has an invalid slug: "${asm.slug}"`,
          entityType: 'assessment',
          entityId: asm.id
        });
      }
    }

    // 2. Audit Categories
    const categories = await executeQuery<AssessmentCategoryRow>(
      this.db,
      'SELECT id, name, slug, description, status FROM assessment_categories'
    );
    totalPages += categories.length;

    for (const cat of categories) {
      if (!cat.description || cat.description.trim().length === 0) {
        issues.push({
          severity: 'warning',
          category: 'metadata',
          message: `Category "${cat.name}" has no description`,
          entityType: 'category',
          entityId: cat.id
        });
      }
    }

    // Calculate quality score (starts at 100, errors -10, warnings -3)
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const score = Math.max(0, Math.min(100, 100 - errorCount * 10 - warningCount * 3));

    return {
      score,
      issues,
      totalPagesAudited: totalPages
    };
  }
}
