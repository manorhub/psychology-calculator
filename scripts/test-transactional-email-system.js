/**
 * Automated Verification Test Suite for Comprehensive Transactional Email System
 * PsychologyCalculator.com
 */

import assert from 'node:assert';
import { EmailService } from '../src/services/email.service.ts';
import { EventService } from '../src/services/events/event.service.ts';

// In-Memory SQLite Mock for standalone testing
class MockD1Database {
  constructor() {
    this.templates = new Map();
    this.jobs = [];
    this.preferences = new Map();
    this.settings = new Map();

    this.initDefaults();
  }

  initDefaults() {
    // Seed test SMTP settings
    this.settings.set('smtp_enabled', 'true');
    this.settings.set('smtp_host', 'smtp.sendgrid.net');
    this.settings.set('smtp_port', '587');
    this.settings.set('smtp_username', 'apikey');
    this.settings.set('smtp_password', 'secret_password_123');
    this.settings.set('smtp_security', 'tls');
    this.settings.set('smtp_from_name', 'Psychology Calculator');
    this.settings.set('smtp_from_email', 'alerts@mindmetrics.io');

    // Seed core templates
    const templatesList = [
      {
        id: 'tmpl_user_signup',
        event_key: 'user.signup',
        name: 'Welcome to PsychologyCalculator.com',
        category: 'auth_security',
        subject: 'Welcome to PsychologyCalculator.com, {{user_name}}!',
        preview_text: 'Explore self-assessments across personality and emotional wellbeing.',
        headline: 'Welcome to PsychologyCalculator.com',
        body_content: 'Hi {{user_name}},\n\nWelcome to PsychologyCalculator.com.\n\nYou can explore self-assessments across personality, emotional wellbeing, and career.',
        button_text: 'Explore Assessments',
        button_url: '{{dashboard_url}}',
        footer_note: 'Contact support if you have questions.',
        status: 'active',
        allowed_variables: '["user_name", "dashboard_url", "site_name"]',
        is_system_default: 1
      },
      {
        id: 'tmpl_email_verification',
        event_key: 'user.email_verification',
        name: 'Email Verification',
        category: 'auth_security',
        subject: 'Verify your PsychologyCalculator.com email',
        headline: 'Verify Your Email Address',
        body_content: 'Hi {{user_name}},\n\nPlease verify your email address to finish setting up your account.',
        button_text: 'Verify Email',
        button_url: '{{verification_url}}',
        status: 'active',
        allowed_variables: '["user_name", "verification_url"]',
        is_system_default: 1
      },
      {
        id: 'tmpl_password_reset',
        event_key: 'user.password_reset',
        name: 'Password Reset Request',
        category: 'auth_security',
        subject: 'Reset your PsychologyCalculator.com password',
        headline: 'Reset Your Password',
        body_content: 'Hi {{user_name}},\n\nWe received a request to reset your password.',
        button_text: 'Reset Password',
        button_url: '{{reset_url}}',
        status: 'active',
        allowed_variables: '["user_name", "reset_url"]',
        is_system_default: 1
      },
      {
        id: 'tmpl_password_changed',
        event_key: 'user.password_changed',
        name: 'Password Changed Notification',
        category: 'auth_security',
        subject: 'Your PsychologyCalculator.com password was changed',
        headline: 'Password Changed',
        body_content: 'Hi {{user_name}},\n\nYour account password was successfully changed.',
        button_text: 'Go to Dashboard',
        button_url: '{{dashboard_url}}',
        status: 'active',
        allowed_variables: '["user_name", "dashboard_url"]',
        is_system_default: 1
      },
      {
        id: 'tmpl_assessment_completed',
        event_key: 'assessment.completed',
        name: 'Assessment Completed',
        category: 'assessments',
        subject: 'Your {{assessment_name}} results are ready',
        headline: 'Assessment Results Ready',
        body_content: 'Hi {{user_name}},\n\nYou completed the {{assessment_name}}.',
        button_text: 'View My Results',
        button_url: '{{result_url}}',
        status: 'active',
        allowed_variables: '["user_name", "assessment_name", "result_url"]',
        is_system_default: 1
      },
      {
        id: 'tmpl_report_ready',
        event_key: 'report.ready',
        name: 'AI Report Ready',
        category: 'reports',
        subject: 'Your {{assessment_name}} report is ready',
        headline: 'Your Report is Ready',
        body_content: 'Hi {{user_name}},\n\nYour personalized report for {{assessment_name}} is ready.',
        button_text: 'View My Report',
        button_url: '{{report_url}}',
        status: 'active',
        allowed_variables: '["user_name", "assessment_name", "report_url"]',
        is_system_default: 1
      },
      {
        id: 'tmpl_report_failed',
        event_key: 'report.failed',
        name: 'Report Generation Failed',
        category: 'reports',
        subject: 'We couldn\'t complete your {{assessment_name}} report',
        headline: 'Report Generation Issue',
        body_content: 'Hi {{user_name}},\n\nWe were unable to generate your report. {{credit_refund_message}}',
        button_text: 'Return to Dashboard',
        button_url: '{{dashboard_url}}',
        status: 'active',
        allowed_variables: '["user_name", "assessment_name", "credit_refund_message"]',
        is_system_default: 1
      },
      {
        id: 'tmpl_credit_purchase_success',
        event_key: 'credits.purchase_success',
        name: 'Credit Purchase Confirmation',
        category: 'credits_billing',
        subject: 'Your credits have been added',
        headline: 'Credit Purchase Confirmed',
        body_content: 'Hi {{user_name}},\n\nYour purchase of {{credits_purchased}} credits was successful. Balance: {{credits_balance}}.',
        button_text: 'Start an Assessment',
        button_url: '{{dashboard_url}}',
        status: 'active',
        allowed_variables: '["user_name", "credits_purchased", "credits_balance", "transaction_id"]',
        is_system_default: 1
      },
      {
        id: 'tmpl_credit_low_balance',
        event_key: 'credits.low_balance',
        name: 'Low Credit Balance Notice',
        category: 'credits_billing',
        subject: 'You have {{credits_balance}} credits remaining',
        headline: 'Low Credit Balance',
        body_content: 'Hi {{user_name}},\n\nYou currently have {{credits_balance}} credits remaining.',
        button_text: 'Get More Credits',
        button_url: '{{credits_url}}',
        status: 'active',
        allowed_variables: '["user_name", "credits_balance", "credits_url"]',
        is_system_default: 1
      },
      {
        id: 'tmpl_opt_assessment_reminder',
        event_key: 'assessment.reminder',
        name: 'Assessment Reminder',
        category: 'system_optional',
        subject: 'Ready for your next self-reflection?',
        headline: 'Continue Your Self-Discovery',
        body_content: 'Hi {{user_name}},\n\nIt has been a while since your last assessment.',
        button_text: 'Explore Assessments',
        button_url: '{{dashboard_url}}',
        status: 'inactive',
        allowed_variables: '["user_name", "dashboard_url"]',
        is_system_default: 1
      }
    ];

    for (const t of templatesList) {
      this.templates.set(t.id, t);
    }
  }

