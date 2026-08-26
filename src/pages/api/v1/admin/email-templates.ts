import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { EmailService } from '@/services/email.service';
import type { EmailEventKey, EmailEventCategory } from '@/types/database';

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
    const { action, template, id, status, eventKey, testEmail } = body;

    // 1. Upsert Template
    if (action === 'upsert') {
      if (!template) {
        return new Response(JSON.stringify({ success: false, message: 'Template payload required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const templateId = await emailService.upsertTemplate(template);
      return new Response(
        JSON.stringify({ success: true, message: 'Email template saved successfully', id: templateId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Toggle Status (active/inactive)
    if (action === 'toggle_status') {
      if (!id || !status) {
        return new Response(JSON.stringify({ success: false, message: 'Template ID and status required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const success = await emailService.toggleTemplateStatus(id, status);
      return new Response(
        JSON.stringify({ success, message: `Template status changed to "${status}"` }),
        { status: success ? 200 : 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Live Preview with Sample Mock Data
    if (action === 'preview') {
      const targetKey = eventKey || id;
      if (!targetKey) {
        return new Response(JSON.stringify({ success: false, message: 'Template key or ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const previewData = await emailService.renderPreview(targetKey);
      return new Response(
        JSON.stringify({ success: true, ...previewData }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Send Test Email with Mock Data
    if (action === 'send_test') {
      const targetKey = eventKey || (template ? template.event_key : null);
      if (!targetKey || !testEmail) {
        return new Response(
          JSON.stringify({ success: false, message: 'Event key and test recipient email required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const sampleVariables = {
        user_name: 'Alex Vance',
        user_email: testEmail,
        assessment_name: 'Big Five Personality Assessment',
        assessment_url: `${emailService['appUrl']}/assessments/big-five/take`,
        result_url: `${emailService['appUrl']}/results/sample-result`,
        report_url: `${emailService['appUrl']}/reports/sample-report`,
        verification_url: `${emailService['appUrl']}/verify-email?token=sample_token`,
        reset_url: `${emailService['appUrl']}/reset-password?token=sample_token`,
        package_name: 'Starter Insights Pack',
        credits_purchased: '20',
        purchase_amount: '$19.00',
        currency: 'USD',
        credits_balance: '12',
        transaction_id: 'txn_ls_98472914',
        purchase_date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        billing_url: `${emailService['appUrl']}/dashboard/settings/billing`,
        credits_url: `${emailService['appUrl']}/account/credits`,
        support_url: `${emailService['appUrl']}/contact`,
        support_email: 'support@psychologycalculator.com',
        credit_refund_message: 'Your 2 spent credits have been returned to your account balance.',
        expiry_date: new Date(Date.now() + 30 * 86400000).toLocaleDateString(),
        feature_name: 'Couple Psychometric Alignment',
        feature_description: 'Compare personality traits side-by-side with a partner.',
        feature_url: `${emailService['appUrl']}/assessments/relationship-compatibility`,
        announcement_body: 'We have updated normative psychometric distribution curves.',
        announcement_url: `${emailService['appUrl']}/blog`,
        security_details: 'Chrome on Windows (IP: 192.0.2.1)',
        timestamp: new Date().toUTCString(),
        unsubscribe_url: `${emailService['appUrl']}/dashboard/settings/notifications?unsub=demo`
      };

      const success = await emailService.sendEmail({
        event: targetKey as EmailEventKey,
        recipient: testEmail,
        variables: sampleVariables,
        userId: currentUser.id,
        bypassPreferences: true
      });

      return new Response(
        JSON.stringify({
          success,
          message: success
            ? `Sample test email for "${targetKey}" dispatched to ${testEmail}!`
            : `Failed to dispatch test email. Check your SMTP configuration.`
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
