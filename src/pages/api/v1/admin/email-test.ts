import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { EmailService } from '@/services/email.service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, message: 'Forbidden: Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const emailService = new EmailService(db);

  try {
    const body = (await request.json()) as any;
    const { action, testEmail, config, eventKey, jobId } = body;

    if (action === 'save_config') {
      if (!config) {
        return new Response(JSON.stringify({ success: false, message: 'Configuration payload required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      await emailService.updateSmtpConfig(config);
      return new Response(
        JSON.stringify({ success: true, message: 'SMTP configuration updated successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send_test') {
      if (!testEmail) {
        return new Response(JSON.stringify({ success: false, message: 'Test email address required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await emailService.sendTestEmail(testEmail, config);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'send_template_test') {
      if (!testEmail || !eventKey) {
        return new Response(
          JSON.stringify({ success: false, message: 'Test recipient and event key required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const sampleVariables = {
        user_name: 'Dr. Alex Vance',
        assessment_name: 'Big Five Personality Test',
        result_name: 'Explorer & Architect',
        report_url: 'https://psychologycalculator.com/dashboard/reports/demo',
        result_url: 'https://psychologycalculator.com/r/demo-result',
        verify_url: 'https://psychologycalculator.com/verify-email?token=sample-token',
        reset_url: 'https://psychologycalculator.com/reset-password?token=sample-token',
        billing_url: 'https://psychologycalculator.com/dashboard/settings/billing',
        plan_name: 'Psychology Calculator Pro',
        subject: 'Research inquiry regarding normative scoring',
        message_preview: 'Hello team, I am interested in citing your psychometric normative curves...'
      };

      const success = await emailService.sendTemplate(eventKey, testEmail, sampleVariables, currentUser.id);
      return new Response(
        JSON.stringify({
          success,
          message: success
            ? `Test email for "${eventKey}" dispatched to ${testEmail}`
            : `Failed to dispatch test email for "${eventKey}"`
        }),
        { status: success ? 200 : 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'retry_job') {
      if (!jobId) {
        return new Response(JSON.stringify({ success: false, message: 'Job ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const success = await emailService.retryFailedJob(jobId);
      return new Response(
        JSON.stringify({
          success,
          message: success ? 'Email job redelivered successfully' : 'Failed to re-dispatch email job'
        }),
        { status: success ? 200 : 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: false, message: `Unknown action: ${action}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
