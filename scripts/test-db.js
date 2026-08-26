import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('=== MindMetrics Phase 1: Database & DAL Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database with Foreign Keys ON
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');

console.log('✔ In-memory SQLite initialized with strict foreign keys enabled');

// 2. Load & Apply Migrations in Sequence
const migrationsDir = path.resolve(process.cwd(), 'migrations');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log(`\nFound ${migrationFiles.length} migration files:`);
for (const file of migrationFiles) {
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf-8');
  sqlite.exec(sql);
  console.log(`  ✔ Applied migration: ${file}`);
}

// 3. Verify Foreign Key Integrity of Fresh Schema
const fkCheck1 = sqlite.prepare('PRAGMA foreign_key_check').all();
assert.strictEqual(fkCheck1.length, 0, 'Foreign key errors found in migrations');
console.log('✔ Foreign key integrity verified on fresh migrations');

// 4. Apply Development Seed Data
const seedPath = path.resolve(process.cwd(), 'seeds/dev_seed.sql');
const seedSql = fs.readFileSync(seedPath, 'utf-8');
sqlite.exec(seedSql);
console.log('\n✔ Successfully applied seeds/dev_seed.sql');

const fkCheck2 = sqlite.prepare('PRAGMA foreign_key_check').all();
assert.strictEqual(fkCheck2.length, 0, 'Foreign key errors found after seeding');
console.log('✔ Foreign key integrity verified after seed');

// 5. Create Cloudflare D1 Mock Interface for Testing Service Layer
function createMockD1(rawDb) {
  return {
    prepare(query) {
      return {
        bind(...params) {
          return {
            async first() {
              const stmt = rawDb.prepare(query);
              const result = stmt.get(...params);
              return result || null;
            },
            async all() {
              const stmt = rawDb.prepare(query);
              const results = stmt.all(...params);
              return { results: results || [], success: true };
            },
            async run() {
              const stmt = rawDb.prepare(query);
              const info = stmt.run(...params);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async first() {
          const stmt = rawDb.prepare(query);
          return stmt.get() || null;
        },
        async all() {
          const stmt = rawDb.prepare(query);
          const results = stmt.all();
          return { results: results || [], success: true };
        },
        async run() {
          const stmt = rawDb.prepare(query);
          const info = stmt.run();
          return { success: true, meta: { changes: info.changes } };
        }
      };
    },
    async batch(statements) {
      for (const s of statements) {
        await s.run();
      }
      return [];
    }
  };
}

const mockD1 = createMockD1(sqlite);

// 6. Test Data Access Services
import { AssessmentService } from '../src/services/assessment.service.ts';
import { ScoringRuleService } from '../src/services/scoring-rule.service.ts';
import { AttemptService } from '../src/services/attempt.service.ts';
import { UserService } from '../src/services/user.service.ts';
import { BillingService } from '../src/services/billing.service.ts';
import { AiConfigService } from '../src/services/ai-config.service.ts';
import { ContentService } from '../src/services/content.service.ts';
import { ConfigService } from '../src/services/config.service.ts';

async function runTests() {
  console.log('\n--- Testing Service Layer Operations ---');

  // Test 1: AssessmentService
  const assessmentService = new AssessmentService(mockD1);
  const categories = await assessmentService.getCategories();
  assert.strictEqual(categories.length, 4, 'Expected 4 seeded categories');
  console.log(`✔ Categories queried: ${categories.map((c) => c.name).join(', ')}`);

  const assessments = await assessmentService.getFeaturedAssessments();
  assert.strictEqual(assessments.length, 1, 'Expected 1 featured assessment');
  assert.strictEqual(assessments[0].slug, 'big-five-personality');
  console.log(`✔ Featured assessment: ${assessments[0].name} (Category: ${assessments[0].category_name})`);

  const dimensions = await assessmentService.getDimensions(assessments[0].id);
  assert.strictEqual(dimensions.length, 5, 'Expected 5 dimensions for Big Five');
  console.log(`✔ Big Five dimensions: ${dimensions.map((d) => d.name).join(', ')}`);

  const questions = await assessmentService.getQuestions(assessments[0].id, true);
  assert.strictEqual(questions.length, 10, 'Expected 10 questions for Big Five');
  assert.strictEqual(questions[0].options.length, 5, 'Expected 5 options per question');
  console.log(`✔ Questions & Options: 10 items loaded with 5 Likert options each`);

  const resultTypes = await assessmentService.getResultTypes(assessments[0].id, true);
  assert.strictEqual(resultTypes.length, 3, 'Expected 3 result types');
  assert.strictEqual(resultTypes[0].contents.length, 3, 'Expected 3 content sections for High Openness');
  console.log(`✔ Result Types & Content: ${resultTypes.map((rt) => `${rt.name} (${rt.contents.length} sections)`).join(', ')}`);

  // Test 2: ScoringRuleService
  const scoringRuleService = new ScoringRuleService(mockD1);
  const scoringRules = await scoringRuleService.getRulesByAssessment(assessments[0].id);
  assert.strictEqual(scoringRules.length, 50, 'Expected 50 scoring rules (10 questions x 5 options)');
  console.log(`✔ Scoring Rules: 50 rules validated for Big Five assessment`);

  // Test 3: UserService & Profile
  const userService = new UserService(mockD1);
  const testUser = await userService.createUser({
    email: 'tester@example.com',
    role: 'user',
    displayName: 'Jane Doe'
  });
  assert.strictEqual(testUser.email, 'tester@example.com');
  const profile = await userService.getProfile(testUser.id);
  assert.strictEqual(profile?.display_name, 'Jane Doe');
  console.log(`✔ User & Profile: Created user ${testUser.email} with profile ${profile?.display_name}`);

  // Test 4: BillingService & Credits
  const billingService = new BillingService(mockD1);
  const plans = await billingService.getPlans();
  assert.strictEqual(plans.length, 3, 'Expected 3 subscription plans');
  console.log(`✔ Subscription Plans: ${plans.map((p) => `${p.name} ($${p.price})`).join(', ')}`);

  const initialBalance = await billingService.getCreditBalance(testUser.id);
  assert.strictEqual(initialBalance, 0);

  const updatedBalance = await billingService.addCreditTransaction({
    userId: testUser.id,
    amount: 10,
    transactionType: 'signup_bonus',
    source: 'system'
  });
  assert.strictEqual(updatedBalance, 10);
  console.log(`✔ Credit Transaction & Ledger: Granted 10 bonus credits, new balance: ${updatedBalance}`);

  // Test 5: AttemptService
  const attemptService = new AttemptService(mockD1);
  const attempt = await attemptService.createAttempt({
    userId: testUser.id,
    assessmentId: assessments[0].id,
    sessionId: 'session_test_123'
  });
  assert.strictEqual(attempt.status, 'in_progress');

  // Record an answer
  await attemptService.saveAnswer({
    attemptId: attempt.id,
    questionId: questions[0].id,
    optionId: questions[0].options[4].id, // Strongly Agree
    answerValue: '5'
  });
  const answers = await attemptService.getAttemptAnswers(attempt.id);
  assert.strictEqual(answers.length, 1);
  assert.strictEqual(answers[0].answer_value, '5');

  // Record scores
  await attemptService.saveScores([
    {
      id: crypto.randomUUID(),
      attempt_id: attempt.id,
      dimension_id: dimensions[0].id,
      raw_score: 9.0,
      normalized_score: 90.0,
      percentage: 90.0,
      result_type_id: resultTypes[0].id
    }
  ]);
  const scores = await attemptService.getAttemptScores(attempt.id);
  assert.strictEqual(scores.length, 1);
  assert.strictEqual(scores[0].normalized_score, 90.0);

  // Complete attempt and generate report
  await attemptService.updateAttemptStatus(attempt.id, 'completed', 10);
  const completedAttempt = await attemptService.getAttemptById(attempt.id);
  assert.strictEqual(completedAttempt?.status, 'completed');

  const report = await attemptService.createReport({
    id: crypto.randomUUID(),
    user_id: testUser.id,
    attempt_id: attempt.id,
    report_type: 'basic',
    status: 'completed',
    file_reference: null,
    content_data: JSON.stringify({ summary: 'High Openness Profile' }),
    error_message: null,
    generated_at: new Date().toISOString()
  });
  assert.strictEqual(report.status, 'completed');
  console.log(`✔ Assessment Attempt & Flow: Attempt created, answer recorded, scores saved, and report generated`);

  // Test 6: ContentService (Pages, FAQs, Feature Flags, SEO)
  const contentService = new ContentService(mockD1);
  const aboutPage = await contentService.getPageBySlug('about');
  assert.ok(aboutPage, 'About page should exist');
  assert.strictEqual(aboutPage.slug, 'about');

  const globalFaqs = await contentService.getFaqs({ entityType: 'global' });
  assert.strictEqual(globalFaqs.length, 4, 'Expected 4 global FAQs');

  const flags = await contentService.getFeatureFlags();
  assert.strictEqual(flags.ai_reports, true);
  assert.strictEqual(flags.pdf_reports, false);
  console.log(`✔ Dynamic CMS & Flags: Loaded "${aboutPage.title}", ${globalFaqs.length} FAQs, and feature flags (AI: ${flags.ai_reports})`);

  // Test 7: AiConfigService
  const aiConfigService = new AiConfigService(mockD1);
  const aiConfigs = await aiConfigService.getConfigurations();
  assert.strictEqual(aiConfigs.length, 2, 'Expected 2 AI configs');
  const prompt = await aiConfigService.getPromptBySlug('assessment-synthesis');
  assert.ok(prompt, 'Synthesis prompt should exist');
  console.log(`✔ AI Configs & Prompts: Active models [${aiConfigs.map((c) => `${c.provider}/${c.model}`).join(', ')}], Prompt: "${prompt.name}"`);

  // Test 8: ConfigService
  const configService = new ConfigService(mockD1);
  const dynamicConfig = await configService.getSiteConfig(true);
  assert.strictEqual(dynamicConfig.siteName, 'MindMetrics');
  assert.strictEqual(dynamicConfig.features.enableAiReports, true);
  console.log(`✔ Dynamic Config Service: Resolved dynamic site settings & features for "${dynamicConfig.siteName}"`);

  console.log('\n========================================');
  console.log('🎉 ALL PHASE 1 DATABASE & DAL TESTS PASSED!');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
