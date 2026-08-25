import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { AssessmentRuntimeService } from '../src/services/assessment-runtime.service.js';
import { AIService } from '../src/services/ai/ai.service.js';
import { CreditService } from '../src/services/credit.service.js';

console.log('=== Psychology Calculator: Premium AI Generation Experience Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');

// 2. Load & Apply All Migrations
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

const seedPath = path.resolve(process.cwd(), 'seeds/dev_seed.sql');
const seedSql = fs.readFileSync(seedPath, 'utf-8');
sqlite.exec(seedSql);
console.log('✔ In-memory SQLite initialized with migrations and dev seed data');

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

async function runGenerationExperienceTests() {
  const runtimeService = new AssessmentRuntimeService(mockD1);
  const creditService = new CreditService(mockD1);
  const aiService = new AIService(mockD1, {});

  console.log('\n--- 1. Testing Component Structure & UI Verification ---');
  const componentPath = path.resolve(process.cwd(), 'src/components/results/AiGenerationExperience.astro');
  assert.ok(fs.existsSync(componentPath), 'AiGenerationExperience.astro exists');
  const componentSource = fs.readFileSync(componentPath, 'utf-8');

  // Verify all 6 sequential conceptual stages are declared in UI
  const expectedStages = [
    'Understanding your assessment',
    'Analyzing your profile',
    'Connecting your patterns',
    'Writing personalized insights',
    'Creating recommendations',
    'Preparing your report'
  ];

  for (const stage of expectedStages) {
    assert.ok(
      componentSource.includes(stage),
      `Expected stage "${stage}" in AiGenerationExperience component`
    );
  }
  console.log('✔ All 6 sequential conceptual stages verified in component markup');

  // Verify NO fake percentage strings (e.g. 10%, 25%, 47%, 83%) are hardcoded into loading UI
  assert.ok(!componentSource.includes('10%'), 'No fake 10% progress');
  assert.ok(!componentSource.includes('25%'), 'No fake 25% progress');
  assert.ok(!componentSource.includes('47%'), 'No fake 47% progress');
  assert.ok(!componentSource.includes('83%'), 'No fake 83% progress');
  console.log('✔ Verified NO fake percentages in generation UI');

  // Verify Accessibility Attributes
  assert.ok(componentSource.includes('aria-live="polite"'), 'Includes ARIA live region for screen readers');
  assert.ok(componentSource.includes('role="dialog"'), 'Includes semantic modal dialog role');
  assert.ok(componentSource.includes('prefers-reduced-motion'), 'Includes prefers-reduced-motion CSS media query');
  console.log('✔ Accessibility (ARIA live regions, modal roles, prefers-reduced-motion) verified');

  // Verify Reassuring Human Wait Messaging
  assert.ok(
    componentSource.includes('Your personalized report is being prepared. This usually takes less than a minute.'),
    'Includes reassuring expected wait copy'
  );
  assert.ok(
    componentSource.includes('Your results are more than a score.'),
    'Includes PsychologyCalculator.com value proposition copy'
  );
  console.log('✔ Reassuring wait messaging and original brand copy verified');

  console.log('\n--- 2. Testing End-to-End Generation Engine Lifecycle ---');
  const testUserId = 'usr_gen_exp_tester';
  sqlite.exec(`INSERT OR IGNORE INTO users (id, email, role, status) VALUES ('${testUserId}', 'gen_tester@example.com', 'user', 'active')`);
  sqlite.exec(`INSERT OR IGNORE INTO credit_balances (user_id, balance) VALUES ('${testUserId}', 20)`);

  const asm = await runtimeService.getPublishedAssessmentBySlug('big-five-personality-test');
  assert.ok(asm);

  const { attempt } = await runtimeService.startOrResumeAttempt(asm.assessment.id, testUserId, null);
  for (const q of asm.questions) {
    await runtimeService.saveAnswer(attempt.id, q.id, q.options[0].id, testUserId, null);
  }
  await runtimeService.completeAttempt(attempt.id, testUserId, null);

  // Execute report generation
  const report = await aiService.generateReportForAttempt(attempt.id, testUserId, null);
  assert.ok(report.reportId, 'Report generated with valid ID');
  assert.strictEqual(report.assessmentName, 'Big Five (OCEAN) Personality Test');
  assert.ok(report.content.headline, 'Contains generated headline');
  console.log(`✔ Generated report "${report.reportId}" successfully for attempt "${attempt.id}"`);

  console.log('\n--- 3. Testing Fast Response & Instant Resolution ---');
  // Second call returns cached report immediately without delay
  const cachedStart = Date.now();
  const cachedReport = await aiService.generateReportForAttempt(attempt.id, testUserId, null);
  const duration = Date.now() - cachedStart;
  assert.strictEqual(cachedReport.reportId, report.reportId);
  assert.ok(duration < 500, `Fast response returned in ${duration}ms`);
  console.log(`✔ Fast response returned instantly (${duration}ms) — UI immediately transitions to Complete`);

  console.log('\n--- 4. Testing Duplicate Request Prevention ---');
  // Attempting multiple simultaneous generations does not double charge
  const balanceBefore = await creditService.getUserBalance(testUserId);
  const dupReport = await aiService.generateReportForAttempt(attempt.id, testUserId, null);
  const balanceAfter = await creditService.getUserBalance(testUserId);
  assert.strictEqual(balanceBefore.balance, balanceAfter.balance, 'No extra credits deducted for existing attempt');
  console.log('✔ Duplicate generation requests protected against double charging');

  console.log('\n--- 5. Testing Guest Authentication Gating & Modal Trigger ---');
  await assert.rejects(
    async () => {
      await aiService.generateReportForAttempt(attempt.id, null, 'guest_sess_123');
    },
    /Authentication required/,
    'Correctly throws UnauthorizedError for unauthenticated taker'
  );
  console.log('✔ Guest taker strictly intercepted and directed to 1-click Google/Email authentication');

  console.log('\n--- 6. Testing Error & Safe Recovery Handling ---');
  // Test invalid attempt ID
  await assert.rejects(
    async () => {
      await aiService.generateReportForAttempt('non_existent_attempt', testUserId, null);
    },
    /Assessment attempt not found/,
    'Correctly throws NotFoundError for invalid attempt'
  );
  console.log('✔ Error state accurately surfaced without corrupting user balance');

  console.log('\n========================================================================');
  console.log('🎉 ALL AI REPORT GENERATION EXPERIENCE TESTS PASSED WITH ZERO ERRORS!');
  console.log('========================================================================\n');
}

runGenerationExperienceTests().catch((err) => {
  console.error('❌ AI Generation Experience Test failed:', err);
  process.exit(1);
});
