import type { D1Database } from '@cloudflare/workers-types';
import { fetchFirst } from '@/lib/db/query';

/**
 * Production Security Headers and Utilities
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://accounts.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob: https://lh3.googleusercontent.com",
      "connect-src 'self' https://challenges.cloudflare.com https://accounts.google.com https://oauth2.googleapis.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com"
    ].join('; ')
  };
}

/**
 * Basic string sanitization for safe display
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Normalizes email address for consistent lookup and enumeration prevention
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validates password strength (minimum 8 characters, at least 1 number or special character)
 */
export function validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number or special character.' };
  }
  return { isValid: true };
}

/**
 * In-memory fallback rate-limit map
 */
const memoryRateLimits = new Map<string, { count: number; resetAt: number }>();

/**
 * Database & Memory-backed Rate Limiter for sensitive auth actions
 */
export class RateLimiter {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    this.db = db;
  }

  public async checkLimit(
    key: string,
    action: string,
    maxAttempts: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
    const fullKey = `${action}:${key}`;
    const now = Date.now();

    if (!this.db) {
      // In-memory fallback
      const existing = memoryRateLimits.get(fullKey);
      if (!existing || now > existing.resetAt) {
        memoryRateLimits.set(fullKey, { count: 1, resetAt: now + windowSeconds * 1000 });
        return { allowed: true, remaining: maxAttempts - 1, resetInSeconds: windowSeconds };
      }

      if (existing.count >= maxAttempts) {
        return {
          allowed: false,
          remaining: 0,
          resetInSeconds: Math.ceil((existing.resetAt - now) / 1000)
        };
      }

      existing.count += 1;
      return {
        allowed: true,
        remaining: maxAttempts - existing.count,
        resetInSeconds: Math.ceil((existing.resetAt - now) / 1000)
      };
    }

    try {
      const resetAtDate = new Date(now + windowSeconds * 1000).toISOString();
      const row = await fetchFirst<{ count: number; reset_at: string }>(
        this.db,
        'SELECT count, reset_at FROM rate_limits WHERE key = ?',
        [fullKey]
      );

      if (!row || new Date(row.reset_at).getTime() < now) {
        // Create or reset bucket
        await this.db
          .prepare(
            'INSERT INTO rate_limits (key, action, count, reset_at) VALUES (?, ?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at'
          )
          .bind(fullKey, action, resetAtDate)
          .run();

        return { allowed: true, remaining: maxAttempts - 1, resetInSeconds: windowSeconds };
      }

      if (row.count >= maxAttempts) {
        const resetInSeconds = Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - now) / 1000));
        return { allowed: false, remaining: 0, resetInSeconds };
      }

      // Increment count
      await this.db
        .prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?')
        .bind(fullKey)
        .run();

      const resetInSeconds = Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - now) / 1000));
      return { allowed: true, remaining: maxAttempts - (row.count + 1), resetInSeconds };
    } catch {
      // Graceful fallback to allow request on database transient error
      return { allowed: true, remaining: 1, resetInSeconds: windowSeconds };
    }
  }

  public async resetLimit(key: string, action: string): Promise<void> {
    const fullKey = `${action}:${key}`;
    memoryRateLimits.delete(fullKey);
    if (this.db) {
      try {
        await this.db.prepare('DELETE FROM rate_limits WHERE key = ?').bind(fullKey).run();
      } catch {
        // Ignore
      }
    }
  }
}
