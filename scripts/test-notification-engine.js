import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { EmailService } from '../src/services/email.service.js';
import { NotificationService } from '../src/services/notifications/notification.service.js';
import { EventService } from '../src/services/events/event.service.js';

async function runTests() {
  console.log('\n=== Psychology Calculator Phase 14: Email, Notifications & Communication Test Suite ===\n');

  // 1. Initialize In-Memory SQLite Database
  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec('PRAGMA foreign_keys = ON;');

  const mockD1 = {
    prepare(query) {
      const stmt = rawDb.prepare(query);
      return {
        bind(...params) {
          return {
            async first() {
              return stmt.get(...params) || null;
            },
            async all() {
              const results = stmt.all(...params);
              return { results, success: true };
            },
            async run() {
              const info = stmt.run(...params);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        }
      };
    }
  };

  // Apply all 17 migrations in sequence
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    rawDb.exec(sql);
  }

  // Insert mock test user
  const userId = 'usr_test_ph14';
  rawDb.exec(`
    INSERT OR REPLACE INTO users (id, email, role, status, created_at)
    VALUES ('${userId}', 'testuser@example.com', 'user', 'active', datetime('now'))
  `);

  console.log('✔ In-memory SQLite initialized with 17 migrations, seed templates & mock user');

  // Track dispatched emails in mock provider
  const dispatchedEmails = [];
  const mockSmtpProvider = {
    async send(options) {
      dispatchedEmails.push(options);
      return true;
    }
  };

  const emailService = new EmailService(mockD1, mockSmtpProvider);
  const notificationService = new NotificationService(mockD1);
  const eventService = new EventService(mockD1, emailService, notificationService);

  // --- 1. Testing Default Seeded Email Templates ---
  console.log('\n--- 1. Testing Default Seeded Email Templates ---');
  const templates = await emailService.getTemplates();
  assert(templates.length >= 8, `Expected at least 8 default templates, found ${templates.length}`);

  const welcomeTmpl = await emailService.getTemplateByEventKey('welcome');
  assert(welcomeTmpl && welcomeTmpl.subject.includes('{{site_name}}'), 'Default welcome template verification failed');
  console.log(`✔ Verified ${templates.length} system event email templates seeded successfully`);

  // --- 2. Testing Safe Variable Interpolation & Header Sanitization ---
  console.log('\n--- 2. Testing Safe Variable Interpolation & Header Sanitization ---');
  const rendered = emailService.renderTemplate(welcomeTmpl, {
    user_name: 'Dr. Katherine',
    dashboard_url: 'https://psychologycalculator.com/dashboard/custom'
  });
  assert(rendered.subject.includes('Psychology Calculator, Dr. Katherine!'), `Rendered subject mismatch: ${rendered.subject}`);
  assert(rendered.html.includes('Hi Dr. Katherine,'), 'Rendered HTML variable replacement failed');

  // Header injection test
  const dirtyHeader = emailService.sanitizeHeader('Subject\r\nBcc: evil@hacker.com\nAnother line');
  assert(!dirtyHeader.includes('\r') && !dirtyHeader.includes('\n'), 'Header sanitization failed to strip newlines');
  assert(emailService.validateRecipient('good.user@example.com'), 'Valid email rejected');
  assert(!emailService.validateRecipient('bad\nemail@example.com'), 'Header injection email was not rejected');
  console.log('✔ Safe variable interpolation and header injection sanitization verified');

  // --- 3. Testing Dynamic Admin Template Customization (No Code Change) ---
  console.log('\n--- 3. Testing Dynamic Admin Template Customization ---');
  await emailService.upsertTemplate({
    event_key: 'assessment_completed',
    name: 'Custom Assessment Result Email',
    subject: '🎉 Your results for {{assessment_name}} have been calibrated!',
    html_body: '<p>Hello {{user_name}}, your {{assessment_name}} is complete. <a href="{{result_url}}">View Result</a></p>',
    text_body: 'Hello {{user_name}}, your {{assessment_name}} is complete: {{result_url}}',
    status: 'active'
  });

  const updatedTmpl = await emailService.getTemplateByEventKey('assessment_completed');
  assert(updatedTmpl.subject.includes('calibrated'), 'Custom template override failed');
  console.log('✔ Dynamic Admin email template upsert and override verified');

  // --- 4. Testing Email Queue Job Logging & Delivery Ledger ---
  console.log('\n--- 4. Testing Email Queue Job Logging & Delivery Ledger ---');
  dispatchedEmails.length = 0;
  const sendSuccess = await emailService.sendTemplate(
    'assessment_completed',
    'testuser@example.com',
    {
      user_name: 'Alex Vance',
      assessment_name: 'Big Five Personality Test',
      result_url: 'https://psychologycalculator.com/r/demo'
    },
    userId
  );
  assert(sendSuccess === true, 'sendTemplate failed');
  assert.strictEqual(dispatchedEmails.length, 1, 'Email provider was not called');

  const { jobs, total } = await emailService.getEmailJobs(10, 0);
  assert(total > 0 && jobs[0].status === 'sent' && jobs[0].recipient === 'testuser@example.com', 'Email job logging failed');
  console.log(`✔ Email job recorded in D1 ledger (Job ID: ${jobs[0].id}, Status: ${jobs[0].status})`);

  // --- 5. Testing In-App Notification Center Lifecycle ---
  console.log('\n--- 5. Testing In-App Notification Center Lifecycle ---');
  const notifId = await notificationService.createNotification(
    userId,
    'ai_report_ready',
    'AI Report Ready: Big Five',
    'Your deep psychological interpretation report is ready.',
    '/dashboard/reports/demo'
  );
  let unreadCount = await notificationService.getUnreadCount(userId);
  assert.strictEqual(unreadCount, 1, `Expected 1 unread notification, got ${unreadCount}`);

  await notificationService.markAsRead(notifId, userId);
  unreadCount = await notificationService.getUnreadCount(userId);
  assert.strictEqual(unreadCount, 0, `Expected 0 unread after markAsRead, got ${unreadCount}`);
  console.log(`✔ In-app notification lifecycle verified (ID: ${notifId}, read status updated)`);

  // --- 6. Testing User Communication Preferences & Filtering ---
  console.log('\n--- 6. Testing User Communication Preferences & Filtering ---');
  // Disable assessment reminders in user preferences
  await notificationService.updatePreferences(userId, {
    assessment_reminders: 0,
    ai_report_alerts: 1,
    billing_alerts: 1
  });

  dispatchedEmails.length = 0;
  const dispatchResult = await eventService.dispatch(
    'ASSESSMENT_COMPLETED',
    { id: userId, email: 'testuser@example.com', name: 'Alex' },
    { assessment_name: 'Big Five', result_url: 'https://psychologycalculator.com/r/demo' }
  );

  // Email should be skipped because user opted out of assessment_reminders, but in-app notification still created
  assert.strictEqual(dispatchResult.emailDispatched, false, 'Email was dispatched despite user preference disabling assessment_reminders');
  assert.strictEqual(dispatchResult.notificationCreated, true, 'In-app notification should have been created');

  // Mandatory security emails must ALWAYS dispatch regardless of preferences
  const securityDispatch = await eventService.dispatch(
    'PASSWORD_CHANGED',
    { id: userId, email: 'testuser@example.com', name: 'Alex' },
    {}
  );
  assert.strictEqual(securityDispatch.emailDispatched, true, 'Mandatory security email failed to dispatch');
  console.log('✔ User preferences filtering and mandatory security email enforcement verified');

  // --- 7. Testing End-to-End Multi-Channel Event Pipeline ---
  console.log('\n--- 7. Testing End-to-End Multi-Channel Event Pipeline ---');
  // AI Report Ready
  const aiDispatch = await eventService.dispatch(
    'AI_REPORT_READY',
    { id: userId, email: 'testuser@example.com', name: 'Alex' },
    { assessment_name: 'Big Five', report_url: 'https://psychologycalculator.com/dashboard/reports/1' }
  );
  assert(aiDispatch.emailDispatched && aiDispatch.notificationCreated, 'AI report event dispatch failed');

  // Billing Subscription Started
  const billingDispatch = await eventService.dispatch(
    'SUBSCRIPTION_STARTED',
    { id: userId, email: 'testuser@example.com', name: 'Alex' },
    { plan_name: 'Psychology Calculator Pro' }
  );
  assert(billingDispatch.emailDispatched && billingDispatch.notificationCreated, 'Billing event dispatch failed');

  // Contact Form Received
  const contactDispatch = await eventService.dispatch(
    'CONTACT_FORM_RECEIVED',
    { email: 'visitor@domain.com', name: 'Dr. Smith' },
    { subject: 'Academic Research Inquiry', message_preview: 'Interested in psychometric data' }
  );
  assert(contactDispatch.emailDispatched, 'Contact form confirmation email failed to dispatch');
  console.log('✔ End-to-end multi-channel event pipeline verified across Auth, AI, Billing, and Contact');

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE 14 EMAIL & NOTIFICATION TESTS PASSED!');
  console.log('============================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