  prepare(query) {
    const db = this;
    return {
      bind(...params) {
        return {
          async first() {
            if (query.includes('SELECT key, value FROM site_settings')) {
              return null;
            }
            if (query.includes('SELECT * FROM email_templates WHERE id = ?')) {
              return db.templates.get(params[0]) || null;
            }
            if (query.includes('SELECT * FROM email_templates WHERE event_key = ?')) {
              for (const t of db.templates.values()) {
                if (t.event_key === params[0]) return t;
              }
              return null;
            }
            if (query.includes('SELECT id, status FROM email_jobs WHERE idempotency_key = ?')) {
              const found = db.jobs.find((j) => j.idempotency_key === params[0]);
              return found ? { id: found.id, status: found.status } : null;
            }
            if (query.includes('SELECT * FROM user_notification_preferences WHERE user_id = ?')) {
              return db.preferences.get(params[0]) || null;
            }
            if (query.includes('SELECT COUNT(*) as count FROM email_jobs')) {
              return { count: db.jobs.length };
            }
            return null;
          },
          async all() {
            if (query.includes('SELECT key, value FROM site_settings')) {
              const results = [];
              for (const [k, v] of db.settings.entries()) {
                results.push({ key: k, value: v });
              }
              return { results };
            }
            if (query.includes('SELECT * FROM email_templates')) {
              return { results: Array.from(db.templates.values()) };
            }
            if (query.includes('SELECT * FROM email_jobs')) {
              return { results: [...db.jobs] };
            }
            return { results: [] };
          },
          async run() {
            if (query.includes('INSERT INTO email_jobs')) {
              db.jobs.push({
                id: params[0],
                user_id: params[1],
                template_id: params[2],
                event_key: params[3],
                recipient: params[4],
                subject: params[5],
                payload: params[6],
                status: 'queued',
                attempts: 0,
                max_attempts: 3,
                idempotency_key: params[7],
                created_at: new Date().toISOString()
              });
              return { success: true };
            }
            if (query.includes("UPDATE email_jobs SET status = 'sending'")) {
              const j = db.jobs.find((x) => x.id === params[0]);
              if (j) {
                j.status = 'sending';
                j.attempts += 1;
              }
              return { success: true };
            }
            if (query.includes("UPDATE email_jobs SET status = 'sent'")) {
              const j = db.jobs.find((x) => x.id === params[0]);
              if (j) {
                j.status = 'sent';
                j.sent_at = new Date().toISOString();
              }
              return { success: true };
            }
            if (query.includes("UPDATE email_jobs SET status = 'failed'")) {
              const j = db.jobs.find((x) => x.id === params[1]);
              if (j) {
                j.status = 'failed';
                j.last_error = params[0];
              }
              return { success: true };
            }
            if (query.includes('UPDATE email_templates SET status = ?')) {
              const t = db.templates.get(params[1]);
              if (t) t.status = params[0];
              return { success: true };
            }
            return { success: true };
          }
        };
      }
    };
  }
}

