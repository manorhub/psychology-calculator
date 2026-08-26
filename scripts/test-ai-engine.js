import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('=== Psychology Calculator Phase 8: AI Interpretation Engine Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');

console.log('✔ In-memory SQLite initialized with strict foreign keys enabled');

// 2. Load & Apply All Migrations (0001 through 0012)
const migrationsDir = path.resolve(process.cwd(), 'migrations');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf-8');
  sqlite.exec(sql);
}

const fkCheck = sqlite.prepare('PRAGMA foreign_key_check').all();
assert.strictEqual(fkCheck.length, 0, 'Foreign key errors found in migrations');
console.log(`✔ Foreign key integrity verified across all ${migrationFiles.length} migrations`);

// 3. Apply Seeds
const seedPath = path.resolve(process.cwd(), 'seeds/dev_seed.sql');
const seedSql = fs.readFileSync(seedPath, 'utf-8');
sqlite.exec(seedSql);
console.log('✔ Development seed data applied');

// 4. Create Cloudflare D1 Mock Interface
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

// 5. Import Services
import { AssessmentRuntimeService } from '../src/services/assessment-runtime.service.ts';
import { AIService } from '../src/services/ai/ai.service.ts';
import { AIValidator } from '../src/services/ai/ai-validator.ts';
import { CreditService } from '../src/services/credit.service.ts';

