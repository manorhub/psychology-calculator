import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { GrowthService } from '../src/services/growth/growth.service.ts';
import { ExperimentService } from '../src/services/growth/experiment.service.ts';
import { FeedbackService } from '../src/services/growth/feedback.service.ts';
import { RecommendationService } from '../src/services/growth/recommendation.service.ts';

function createMockD1(rawDb) {
  return {
    prepare(query) {
      const stmt = rawDb.prepare(query);
      return {
        bind(...params) {
          return {
            async all() {
              const rows = stmt.all(...params);
              return { results: rows, success: true, meta: {} };
            },
            async first(colName) {
              const row = stmt.get(...params);
              if (!row) return null;
              return colName ? row[colName] : row;
            },
            async run() {
              const info = stmt.run(...params);
              return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
            }
          };
        },
        async all() {
          const rows = stmt.all();
          return { results: rows, success: true, meta: {} };
        },
        async first(colName) {
          const row = stmt.get();
          if (!row) return null;
          return colName ? row[colName] : row;
        },
        async run() {
          const info = stmt.run();
          return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
        }
      };
    }
  };
}

async function runTests() {
  console.log('\n=== Psychology Calculator Phase 18: Growth & Conversion Optimization Test Suite ===\n');

  // 1. Initialize SQLite Database & Apply all 21 Migrations
  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec('PRAGMA foreign_keys = ON;');

  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf8');
      rawDb.exec(sql);
    }
  }

  const devSeedPath = path.resolve(process.cwd(), 'seeds/dev_seed.sql');
  if (fs.existsSync(devSeedPath)) {
    rawDb.exec(fs.readFileSync(devSeedPath, 'utf8'));
  }

  const mockD1 = createMockD1(rawDb);

  console.log('--- 1. Testing Conversion Funnel Calculation (GrowthService) ---');
  // Seed user first for foreign key integrity
  rawDb.prepare("INSERT INTO users (id, email, password_hash, role, status) VALUES ('u1', 'growth@test.com', 'hash', 'user', 'active')").run();

  // Seed sample analytics events
  const dateStr = new Date().toISOString();
  rawDb.prepare("INSERT INTO analytics_events (id, event_name, entity_type, entity_id, user_id, session_id, created_at) VALUES ('ev1', 'page_view', 'page', 'big-five-personality-test', 'u1', 'sess_1', ?)").run(dateStr);
  rawDb.prepare("INSERT INTO analytics_events (id, event_name, entity_type, entity_id, user_id, session_id, created_at) VALUES ('ev2', 'assessment_view', 'assessment', 'big-five-personality-test', 'u1', 'sess_1', ?)").run(dateStr);
  rawDb.prepare("INSERT INTO analytics_events (id, event_name, entity_type, entity_id, user_id, session_id, created_at) VALUES ('ev3', 'result_view', 'result', 'att_growth_1', 'u1', 'sess_1', ?)").run(dateStr);
  rawDb.prepare("INSERT INTO analytics_events (id, event_name, entity_type, entity_id, user_id, session_id, created_at) VALUES ('ev4', 'checkout_start', 'pricing', 'plan_pro_monthly', 'u1', 'sess_1', ?)").run(dateStr);

  // Seed attempt
  rawDb.prepare("INSERT INTO assessment_attempts (id, user_id, assessment_id, session_id, status, started_at, completed_at, created_at) VALUES ('att_growth_1', 'u1', 'asm_big_five', 'sess_1', 'completed', ?, ?, ?)").run(dateStr, dateStr, dateStr);
  rawDb.prepare("INSERT INTO ai_generations (id, attempt_id, user_id, provider, model, prompt_slug, status, total_tokens, estimated_cost, created_at) VALUES ('ai_growth_1', 'att_growth_1', 'u1', 'gemini', 'gemini-1.5-flash', 'assessment-interpretation', 'completed', 500, 0.0005, ?)").run(dateStr);
  rawDb.prepare("INSERT INTO subscriptions (id, user_id, plan_id, status, created_at) VALUES ('sub_growth_1', 'u1', 'plan_pro_monthly', 'active', ?)").run(dateStr);
  rawDb.prepare("INSERT INTO payments (id, user_id, subscription_id, amount, currency, status, created_at) VALUES ('pay_growth_1', 'u1', 'sub_growth_1', 14.99, 'USD', 'paid', ?)").run(dateStr);

  const growthService = new GrowthService(mockD1);
  const funnel = await growthService.getConversionFunnel(30);

  assert.strictEqual(funnel.length, 8);
  assert.strictEqual(funnel[0].stepName, 'Visitors');
  assert.ok(funnel[0].count >= 1);
  assert.strictEqual(funnel[2].stepName, 'Assessment Started');
  assert.strictEqual(funnel[3].stepName, 'Assessment Completed');
  assert.strictEqual(funnel[7].stepName, 'Paid Subscription');
  assert.ok(funnel[7].count >= 1);
  console.log(`✔ 8-step Conversion Funnel calculated: Visitors=${funnel[0].count} -> Completions=${funnel[3].count} -> Paid=${funnel[7].count}`);

  console.log('\n--- 2. Testing Assessment Conversion Stats & Question Drop-Off ---');
  const asmStats = await growthService.getAssessmentConversionStats('traffic');
  assert.ok(asmStats.length >= 8);
  const bigFiveStat = asmStats.find((s) => s.slug === 'big-five-personality-test');
  assert.ok(bigFiveStat);
  assert.ok(bigFiveStat.starts >= 1);
  assert.ok(bigFiveStat.completions >= 1);
  assert.ok(bigFiveStat.completionRate > 0);

  // Question drop-off
  const questionDropoff = await growthService.getQuestionDropoffStats('asm_big_five');
  assert.ok(questionDropoff.length >= 5);
  assert.strictEqual(questionDropoff[0].displayOrder, 1);
  console.log(`✔ Per-assessment analytics & ${questionDropoff.length} question drop-off diagnostics verified`);

  console.log('\n--- 3. Testing Dynamic CTA Placements & Performance Tracking ---');
  const ctas = await growthService.getCtaPlacements('assessment_result');
  assert.ok(ctas.length >= 1);
  const targetCta = ctas[0];
  assert.ok(targetCta.title.length > 5);

  // Track impressions, clicks, conversions
  await growthService.trackCtaEvent(targetCta.slug, 'cta_impression', 'u1', 'sess_1');
  await growthService.trackCtaEvent(targetCta.slug, 'cta_click', 'u1', 'sess_1');
  await growthService.trackCtaEvent(targetCta.slug, 'cta_conversion', 'u1', 'sess_1');

  const ctaPerformance = await growthService.getCtaPerformanceStats();
  const perf = ctaPerformance.find((c) => c.slug === targetCta.slug);
  assert.ok(perf);
  assert.ok(perf.clicks >= 1);
  assert.ok(perf.conversions >= 1);
  console.log(`✔ Dynamic CTA Placements and performance tracking verified (Clicks: ${perf.clicks}, Conv: ${perf.conversions})`);

  console.log('\n--- 4. Testing Lightweight A/B Testing Experiments (ExperimentService) ---');
  const expService = new ExperimentService(mockD1);

  // Create an experiment
  const expId = await expService.createExperiment({
    name: 'Result Page AI Report CTA Copy Test',
    slug: 'result-ai-cta-test',
    description: 'Testing action-oriented copy vs benefit copy',
    targetPlacement: 'assessment_result',
    primaryMetric: 'cta_click',
    variants: [
      { name: 'Control (Direct)', variantKey: 'control', payload: { title: 'Generate AI Report', button_text: 'Get Synthesis' }, weight: 50, isControl: true },
      { name: 'Variant A (Benefit)', variantKey: 'variant_a', payload: { title: 'Discover Your Blindspots with AI', button_text: 'Unlock Deep Analysis' }, weight: 50, isControl: false }
    ]
  });

  assert.ok(expId);
  await expService.setExperimentStatus(expId, 'running');

  // Verify deterministic assignment persistence
  const visitorSession = 'sess_growth_tester_999';
  const assign1 = await expService.getOrAssignVariant(expId, null, visitorSession);
  assert.ok(assign1);
  const assign2 = await expService.getOrAssignVariant(expId, null, visitorSession);
  assert.strictEqual(assign1.variant.id, assign2.variant.id, 'Visitor must consistently receive the same assigned variant');

  // Track conversions for variant
  await expService.trackConversion(expId, assign1.variant.id, 'cta_click', null, visitorSession);

  const report = await expService.getExperimentAnalytics(expId);
  assert.strictEqual(report.experiment.id, expId);
  assert.ok(report.totalParticipants >= 1);
  assert.ok(report.totalConversions >= 1);
  console.log(`✔ A/B Experiment deterministic assignment and conversion tracking verified (Variant: ${assign1.variant.variant_key})`);

  console.log('\n--- 5. Testing User Feedback Submission & Rate Limiting (FeedbackService) ---');
  const fbService = new FeedbackService(mockD1);

  // Submit valid feedback
  const fbResult = await fbService.submitFeedback({
    entityType: 'assessment',
    entityId: 'asm_big_five',
    userId: 'u1',
    sessionId: 'sess_1',
    rating: 5,
    isHelpful: true,
    comment: 'The Big Five personality evaluation was exceptionally clear and accurate.',
    ipAddress: '10.0.0.1'
  });
  assert.ok(fbResult.success);

  // Feedback summary
  const summary = await fbService.getFeedbackSummary('assessment', 'asm_big_five');
  assert.ok(summary.totalCount >= 1);
  assert.strictEqual(summary.helpfulPercentage, 100);
  assert.strictEqual(summary.averageRating, 5);
  assert.strictEqual(summary.ratingDistribution[5], 1);

  // Admin moderation
  const adminList = await fbService.getAdminFeedbackList('active', 10, 0);
  assert.ok(adminList.items.length >= 1);
  await fbService.updateFeedbackStatus(fbResult.id, 'reviewed');

  const reviewedList = await fbService.getAdminFeedbackList('reviewed', 10, 0);
  assert.ok(reviewedList.items.some((f) => f.id === fbResult.id));
  console.log(`✔ Feedback rating (5/5) and admin moderation workflow verified`);

  console.log('\n--- 6. Testing Safe Recommendation Engine (RecommendationService) ---');
  const recService = new RecommendationService(mockD1);

  const recAssessments = await recService.getRecommendedAssessments('asm_big_five', 'u1', 3);
  assert.ok(recAssessments.length >= 1);
  for (const rec of recAssessments) {
    assert.notStrictEqual(rec.id, 'asm_big_five', 'Should not recommend current assessment');
    assert.ok(rec.reason.includes('interested') || rec.reason.includes('Popular') || rec.reason.includes('Explore'));
    // Ensure no sensitive or diagnostic statements
    assert.ok(!rec.reason.toLowerCase().includes('disorder') && !rec.reason.toLowerCase().includes('diagnosis'));
  }

  const recArticles = await recService.getRelatedArticles('personality', 2);
  assert.ok(recArticles.length >= 0);
  console.log(`✔ Safe, non-diagnostic psychometric recommendations generated (${recAssessments.length} assessments)`);

  console.log('\n--- 7. Testing AI Cost vs Revenue Analytics (GrowthService) ---');
  const profitability = await growthService.getAiCostVsRevenue();
  assert.ok(profitability.totalRevenueUsd >= 14.99);
  assert.ok(profitability.estimatedAiCostUsd >= 0);
  assert.ok(profitability.netMarginUsd > 0);
  assert.ok(profitability.roiPercentage > 0);
  console.log(`✔ AI Profitability computed: Revenue=$${profitability.totalRevenueUsd} vs Cost=$${profitability.estimatedAiCostUsd} (Net Margin: $${profitability.netMarginUsd})`);

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE 18 GROWTH & CONVERSION TESTS PASSED!');
  console.log('============================================================\n');
}

runTests().catch((err) => {
  console.error('Growth test suite failed:', err);
  process.exit(1);
});
