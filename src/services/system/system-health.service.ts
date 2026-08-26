import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { fetchFirst } from '@/lib/db/query';
import type { SystemHealthCheck } from '@/types/database';
import { SettingsService } from '../settings/settings.service';

export class SystemHealthService extends BaseService {
  private readonly db: D1Database | null;
  private readonly settingsService: SettingsService;

  constructor(db?: D1Database | null, settingsService?: SettingsService) {
    super('SystemHealthService');
    this.db = db || null;
    this.settingsService = settingsService || new SettingsService(db);
  }

  /**
   * Diagnostic test: Cloudflare D1 SQLite Connectivity & Read/Write Latency
   */
  public async checkD1Connectivity(): Promise<SystemHealthCheck> {
    const start = Date.now();
    try {
      if (!this.db) {
        return {
          service: 'Cloudflare D1 Database',
          status: 'unhealthy',
          latencyMs: 0,
          message: 'D1 database binding not available in runtime context',
          timestamp: new Date().toISOString()
        };
      }

      await fetchFirst(this.db, 'SELECT 1 as ping');
      const latencyMs = Date.now() - start;

      return {
        service: 'Cloudflare D1 Database',
        status: 'healthy',
        latencyMs,
        message: `D1 SQLite responding normally (${latencyMs}ms)`,
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        service: 'Cloudflare D1 Database',
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: err?.message || 'Failed to query D1 database',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Diagnostic test: Cloudflare R2 Object Storage
   */
  public async checkR2Storage(bucket?: any): Promise<SystemHealthCheck> {
    const start = Date.now();
    if (!bucket) {
      return {
        service: 'Cloudflare R2 Storage',
        status: 'degraded',
        latencyMs: 0,
        message: 'R2 Bucket binding not configured (Local simulated storage active)',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Test small write and delete operation
      const testKey = `.health-check-${Date.now()}`;
      await bucket.put(testKey, 'ok');
      await bucket.delete(testKey);

      const latencyMs = Date.now() - start;
      return {
        service: 'Cloudflare R2 Storage',
        status: 'healthy',
        latencyMs,
        message: `R2 Bucket storage verified (${latencyMs}ms)`,
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        service: 'Cloudflare R2 Storage',
        status: 'degraded',
        latencyMs: Date.now() - start,
        message: `R2 check notice: ${err?.message || 'Storage error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Diagnostic test: SMTP Email Configuration
   */
  public async checkSmtpConnectivity(): Promise<SystemHealthCheck> {
    const start = Date.now();
    try {
      const isEnabled = await this.settingsService.get('smtp_enabled', false);
      const host = await this.settingsService.get('smtp_host', '');
      const port = await this.settingsService.get('smtp_port', '587');

      if (!isEnabled) {
        return {
          service: 'SMTP Email Delivery',
          status: 'healthy',
          latencyMs: 0,
          message: 'SMTP delivery disabled (Console mock delivery active for local development)',
          timestamp: new Date().toISOString()
        };
      }

      if (!host) {
        return {
          service: 'SMTP Email Delivery',
          status: 'degraded',
          latencyMs: 0,
          message: 'SMTP enabled but host is unconfigured',
          timestamp: new Date().toISOString()
        };
      }

      return {
        service: 'SMTP Email Delivery',
        status: 'healthy',
        latencyMs: Date.now() - start,
        message: `Configured to ${host}:${port}`,
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        service: 'SMTP Email Delivery',
        status: 'degraded',
        latencyMs: Date.now() - start,
        message: err?.message || 'SMTP diagnostic error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Diagnostic test: AI LLM Providers
   */
  public async checkAiProviders(): Promise<SystemHealthCheck> {
    const start = Date.now();
    try {
      const isAiEnabled = await this.settingsService.get('ai_enabled', true);
      const provider = await this.settingsService.get('default_ai_provider', 'gemini');
      const model = await this.settingsService.get('default_ai_model', 'gemini-1.5-flash');

      if (!isAiEnabled) {
        return {
          service: 'AI Interpretation Engine',
          status: 'degraded',
          latencyMs: 0,
          message: 'AI synthesis engine currently disabled via site settings',
          timestamp: new Date().toISOString()
        };
      }

      return {
        service: 'AI Interpretation Engine',
        status: 'healthy',
        latencyMs: Date.now() - start,
        message: `Primary: ${provider.toUpperCase()} (${model})`,
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        service: 'AI Interpretation Engine',
        status: 'degraded',
        latencyMs: Date.now() - start,
        message: err?.message || 'AI diagnostic error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Diagnostic test: Lemon Squeezy Payment Gateway
   */
  public async checkLemonSqueezy(): Promise<SystemHealthCheck> {
    const start = Date.now();
    try {
      const isBillingEnabled = await this.settingsService.get('billing_enabled', true);
      const storeId = await this.settingsService.get('lemon_squeezy_store_id', '');

      if (!isBillingEnabled) {
        return {
          service: 'Lemon Squeezy Billing',
          status: 'degraded',
          latencyMs: 0,
          message: 'Billing engine disabled via feature settings',
          timestamp: new Date().toISOString()
        };
      }

      return {
        service: 'Lemon Squeezy Billing',
        status: storeId ? 'healthy' : 'degraded',
        latencyMs: Date.now() - start,
        message: storeId ? `Store ID: ${storeId}` : 'Store ID not set (Simulated billing active)',
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        service: 'Lemon Squeezy Billing',
        status: 'degraded',
        latencyMs: Date.now() - start,
        message: err?.message || 'Billing diagnostic error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Aggregates all subsystem health checks
   */
  public async getOverallHealth(r2Bucket?: any): Promise<{ checks: SystemHealthCheck[]; status: 'healthy' | 'degraded' | 'unhealthy' }> {
    const checks = await Promise.all([
      this.checkD1Connectivity(),
      this.checkR2Storage(r2Bucket),
      this.checkSmtpConnectivity(),
      this.checkAiProviders(),
      this.checkLemonSqueezy()
    ]);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (checks.some((c) => c.status === 'unhealthy')) {
      status = 'unhealthy';
    } else if (checks.some((c) => c.status === 'degraded')) {
      status = 'degraded';
    }

    return { checks, status };
  }
}
