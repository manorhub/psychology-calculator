import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '@/services/base.service';
import { logger } from '@/lib/logger';

export interface ErrorLogContext {
  [key: string]: unknown;
}

export interface ErrorLogEntry {
  id: string;
  service: string;
  error_type: string;
  message: string;
  context?: string | null;
  user_id?: string | null;
  request_id?: string | null;
  path?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface LogErrorOptions {
  service: string;
  errorType: string;
  error: unknown;
  context?: ErrorLogContext;
  userId?: string | null;
  requestId?: string | null;
  path?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class ErrorMonitoringService extends BaseService {
  private readonly db: D1Database | null;

  private static readonly SENSITIVE_KEY_PATTERNS = [
    /pass(word)?/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth(orization)?/i,
    /credential/i,
    /card/i,
    /cvv/i
  ];

  constructor(db?: D1Database | null) {
    super('ErrorMonitoringService');
    this.db = db || null;
  }

  /**
   * Deeply sanitizes an object to ensure no secrets/tokens are logged
   */
  public sanitizeContext(obj: unknown, depth = 0): unknown {
    if (depth > 5) return '[Truncated]';
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeContext(item, depth + 1));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const isSensitive = ErrorMonitoringService.SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitive) {
        sanitized[key] = '••••••••';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeContext(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Logs a sanitized operational error to D1 error telemetry table
   */
  public async captureError(options: LogErrorOptions): Promise<string> {
    const errorId = crypto.randomUUID();
    const rawMessage = options.error instanceof Error ? options.error.message : String(options.error);
    const sanitizedMsg = rawMessage.replace(/[a-f0-9]{32,}/gi, '[REDACTED_HASH]');

    const sanitizedContextObj = options.context ? this.sanitizeContext(options.context) : {};
    const contextJson = JSON.stringify(sanitizedContextObj);

    logger.error(`[${options.service}] ${options.errorType}: ${sanitizedMsg}`, {
      errorId,
      service: options.service,
      errorType: options.errorType,
      path: options.path,
      userId: options.userId
    });

    if (this.db) {
      try {
        await this.db
          .prepare(
            `INSERT INTO system_error_logs (id, service, error_type, message, context, user_id, request_id, path, ip_address, user_agent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
          )
          .bind(
            errorId,
            options.service,
            options.errorType,
            sanitizedMsg.substring(0, 1000),
            contextJson,
            options.userId || null,
            options.requestId || null,
            options.path || null,
            options.ipAddress || null,
            options.userAgent || null
          )
          .run();
      } catch (dbErr) {
        logger.error('Failed to write to system_error_logs table', { errorId }, dbErr instanceof Error ? dbErr : new Error(String(dbErr)));
      }
    }

    return errorId;
  }

  /**
   * Returns a safe, user-friendly error message for client responses
   */
  public static getSafeErrorMessage(errorType?: string): string {
    switch (errorType) {
      case 'AI_FAILURE':
        return 'Our psychological interpretation system is currently busy. Please try generating your synthesis again.';
      case 'SMTP_FAILURE':
        return 'We could not dispatch the notification email right now. Your action succeeded and notification is saved in your account.';
      case 'BILLING_FAILURE':
        return 'Payment authorization could not be completed. Please check your payment details or try again later.';
      case 'PDF_FAILURE':
        return 'PDF generation is momentarily queued. You can access your full interactive report in the meantime.';
      case 'RATE_LIMITED':
        return 'Too many requests. Please wait a moment before trying again.';
      case 'UNAUTHORIZED':
        return 'You do not have permission to access this resource.';
      case 'NOT_FOUND':
        return 'The requested assessment or page could not be found.';
      default:
        return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
    }
  }

  /**
   * Retrieves recent error logs for Admin monitoring
   */
  public async getRecentErrors(limit = 50, service?: string): Promise<ErrorLogEntry[]> {
    if (!this.db) return [];

    let query = 'SELECT * FROM system_error_logs';
    const params: unknown[] = [];

    if (service) {
      query += ' WHERE service = ?';
      params.push(service);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    try {
      const stmt = this.db.prepare(query);
      const rows = await stmt.bind(...params).all();
      return (rows.results as unknown as ErrorLogEntry[]) || [];
    } catch {
      return [];
    }
  }
}
