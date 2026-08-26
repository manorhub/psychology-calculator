import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { AdminService } from '@/services/admin.service';
import { EmailService } from '@/services/email.service';
import { requireAdmin } from '@/lib/auth/guards';
import { formatErrorResponse } from '@/lib/errors';
import { validateSchema } from '@/lib/validation';
import { z } from 'zod';

const testEmailSchema = z.object({
  recipient: z.string().email('Invalid recipient email address')
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    requireAdmin(locals);
    const body = await request.json();
    const data = validateSchema(testEmailSchema, body);

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const adminService = new AdminService(db);

    const settings = await adminService.getAllSettings();
    const isSmtpEnabled = settings.smtp_enabled === 'true';

    const emailService = isSmtpEnabled
      ? EmailService.createFromSmtpConfig(
          {
            enabled: true,
            host: settings.smtp_host || '',
            port: parseInt(settings.smtp_port || '587', 10),
            username: settings.smtp_username || '',
            password: settings.smtp_password,
            security: (settings.smtp_security as any) || 'tls',
            fromName: settings.smtp_from_name || 'MindMetrics',
            fromEmail: settings.smtp_from_email || 'no-reply@mindmetrics.io',
            replyTo: settings.smtp_reply_to
          },
          settings.site_name || 'MindMetrics'
        )
      : new EmailService(undefined, settings.site_name || 'MindMetrics');

    const sent = await emailService.sendTestEmail(data.recipient);

    const response: ApiResponse = {
      success: sent,
      data: {
        message: isSmtpEnabled
          ? `Test email dispatched to ${data.recipient} via configured SMTP.`
          : `Test email logged to system console for ${data.recipient} (SMTP disabled in settings).`
      },
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    const errorResponse: ApiResponse = {
      success: false,
      error: body,
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(errorResponse), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
  }
};
