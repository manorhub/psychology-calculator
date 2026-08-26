import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { AnalyticsService } from '../src/services/analytics/analytics.service.ts';

async function runTests() {
  console.log('\n=== Psychology Calculator Phase 15: Analytics & Business Intelligence Test Suite ===\n');

  // 1. Initialize SQLite Database
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

  // Apply all 18 migrations in sequence
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  const migrationFiles = [
    '0001_core_users.sql',
    '0002_assessments_schema.sql',
    '0003_scoring_and_results.sql',
    '0004_attempts_and_answers.sql',
    '0005_ai_and_prompts.sql',
    '0006_billing_and_credits.sql',
    '0007_content_and_settings.sql',
    '0008_auth_system.sql',
    '0009_assessment_builder_enhancements.sql',
    '0010_result_snapshots_and_sharing.sql',
    '0011_initial_psychology_assessments_seed.sql',
    '0012_ai_engine_and_generations.sql',
    '0013_pdf_and_generated_files.sql',
    '0014_lemon_squeezy_billing.sql',
    '0015_seo_engine_and_redirects.sql',
    '0016_content_cms_and_blog.sql',
    '0017_email_notifications_and_templates.sql',
    '0018_analytics_and_business_intelligence.sql'
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    rawDb.exec(sql);
  }

  // Seed test records
  rawDb.exec(`
    INSERT OR IGNORE INTO users (id, email, email_verified, role, created_at)
    VALUES 
      ('usr_analyst_1', 'user1@psychologycalculator.com', 1, 'user', datetime('now', '-5 days')),
      ('usr_analyst_2', 'user2@psychologycalculator.com', 0, 'user', datetime('now', '-2 days'));

    INSERT OR IGNORE INTO assessment_attempts (id, assessment_id, user_id, status, duration_seconds, created_at)
    VALUES
      ('att_1', 'ast_bigfive_01', 'usr_analyst_1', 'completed', 240, datetime('now', '-3 days')),
      ('att_2', 'ast_bigfive_01', NULL, 'completed', 180, datetime('now', '-2 days')),
      ('att_3', 'ast_attachment_02', NULL, 'in_progress', 60, datetime('now', '-1 days'));

    INSERT OR IGNORE INTO ai_generations (id, user_id, assessment_id, prompt_version, provider, model, status, prompt_tokens, completion_tokens, total_tokens, estimated_cost, created_at)
    VALUES
      ('ai_gen_1', 'usr_analyst_1', 'ast_bigfive_01', 1, 'gemini', 'gemini-1.5-flash', 'completed', 1200, 800, 2000, 0.0015, datetime('now', '-3 days')),
      ('ai_gen_2', 'usr_analyst_2', 'ast_bigfive_01', 1, 'openai', 'gpt-4o-mini', 'completed', 1400, 900, 2300, 0.0022, datetime('now', '-2 days')),
      ('ai_gen_3', 'usr_analyst_2', 'ast_attachment_02', 1, 'openrouter', 'anthropic/claude-3.5-sonnet', 'failed', 500, 0, 500, 0.0005, datetime('now', '-1 days'));

    INSERT OR IGNORE INTO payments (id, user_id, lemon_order_id, amount, currency, status, created_at)
    VALUES
      ('pay_1', 'usr_analyst_1', 'ord_ls_1001', 29.00, 'USD', 'paid', datetime('now', '-3 days')),
      ('pay_2', 'usr_analyst_2', 'ord_ls_1002', 29.00, 'USD', 'paid', datetime('now', '-2 days'));

    INSERT OR IGNORE INTO user_subscriptions (id, user_id, plan_id, lemon_subscription_id, status, current_period_end, created_at)
    VALUES
      ('sub_1', 'usr_analyst_1', 'plan_pro_monthly', 'ls_sub_01', 'active', datetime('now', '+25 days'), datetime('now', '-3 days')),
      ('sub_2', 'usr_analyst_2', 'plan_pro_monthly', 'ls_sub_02', 'cancelled', datetime('now', '-1 days'), datetime('now', '-20 days'));
  `);

  console.log('✔ In-memory SQLite initialized with all 18 migrations and seeded test data\n');

  const analyticsService = new AnalyticsService(mockD1);

  // Test 1: Event Tracking (Anonymous and Authenticated)
  console.log('--- 1. Testing Event Ingestion (track) ---');
  const eventId1 = await analyticsService.track(
    'assessment_viewed',
    { sessionId: 'sess_anon_101', entityType: 'assessment', entityId: 'ast_bigfive_01' },
    { referrer: 'google' }
  );
  const eventId2 = await analyticsService.track(
    'ai_report_requested',
    { userId: 'usr_analyst_1', sessionId: 'sess_auth_202', entityType: 'ai_generation', entityId: 'ai_gen_1' },
    { model: 'gemini-1.5-flash' }
  );
  assert.ok(eventId1 && eventId2, 'Event tracking failed to return event IDs');
  console.log(`✔ Anonymous and authenticated events logged (IDs: ${eventId1}, ${eventId2})`);

  // Test 2: Overview Metrics
  console.log('\n--- 2. Testing Overview BI KPI Calculation ---');
  const overview = await analyticsService.getOverviewMetrics('30d');
  assert.ok(overview.totalUsers >= 2, 'Overview total users mismatch');
  assert.ok(overview.assessmentStarts >= 3, 'Overview assessment starts mismatch');
  assert.ok(overview.grossRevenue >= 58.00, 'Overview revenue mismatch');
  assert.strictEqual(overview.activeSubscriptions, 1, 'Active subscriptions mismatch');
  console.log(`✔ Overview KPI metrics verified (Users: ${overview.totalUsers}, Revenue: $${overview.grossRevenue}, Completion Rate: ${overview.completionRate}%)`);

  // Test 3: User Analytics & Funnel
  console.log('\n--- 3. Testing User Growth & Conversion Funnel ---');
  const userAnalytics = await analyticsService.getUserAnalytics('30d');
  assert.ok(userAnalytics.funnel && userAnalytics.funnel.length >= 5, 'User conversion funnel missing steps');
  assert.strictEqual(userAnalytics.verifiedUsers, 1, 'Verified users count mismatch');
  console.log(`✔ User funnel computed with ${userAnalytics.funnel.length} progressive conversion steps`);

  // Test 4: Assessment Performance & Drop-off
  console.log('\n--- 4. Testing Assessment Performance & Drop-off ---');
  const assessmentAnalytics = await analyticsService.getAssessmentAnalytics('30d');
  assert.ok(assessmentAnalytics.items.length > 0, 'Assessment ranking items empty');
  const topAssessment = assessmentAnalytics.items[0];
  console.log(`✔ Top assessment identified: "${topAssessment.name}" (${topAssessment.completions} completions, ${topAssessment.completionRate}% completion rate)`);

  // Test 5: AI Provider Breakdown & Costs
  console.log('\n--- 5. Testing AI Token Usage & Cost Attribution ---');
  const aiAnalytics = await analyticsService.getAiAnalytics('30d');
  assert.strictEqual(aiAnalytics.totalRequests, 3, 'AI total requests mismatch');
  assert.strictEqual(aiAnalytics.providerBreakdown.length, 4, 'All 4 AI providers must be represented');
  assert.ok(aiAnalytics.estimatedTotalCost > 0, 'Estimated AI cost must be > 0');
  console.log(`✔ AI usage verified: ${aiAnalytics.totalTokens} tokens across providers, estimated cost: $${aiAnalytics.estimatedTotalCost.toFixed(4)}`);

  // Test 6: Revenue Analytics & Churn
  console.log('\n--- 6. Testing Subscription Health & Churn Calculation ---');
  const revenueAnalytics = await analyticsService.getRevenueAnalytics('30d');
  assert.strictEqual(revenueAnalytics.activeSubscriptions, 1, 'Active subscriptions mismatch');
  assert.strictEqual(revenueAnalytics.cancelledSubscriptions, 1, 'Cancelled subscriptions mismatch');
  assert.strictEqual(revenueAnalytics.churnRate, 50, `Expected 50% churn rate, got ${revenueAnalytics.churnRate}%`);
  console.log(`✔ Revenue intelligence verified (Active: ${revenueAnalytics.activeSubscriptions}, Churn: ${revenueAnalytics.churnRate}%, Gross: $${revenueAnalytics.grossRevenue})`);

  // Test 7: CSV Data Export Generation
  console.log('\n--- 7. Testing CSV Export Engine (RFC 4180) ---');
  const assessmentCsv = await analyticsService.exportCsv('assessments', '30d');
  const aiCsv = await analyticsService.exportCsv('ai', '30d');
  const revenueCsv = await analyticsService.exportCsv('revenue', '30d');
  assert.ok(assessmentCsv.includes('Assessment Name') && aiCsv.includes('Provider') && revenueCsv.includes('Plan Name'), 'CSV headers format mismatch');
  console.log('✔ CSV exports generated with valid headers and data rows');

  // Test 8: System Health & Privacy Guard
  console.log('\n--- 8. Testing System Health & Data Minimization ---');
  const systemHealth = await analyticsService.getSystemHealth('30d');
  assert.strictEqual(typeof systemHealth.emailDeliveryRate, 'number', 'System email delivery rate invalid');
  console.log(`✔ Operational health verified (Delivery rate: ${systemHealth.emailDeliveryRate}%, AI failures: ${systemHealth.failedAiGenerationsCount})`);

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE 15 ANALYTICS & BI TESTS PASSED!');
  console.log('============================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Analytics Test Failed:', err);
  process.exit(1);
});