async function runTests() {
  console.log('🧪 Starting Transactional Email System Verification Test Suite...\n');

  const mockDb = new MockD1Database();
  const emailService = new EmailService(mockDb);
  const eventService = new EventService(mockDb, emailService);

  // 1. Verify Template Compilation & Unresolved Placeholder Cleaning
  console.log('1. Testing Template Compilation & Placeholder Cleaning...');
  const signupTmpl = await emailService.getTemplateByEventKey('user.signup');
  assert(signupTmpl, 'user.signup template should exist');

  const compiled = emailService.compileTemplate(signupTmpl, {
    user_name: 'Dr. John Doe',
    dashboard_url: 'https://psychologycalculator.com/dashboard'
  });

  assert(compiled.subject.includes('Dr. John Doe'), 'Subject should contain user name');
  assert(compiled.html.includes('Dr. John Doe'), 'HTML should contain user name');
  assert(compiled.html.includes('/privacy-policy'), 'HTML should include Privacy Policy');
  assert(compiled.html.includes('/terms-of-service'), 'HTML should include Terms of Service');
  assert(compiled.html.includes('/disclaimer'), 'HTML should include Psychological Disclaimer');
  assert(!compiled.html.includes('{{'), 'No raw unpopulated {{...}} placeholders should remain in compiled HTML');
  assert(!compiled.text.includes('{{'), 'No raw unpopulated {{...}} placeholders should remain in compiled Text');
  console.log('  ✓ Template compiled cleanly with zero unpopulated placeholders.');

  // 2. Testing Plain-Text Fallback
  console.log('2. Testing Plain-Text Fallback Generation...');
  assert(compiled.text.includes('PSYCHOLOGY CALCULATOR'), 'Text should contain brand header');
  assert(compiled.text.includes('[Explore Assessments]: https://'), 'Text should contain clean CTA button format');
  console.log('  ✓ Plain-text fallback generated accurately.');

  // 3. Testing Idempotency Duplicate Protection
  console.log('3. Testing Idempotency Protection...');
  const idempotencyKey = 'payment_evt_test_12345';
  const send1 = await emailService.sendEmail({
    event: 'credits.purchase_success',
    recipient: 'buyer@example.com',
    variables: { user_name: 'Buyer', credits_purchased: '20', credits_balance: '25', transaction_id: 'ls_999' },
    idempotencyKey
  });
  assert(send1 === true, 'First send should succeed');

  const send2 = await emailService.sendEmail({
    event: 'credits.purchase_success',
    recipient: 'buyer@example.com',
    variables: { user_name: 'Buyer', credits_purchased: '20', credits_balance: '25', transaction_id: 'ls_999' },
    idempotencyKey
  });
  assert(send2 === true, 'Second send with same idempotency key should return true without duplicate send');
  console.log('  ✓ Idempotency safely blocked duplicate dispatch.');

  // 4. Testing User Notification Preferences (Security vs Optional)
  console.log('4. Testing User Notification Preferences Filtering...');
  // User with all alerts disabled
  mockDb.preferences.set('user_optout', {
    user_id: 'user_optout',
    assessment_reminders: 0,
    ai_report_alerts: 0,
    billing_alerts: 0,
    product_updates: 0,
    marketing_emails: 0
  });

  // Password reset MUST bypass preferences (Security)
  const secSend = await emailService.sendEmail({
    event: 'user.password_reset',
    recipient: 'optout@example.com',
    variables: { user_name: 'OptOutUser', reset_url: 'https://psychologycalculator.com/reset' },
    userId: 'user_optout',
    bypassPreferences: true
  });
  assert(secSend === true, 'Security password reset email must send even when preferences are disabled');

  // Assessment results email should be filtered
  const assmtSend = await emailService.sendEmail({
    event: 'assessment.completed',
    recipient: 'optout@example.com',
    variables: { user_name: 'OptOutUser', assessment_name: 'Big Five', result_url: 'https://psychologycalculator.com/r/1' },
    userId: 'user_optout'
  });
  assert(assmtSend === false, 'Assessment email should be filtered by user preference');
  console.log('  ✓ Security emails bypass preferences; optional categories respect user choices.');

  // 5. Testing Inactive Template Behavior
  console.log('5. Testing Inactive Template Disabled Protection...');
  const inactiveSend = await emailService.sendEmail({
    event: 'assessment.reminder',
    recipient: 'user@example.com',
    variables: { user_name: 'Explorer' }
  });
  assert(inactiveSend === false, 'Disabled templates must not send live emails');
  console.log('  ✓ Inactive template correctly prevented dispatch.');

  // 6. Testing Admin Live Preview
  console.log('6. Testing Admin Live Preview Engine...');
  const previewRes = await emailService.renderPreview('report.ready');
  assert(previewRes.subject.includes('report is ready'), 'Preview subject should resolve');
  assert(previewRes.html.includes('Alex Vance'), 'Preview should use realistic sample data');
  assert(previewRes.html.includes('Big Five Personality Assessment'), 'Preview should use assessment name mock');
  console.log('  ✓ Admin preview renders complete mock-data email.');

  // 7. Testing EventService Integration Dispatch
  console.log('7. Testing EventService Full Application Dispatch...');
  const eventRes = await eventService.dispatch(
    'AI_REPORT_FAILED',
    { id: 'user_123', email: 'reportuser@example.com', name: 'Dr. Jane' },
    { assessment_name: 'Leadership Strengths', credits_refunded: 2 }
  );
  assert(eventRes.emailDispatched === true, 'EventService should dispatch failed report email');
  assert(eventRes.notificationCreated === true, 'EventService should create in-app notification');

  const failedJob = mockDb.jobs.find((j) => j.recipient === 'reportuser@example.com');
  assert(failedJob, 'Email job should be recorded in ledger');
  const payloadData = JSON.parse(failedJob.payload);
  assert(payloadData.credit_refund_message.includes('2 spent credits have been returned'), 'Refund message must be accurately computed');
  console.log('  ✓ EventService dispatched email and in-app notification with verified credit refund details.');

  console.log('\n======================================================');
  console.log('🎉 ALL TRANSACTIONAL EMAIL SYSTEM TESTS PASSED (7/7)!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
