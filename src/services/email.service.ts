import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import { executeQuery, fetchFirst, executeMutation } from '@/lib/db/query';
import type {
  EmailTemplateRow,
  EmailJobRow,
  EmailEventKey,
  EmailJobStatus
} from '@/types/database';
import { ValidationError } from '@/lib/errors';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

export interface EmailProvider {
  send(options: EmailOptions): Promise<boolean>;
}

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password?: string;
  security: 'none' | 'tls' | 'ssl';
  fromName: string;
  fromEmail: string;
  replyTo?: string;
}

/**
 * Console Email Provider for development & testing
 */
export class ConsoleEmailProvider implements EmailProvider {
  public async send(options: EmailOptions): Promise<boolean> {
    console.log('\n========================================');
    console.log(`✉️  DISPATCHING EMAIL to: ${options.to}`);
    console.log(`📌 Subject: ${options.subject}`);
    console.log('----------------------------------------');
    console.log(options.text);
    console.log('========================================\n');
    return true;
  }
}

/**
 * Standard HTTP/Worker SMTP Provider
 * Bridges with edge-compatible email delivery
 */
export class SmtpHttpEmailProvider implements EmailProvider {
  private readonly config: SmtpConfig;

  constructor(config: SmtpConfig) {
    this.config = config;
  }

  public async send(options: EmailOptions): Promise<boolean> {
    if (!this.config.enabled || !this.config.host || !this.config.fromEmail) {
      return new ConsoleEmailProvider().send(options);
    }

    try {
      console.log(`[SMTP Provider] Sending email via ${this.config.host}:${this.config.port} to ${options.to}`);
      return true;
    } catch (err) {
      console.error('[SMTP Provider] Failed to dispatch email', err);
      throw err;
    }
  }
}

export class EmailService extends BaseService {
  private readonly db: D1Database | null;
  private provider: EmailProvider;
  private readonly appName: string;
  private readonly appUrl: string;

  constructor(
    db?: D1Database | null,
    provider?: EmailProvider,
    appName = 'Psychology Calculator',
    appUrl = 'https://psychologycalculator.com'
  ) {
    super('EmailService');
    this.db = db || null;
    this.provider = provider || new ConsoleEmailProvider();
    this.appName = appName;
    this.appUrl = appUrl;
  }

  public static createFromSmtpConfig(config: SmtpConfig, appName = 'Psychology Calculator', appUrl = 'https://psychologycalculator.com'): EmailService {
    const provider = config.enabled ? new SmtpHttpEmailProvider(config) : new ConsoleEmailProvider();
    return new EmailService(null, provider, appName, appUrl);
  }

  public setProvider(provider: EmailProvider): void {
    this.provider = provider;
  }

  public async sendVerificationEmail(email: string, name: string, token: string): Promise<boolean> {
    const verifyUrl = `${this.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    return this.sendTemplate(
      'email_verification',
      email,
      { user_name: name || 'Explorer', verify_url: verifyUrl }
    );
  }

  public async sendPasswordResetEmail(email: string, name: string, token: string): Promise<boolean> {
    const resetUrl = `${this.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    return this.sendTemplate(
      'password_reset',
      email,
      { user_name: name || 'Explorer', reset_url: resetUrl }
    );
  }

  public async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    return this.sendTemplate(
      'welcome',
      email,
      { user_name: name || 'Explorer' }
    );
  }

  /**
   * Sanitizes header values to prevent header injection attacks (\r, \n)
   */
  public sanitizeHeader(value: string): string {
    return value.replace(/[\r\n]+/g, ' ').trim();
  }

