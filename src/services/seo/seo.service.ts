import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/i18n';
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

  public async getSeoSettings(): Promise<SeoSettings> {
    const defaults: SeoSettings = {
      siteTitle: 'Psychology Calculator',
      titleTemplate: '{{page_title}} | PsychologyCalculator.com',
      defaultDescription: 'Scientifically validated psychological assessments, personality evaluations, and deep psychometric interpretations.',
      canonicalDomain: 'https://www.psychologycalculator.com',
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
        canonicalDomain: 'https://www.psychologycalculator.com',
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

  public formatTitle(pageTitle: string, template: string): string {
    if (!pageTitle) return 'Psychology Tests & Personality Assessments | PsychologyCalculator.com';
    let clean = pageTitle.replace(/(\s*\|\s*Psychology\s*Calculator(\.com)?)+/gi, '').trim();
    clean = clean.replace(/(\s*\|\s*MindMetrics)+/gi, '').trim();
    if (!clean || clean === 'Psychology Tests & Personality Assessments') {
      return 'Psychology Tests & Personality Assessments | PsychologyCalculator.com';
    }
    return `${clean} | PsychologyCalculator.com`;
  }

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
    const cleanPath = options.path === '/' ? '/' : (options.path.startsWith('/') ? options.path : `/${options.path}`).replace(/\/+$/, '');
    const canonicalUrl = `${settings.canonicalDomain}${cleanPath === '/' ? '' : cleanPath}`;

    let title = options.rawTitle || settings.siteTitle;
    let description = options.defaultDescription || settings.defaultDescription;
    let ogImage = options.ogImage || settings.defaultOgImage;
    let robots = options.noindex ? 'noindex, nofollow' : settings.defaultRobots;

    const formattedTitle = this.formatTitle(title, settings.titleTemplate);

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

  public generateStructuredData(
    type: 'Organization' | 'WebSite' | 'WebPage' | 'BreadcrumbList' | 'FAQPage',
    payload: any,
    settings?: SeoSettings
  ): Record<string, any> {
    const canonicalDomain = 'https://www.psychologycalculator.com';

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

  public async generateSitemapXml(): Promise<string> {
    const domain = 'https://www.psychologycalculator.com';
    const now = new Date().toISOString().split('T')[0];

    const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];

    // Core English static routes
    const staticRoutes = [
      { path: '', changefreq: 'daily', priority: '1.0' },
      { path: 'assessments', changefreq: 'daily', priority: '0.9' },
      { path: 'pricing', changefreq: 'weekly', priority: '0.8' },
      { path: 'about', changefreq: 'monthly', priority: '0.7' },
      { path: 'contact', changefreq: 'monthly', priority: '0.7' },
      { path: 'privacy-policy', changefreq: 'monthly', priority: '0.5' },
      { path: 'terms-of-service', changefreq: 'monthly', priority: '0.5' },
      { path: 'disclaimer', changefreq: 'monthly', priority: '0.5' }
    ];

    // Add static routes for English & localized
    for (const r of staticRoutes) {
      const loc = r.path === '' ? `${domain}/` : `${domain}/${r.path}`;
      urls.push({ loc, lastmod: now, changefreq: r.changefreq, priority: r.priority });

      // Localized versions
      for (const lang of SUPPORTED_LOCALES) {
        if (lang === DEFAULT_LOCALE) continue;
        const locLang = r.path === '' ? `${domain}/${lang}` : `${domain}/${lang}/${r.path}`;
        urls.push({ loc: locLang, lastmod: now, changefreq: r.changefreq, priority: r.priority });
      }
    }

    if (this.db) {
      // Published Assessments
      const assessments = await executeQuery<AssessmentRow>(
        this.db,
        `SELECT slug, updated_at FROM assessments WHERE status = 'published' AND slug NOT LIKE '%-copy' ORDER BY updated_at DESC`
      );

      for (const asm of assessments) {
        const lastmod = asm.updated_at ? asm.updated_at.split('T')[0] : now;
        // English
        urls.push({
          loc: `${domain}/assessments/${asm.slug}`,
          lastmod,
          changefreq: 'weekly',
          priority: '0.9'
        });

        // Localized assessments
        for (const lang of SUPPORTED_LOCALES) {
          if (lang === DEFAULT_LOCALE) continue;
          urls.push({
            loc: `${domain}/${lang}/assessments/${asm.slug}`,
            lastmod,
            changefreq: 'weekly',
            priority: '0.9'
          });
        }
      }

      // Categories
      const categories = await executeQuery<AssessmentCategoryRow>(
        this.db,
        `SELECT slug, updated_at FROM assessment_categories WHERE is_active = 1 ORDER BY display_order ASC`
      );

      for (const cat of categories) {
        const lastmod = cat.updated_at ? cat.updated_at.split('T')[0] : now;
        urls.push({
          loc: `${domain}/assessments/category/${cat.slug}`,
          lastmod,
          changefreq: 'weekly',
          priority: '0.8'
        });

        for (const lang of SUPPORTED_LOCALES) {
          if (lang === DEFAULT_LOCALE) continue;
          urls.push({
            loc: `${domain}/${lang}/assessments/category/${cat.slug}`,
            lastmod,
            changefreq: 'weekly',
            priority: '0.8'
          });
        }
      }
    }

    // Build XML
    const urlElements = urls
      .map(
        (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
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

  public async generateRobotsTxt(): Promise<string> {
    const domain = 'https://www.psychologycalculator.com';

    return `# Psychology Calculator Robots Directive
User-agent: *
Allow: /
Allow: /assessments/
Allow: /pricing
Allow: /about
Allow: /contact
Allow: /disclaimer
Allow: /privacy-policy
Allow: /terms-of-service
Allow: /es/
Allow: /fr/
Allow: /de/
Allow: /pt/
Allow: /hi/

# Disallow private and transactional endpoints
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
}
