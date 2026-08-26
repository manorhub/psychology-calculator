import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery } from '@/lib/db/query';
import { SeoService } from './seo.service';

export interface IndexNowSubmissionPayload {
  host: string;
  key: string;
  keyLocation?: string;
  urlList: string[];
}

export interface IndexNowResult {
  success: boolean;
  statusCode: number;
  message: string;
  submittedCount: number;
  urls: string[];
}

export class IndexNowService extends BaseService {
  private readonly db: D1Database | null;
  public static readonly DEFAULT_KEY = 'c7849e625a1e49058b732d8479e0a6d1';

  constructor(db: D1Database | null) {
    super('IndexNowService');
    this.db = db;
  }

  /**
   * Retrieves active IndexNow API key
   */
  public async getIndexNowKey(): Promise<string> {
    if (!this.db) return IndexNowService.DEFAULT_KEY;

    try {
      const rows = await executeQuery<{ value: string }>(
        this.db,
        "SELECT value FROM site_settings WHERE key = 'seo_indexnow_key' LIMIT 1"
      );
      return rows[0]?.value || IndexNowService.DEFAULT_KEY;
    } catch {
      return IndexNowService.DEFAULT_KEY;
    }
  }

  /**
   * Submits an array of URLs to the IndexNow protocol endpoint (notifies Bing, Yandex, etc.)
   */
  public async submitUrls(urls: string[], customHost?: string): Promise<IndexNowResult> {
    if (!urls || urls.length === 0) {
      return {
        success: false,
        statusCode: 400,
        message: 'No URLs provided for IndexNow submission.',
        submittedCount: 0,
        urls: []
      };
    }

    const key = await this.getIndexNowKey();
    const seoService = new SeoService(this.db);
    const settings = await seoService.getSeoSettings();

    // Clean up domain/host
    const canonicalUrl = new URL(settings.canonicalDomain || 'https://psychologycalculator.com');
    const host = customHost || canonicalUrl.hostname;
    const protocol = canonicalUrl.protocol || 'https:';

    // Normalize URL list ensuring fully qualified URLs matching host
    const normalizedUrls = urls.map((u) => {
      if (u.startsWith('http://') || u.startsWith('https://')) return u;
      return `${protocol}//${host}${u.startsWith('/') ? '' : '/'}${u}`;
    });

    const payload: IndexNowSubmissionPayload = {
      host,
      key,
      keyLocation: `${protocol}//${host}/${key}.txt`,
      urlList: normalizedUrls
    };

    try {
      const response = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': 'PsychologyCalculator-IndexNow/1.0'
        },
        body: JSON.stringify(payload)
      });

      const statusCode = response.status;
      let message = 'URLs submitted successfully.';

      if (statusCode === 200) {
        message = 'IndexNow accepted all URLs successfully.';
      } else if (statusCode === 202) {
        message = 'IndexNow received URLs; key validation pending.';
      } else if (statusCode === 400) {
        message = 'Bad Request: Invalid IndexNow payload format.';
      } else if (statusCode === 403) {
        message = 'Forbidden: Invald IndexNow key or key file not found on server.';
      } else if (statusCode === 422) {
        message = "Unprocessable Entity: Submitted URLs don't match host.";
      } else if (statusCode === 429) {
        message = 'Too Many Requests: Rate limit exceeded.';
      } else {
        message = `IndexNow responded with HTTP status ${statusCode}.`;
      }

      this.log('submitUrls', { host, statusCode, count: normalizedUrls.length });

      return {
        success: statusCode === 200 || statusCode === 202,
        statusCode,
        message,
        submittedCount: normalizedUrls.length,
        urls: normalizedUrls
      };
    } catch (err: any) {
      this.error('submitUrls', err);
      return {
        success: false,
        statusCode: 500,
        message: `Network error submitting to IndexNow: ${err?.message || 'Unknown error'}`,
        submittedCount: 0,
        urls: normalizedUrls
      };
    }
  }

  /**
   * Discovers all published pages on the site and submits them in batch
   */
  public async submitEntireSite(customHost?: string): Promise<IndexNowResult> {
    if (!this.db) {
      return this.submitUrls(['/', '/assessments', '/pricing', '/about'], customHost);
    }

    const [assessments, categories] = await Promise.all([
      executeQuery<{ slug: string }>(
        this.db,
        "SELECT slug FROM assessments WHERE status = 'published'"
      ),
      executeQuery<{ slug: string }>(
        this.db,
        "SELECT slug FROM assessment_categories WHERE status = 'active'"
      )
    ]);

    const urlList: string[] = [
      '/',
      '/assessments',
      '/pricing',
      '/about',
      ...categories.map((c) => `/assessments/category/${c.slug}`),
      ...assessments.map((a) => `/assessments/${a.slug}`)
    ];

    return this.submitUrls(urlList, customHost);
  }
}