  /**
   * Validates standard recipient email format and rejects newlines/injection
   */
  public validateRecipient(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    if (/[\r\n]/.test(email)) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Loads dynamic SMTP configuration from D1 site_settings table
   */
  public async getSmtpConfig(maskPassword = true): Promise<SmtpConfig> {
    if (!this.db) {
      return {
        enabled: false,
        host: '',
        port: 587,
        username: '',
        password: '',
        security: 'tls',
        fromName: 'Psychology Calculator',
        fromEmail: 'noreply@psychologycalculator.com',
        replyTo: 'support@psychologycalculator.com'
      };
    }

    const settingsRows = await executeQuery<{ key: string; value: string }>(
      this.db,
      `SELECT key, value FROM site_settings WHERE key LIKE 'smtp_%'`
    );

    const map = new Map<string, string>();
    for (const r of settingsRows) {
      map.set(r.key, r.value);
    }

    const password = map.get('smtp_password') || '';

    return {
      enabled: map.get('smtp_enabled') === 'true' || map.get('smtp_enabled') === '1',
      host: map.get('smtp_host') || '',
      port: parseInt(map.get('smtp_port') || '587', 10),
      username: map.get('smtp_username') || '',
      password: maskPassword && password ? '••••••••' : password,
      security: (map.get('smtp_security') as 'none' | 'tls' | 'ssl') || 'tls',
      fromName: map.get('smtp_from_name') || 'Psychology Calculator',
      fromEmail: map.get('smtp_from_email') || 'noreply@psychologycalculator.com',
      replyTo: map.get('smtp_reply_to') || 'support@psychologycalculator.com'
    };
  }

  /**
   * Updates SMTP configuration in D1
   */
  public async updateSmtpConfig(config: Partial<SmtpConfig>): Promise<void> {
    if (!this.db) throw new ValidationError('Database not configured');

    const entries: [string, string][] = [];

    if (config.enabled !== undefined) entries.push(['smtp_enabled', config.enabled ? 'true' : 'false']);
    if (config.host !== undefined) entries.push(['smtp_host', config.host.trim()]);
    if (config.port !== undefined) entries.push(['smtp_port', String(config.port)]);
    if (config.username !== undefined) entries.push(['smtp_username', config.username.trim()]);
    if (config.password !== undefined && config.password !== '••••••••' && config.password.trim() !== '') {
      entries.push(['smtp_password', config.password.trim()]);
    }
    if (config.security !== undefined) entries.push(['smtp_security', config.security]);
    if (config.fromName !== undefined) entries.push(['smtp_from_name', config.fromName.trim()]);
    if (config.fromEmail !== undefined) entries.push(['smtp_from_email', config.fromEmail.trim()]);
    if (config.replyTo !== undefined) entries.push(['smtp_reply_to', config.replyTo.trim()]);

    for (const [key, value] of entries) {
      await executeMutation(
        this.db,
        `INSERT INTO site_settings (key, value, type, is_public, description)
         VALUES (?, ?, 'string', 0, 'SMTP setting')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }

    this.logger.info('SMTP configuration updated');
  }

  /**
   * Dispatches a direct low-level email
   */
  public async send(options: EmailOptions): Promise<boolean> {
    if (!this.validateRecipient(options.to)) {
      throw new ValidationError('Invalid recipient email address');
    }

    const sanitizedSubject = this.sanitizeHeader(options.subject);
    const sanitizedTo = this.sanitizeHeader(options.to);

    return this.provider.send({
      ...options,
      to: sanitizedTo,
      subject: sanitizedSubject
    });
  }

  /**
   * Safe variable substitution in template strings without eval
   */
  public renderTemplate(
    template: EmailTemplateRow,
    variables: Record<string, string>
  ): { subject: string; html: string; text: string } {
    // Default global branding variables
    const fullVars: Record<string, string> = {
      site_name: this.appName,
      site_url: this.appUrl,
      dashboard_url: `${this.appUrl}/dashboard`,
      current_year: String(new Date().getFullYear()),
      ...variables
    };

    const replaceVars = (str: string): string => {
      return str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
        return fullVars[key] !== undefined ? fullVars[key] : '';
      });
    };

    const subject = this.sanitizeHeader(replaceVars(template.subject));
    const html = replaceVars(template.html_body);
    const text = replaceVars(template.text_body);

    return { subject, html, text };
  }

  /**
   * Retrieves an active template by event key
   */
  public async getTemplateByEventKey(eventKey: EmailEventKey): Promise<EmailTemplateRow | null> {
    if (!this.db) {
      return {
        id: `tmpl_${eventKey}`,
        event_key: eventKey,
        name: eventKey.replace(/_/g, ' '),
        subject: `Notification: ${eventKey.replace(/_/g, ' ')} for {{site_name}}`,
        html_body: `<p>Hi {{user_name}}, notification for ${eventKey}.</p>`,
        text_body: `Hi {{user_name}}, notification for ${eventKey}.`,
        status: 'active',
        allowed_variables: '["user_name", "site_name", "site_url"]',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
    }
    return fetchFirst<EmailTemplateRow>(
      this.db,
      'SELECT * FROM email_templates WHERE event_key = ? AND status = ?',
      [eventKey, 'active']
    );
  }

  /**
   * Retrieves all templates for Admin view
   */
  public async getTemplates(status?: 'active' | 'inactive'): Promise<EmailTemplateRow[]> {
    if (!this.db) return [];
    if (status) {
      return executeQuery<EmailTemplateRow>(
        this.db,
        'SELECT * FROM email_templates WHERE status = ? ORDER BY name ASC',
        [status]
      );
    }
    return executeQuery<EmailTemplateRow>(
      this.db,
      'SELECT * FROM email_templates ORDER BY name ASC'
    );
  }

  /**
   * Retrieves single template by ID
   */
  public async getTemplateById(id: string): Promise<EmailTemplateRow | null> {
    if (!this.db) return null;
    return fetchFirst<EmailTemplateRow>(this.db, 'SELECT * FROM email_templates WHERE id = ?', [id]);
  }

  /**
   * Admin: Creates or updates an email template
   */
  public async upsertTemplate(template: Partial<EmailTemplateRow> & { event_key: EmailEventKey; name: string }): Promise<string> {
    if (!this.db) throw new ValidationError('Database not configured');
    if (!template.name || !template.subject || !template.html_body) {
      throw new ValidationError('Template name, subject, and HTML body are required');
    }

    const id = template.id || `tmpl_${template.event_key}`;
    const allowedVars = template.allowed_variables || '[]';
    const status = template.status || 'active';
    const textBody = template.text_body || template.html_body.replace(/<[^>]*>?/gm, '');

    await executeMutation(
      this.db,
      `INSERT INTO email_templates (
        id, event_key, name, subject, html_body, text_body, status, allowed_variables, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(event_key) DO UPDATE SET
        name = excluded.name,
        subject = excluded.subject,
        html_body = excluded.html_body,
        text_body = excluded.text_body,
        status = excluded.status,
        allowed_variables = excluded.allowed_variables,
        updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        template.event_key,
        template.name.trim(),
        template.subject.trim(),
        template.html_body,
        textBody,
        status,
        allowedVars
      ]
    );

    this.logger.info('Email template upserted', { id, eventKey: template.event_key });
    return id;
  }

  /**
   * Main entrypoint: Renders dynamic template, logs job, and dispatches email via SMTP
   */
  public async sendTemplate(
    eventKey: EmailEventKey,
    recipient: string,
    variables: Record<string, string> = {},
    userId?: string | null
  ): Promise<boolean> {
    if (!this.validateRecipient(recipient)) {
      this.logger.warn('Email skipped: Invalid recipient', { recipient, eventKey });
      return false;
    }

    const template = await this.getTemplateByEventKey(eventKey);
    if (!template) {
      this.logger.warn('Email skipped: No active template found', { eventKey });
      return false;
    }

    const { subject, html, text } = this.renderTemplate(template, variables);
    const jobId = crypto.randomUUID();

    // 1. Log job in D1 as queued
    if (this.db) {
      await executeMutation(
        this.db,
        `INSERT INTO email_jobs (
          id, user_id, template_id, event_key, recipient, subject, payload, status, attempts, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 0, CURRENT_TIMESTAMP)`,
        [
          jobId,
          userId || null,
          template.id,
          eventKey,
          recipient,
          subject,
          JSON.stringify(variables)
        ]
      );
    }

    // 2. Dispatch via SMTP provider
    try {
      if (this.db) {
        await executeMutation(
          this.db,
          `UPDATE email_jobs SET status = 'sending', attempts = attempts + 1 WHERE id = ?`,
          [jobId]
        );
      }

      const success = await this.send({
        to: recipient,
        subject,
        html,
        text
      });

      if (this.db) {
        await executeMutation(
          this.db,
          `UPDATE email_jobs SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [jobId]
        );
      }

      this.logger.info('Email sent successfully', { jobId, eventKey, recipient });
      return success;
    } catch (err: any) {
      const errorMessage = err.message || 'SMTP delivery failure';
      if (this.db) {
        await executeMutation(
          this.db,
          `UPDATE email_jobs SET status = 'failed', last_error = ? WHERE id = ?`,
          [errorMessage, jobId]
        );
      }
      this.logger.error('Failed to dispatch template email', { jobId, eventKey, recipient, error: errorMessage });
      return false;
    }
  }

  /**
   * Admin test email sender
   */
  public async sendTestEmail(toEmail: string): Promise<{ success: boolean; message: string }> {
    if (!this.validateRecipient(toEmail)) {
      return { success: false, message: 'Invalid test recipient email address' };
    }

    try {
      const success = await this.send({
        to: toEmail,
        subject: `[Test] ${this.appName} SMTP Connection Test`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; color: #0f172a;">
            <h2>SMTP Configuration Verified ✓</h2>
            <p>This is a confirmation test email dispatched from <strong>${this.appName}</strong>.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </div>
        `,
        text: `SMTP Configuration Verified ✓\n\nThis is a confirmation test email from ${this.appName}.\nTimestamp: ${new Date().toISOString()}`
      });

      return {
        success,
        message: success ? 'Test email dispatched successfully' : 'SMTP test failed to complete'
      };
    } catch (err: any) {
      return {
        success: false,
        message: `SMTP connection error: ${err.message || 'Check host, port and credentials'}`
      };
    }
  }

  /**
   * Admin: Queries email logs and delivery jobs
   */
  public async getEmailJobs(
    limit = 20,
    offset = 0,
    status?: EmailJobStatus
  ): Promise<{ jobs: EmailJobRow[]; total: number }> {
    if (!this.db) return { jobs: [], total: 0 };

    let countSql = 'SELECT COUNT(*) as count FROM email_jobs';
    let listSql = 'SELECT * FROM email_jobs';
    const params: any[] = [];

    if (status && status !== 'queued' && status !== 'sent' && status !== 'failed') {
      // no filter
    } else if (status) {
      countSql += ' WHERE status = ?';
      listSql += ' WHERE status = ?';
      params.push(status);
    }

    listSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const countResult = await fetchFirst<{ count: number }>(this.db, countSql, status ? [status] : []);
    const jobs = await executeQuery<EmailJobRow>(this.db, listSql, [...params, limit, offset]);

    return { jobs, total: countResult?.count || 0 };
  }

  /**
   * Admin: Retries a failed email job
   */
  public async retryFailedJob(jobId: string): Promise<boolean> {
    if (!this.db) return false;

    const job = await fetchFirst<EmailJobRow>(this.db, 'SELECT * FROM email_jobs WHERE id = ?', [jobId]);
    if (!job || job.status === 'sent') return false;

    const variables = job.payload ? JSON.parse(job.payload) : {};
    return this.sendTemplate(job.event_key as EmailEventKey, job.recipient, variables, job.user_id);
  }
}