async function runAIEngineTests() {
  const runtimeService = new AssessmentRuntimeService(mockD1);
  const creditService = new CreditService(mockD1);
  const aiService = new AIService(mockD1, {});

  console.log('\n--- 1. Testing Assessment Completion & Baseline Result ---');
  // Seed an authenticated user with credit balance
  const testUserId = 'usr_ai_tester';
  sqlite.exec(`INSERT OR IGNORE INTO users (id, email, role, status) VALUES ('${testUserId}', 'ai_tester@example.com', 'user', 'active')`);
  sqlite.exec(`INSERT OR IGNORE INTO user_credits (user_id, balance, lifetime_purchased, lifetime_spent) VALUES ('${testUserId}', 15, 15, 0)`);

  const publicAssessment = await runtimeService.getPublishedAssessmentBySlug('big-five-personality-test');
  assert.ok(publicAssessment);

  const { attempt } = await runtimeService.startOrResumeAttempt(
    publicAssessment.assessment.id,
    testUserId,
    null
  );

  // Complete assessment
  for (const q of publicAssessment.questions) {
    const opt = q.options[q.options.length - 1] || q.options[0];
    await runtimeService.saveAnswer(attempt.id, q.id, opt.id, testUserId, null);
  }
  await runtimeService.completeAttempt(attempt.id, testUserId, null);
  console.log(`✔ Completed assessment attempt for user ${testUserId} (Attempt ID: ${attempt.id})`);

  console.log('\n--- 2. Testing AI Report Generation & Structured Schema Validation ---');
  const reportData = await aiService.generateReportForAttempt(attempt.id, testUserId, null);

  assert.ok(reportData.reportId);
  assert.strictEqual(reportData.assessmentName, 'Big Five (OCEAN) Personality Test');
  assert.ok(reportData.content.summary.length > 50);
  assert.ok(reportData.content.key_traits.length >= 3);
  assert.ok(reportData.content.strengths.length >= 3);
  assert.ok(reportData.content.practical_suggestions.length >= 3);
  console.log(`✔ Generated AI report "${reportData.reportId}":`);
  console.log(`  • Summary: ${reportData.content.summary.substring(0, 80)}...`);
  console.log(`  • Key Traits: ${reportData.content.key_traits.join(', ')}`);

  console.log('\n--- 3. Testing Credit Ledger Integration & Duplicate Generation Prevention ---');
  // Check credit balance (started with 15, cost is 5, remaining must be 10)
  const userBalance = await creditService.getUserBalance(testUserId);
  assert.strictEqual(userBalance.balance, 10, 'Expected balance 10 after 5 credits spent');
  console.log(`✔ Credits deducted accurately: New balance = ${userBalance.balance} credits`);

  // Requesting generation AGAIN for the same completed attempt must return cached report without deducting credits
  const secondCall = await aiService.generateReportForAttempt(attempt.id, testUserId, null);
  assert.strictEqual(secondCall.reportId, reportData.reportId);
  const balanceAfterSecond = await creditService.getUserBalance(testUserId);
  assert.strictEqual(balanceAfterSecond.balance, 10, 'Duplicate generation did not double charge');
  console.log('✔ Duplicate report generation handled idempotently without additional credit deductions');

  console.log('\n--- 4. Testing Structured Validator & Content Sanitization ---');
  const mockValidJson = JSON.stringify({
    summary: 'A valid comprehensive psychological evaluation with rich insights.',
    key_traits: ['Trait 1', 'Trait 2'],
    strengths: ['Strength 1', 'Strength 2'],
    challenges: ['Challenge 1'],
    communication: 'Clear and direct.',
    relationships: 'Warm and trusting.',
    work_style: 'Systematic.',
    growth_opportunities: ['Opportunity 1'],
    practical_suggestions: ['Practice 1', 'Practice 2']
  });
  const validated = AIValidator.validateAndSanitize(mockValidJson);
  assert.strictEqual(validated.key_traits.length, 2);
  assert.strictEqual(validated.practical_suggestions.length, 2);
  console.log('✔ Valid structured JSON parsed and sanitized successfully');

  // Test malformed JSON
  assert.throws(
    () => {
      AIValidator.validateAndSanitize('NOT_JSON_DATA');
    },
    /Failed to parse AI response as JSON/,
    'Rejected malformed JSON'
  );
  console.log('✔ Malformed AI output caught by schema validator');

  console.log('\n--- 5. Testing Report Security & Authorization ---');
  // Foreign user attempting to access report must fail
  sqlite.exec("INSERT OR IGNORE INTO users (id, email, role, status) VALUES ('usr_intruder', 'intruder@evil.com', 'user', 'active')");
  await assert.rejects(
    async () => {
      await aiService.getReport(reportData.reportId, 'usr_intruder', null);
    },
    /Unauthorized/,
    'Blocked unauthorized report access'
  );
  console.log('✔ Unauthorized user blocked from accessing private report');

  // Authorized user successfully accesses report
  const fetchedReport = await aiService.getReport(reportData.reportId, testUserId, null);
  assert.strictEqual(fetchedReport.reportId, reportData.reportId);
  assert.strictEqual(fetchedReport.userId, testUserId);
  console.log('✔ Report owner successfully retrieved report');

  console.log('\n--- 6. Testing Admin AI Analytics & Management ---');
  const analytics = await aiService.getAIAnalytics();
  assert.ok(analytics.totalGenerations >= 1);
  assert.ok(analytics.successfulGenerations >= 1);
  assert.ok(analytics.totalTokens > 0);
  console.log(`✔ Admin analytics: ${analytics.totalGenerations} generations, ${analytics.totalTokens} tokens, $${analytics.totalEstimatedCost} cost`);

  const configs = await aiService.getConfigs();
  assert.ok(configs.length >= 4, 'OpenAI, Gemini, OpenRouter, DeepSeek present');
  console.log(`✔ Admin configs: ${configs.map((c) => `${c.provider} (${c.model})`).join(', ')}`);

  const prompts = await aiService.getPrompts();
  assert.ok(prompts.length >= 1);
  console.log(`✔ Admin prompts: ${prompts.map((p) => `${p.slug} (v${p.version})`).join(', ')}`);

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE 8 AI ENGINE TESTS PASSED!');
  console.log('============================================================\n');
}

runAIEngineTests().catch((err) => {
  console.error('❌ AI Engine Test failed:', err);
  process.exit(1);
});
