import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('=== Psychology Calculator Phase 9: User Dashboard Test Suite ===\n');

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
import { DashboardService } from '../src/services/dashboard.service.ts';
import { AssessmentRuntimeService } from '../src/services/assessment-runtime.service.ts';
import { AIService } from '../src/services/ai/ai.service.ts';
import { UserService } from '../src/services/user.service.ts';
import { CreditService } from '../src/services/credit.service.ts';

async function runUserDashboardTests() {
  const dashboardService = new DashboardService(mockD1);
  const runtimeService = new AssessmentRuntimeService(mockD1);
  const aiService = new AIService(mockD1, {});
  const userService = new UserService(mockD1);
  const creditService = new CreditService(mockD1);

  console.log('\n--- 1. Testing User Creation & Profile Initialization ---');
  const userA = await userService.createUser({
    email: 'user_a@example.com',
    displayName: 'Alice Walker'
  });
  const userB = await userService.createUser({
    email: 'user_b@example.com',
    displayName: 'Bob Smith'
  });

  assert.strictEqual(userA.email, 'user_a@example.com');
  assert.strictEqual(userB.email, 'user_b@example.com');
  console.log(`✔ Created User A (${userA.id}) and User B (${userB.id})`);

  // Grant credits
  await creditService.addCredits(userA.id, 20, 'admin_adjustment', 'Initial test grant');
  await creditService.addCredits(userB.id, 10, 'admin_adjustment', 'Initial test grant');

  console.log('\n--- 2. Testing In-Progress Assessment Tracking & Resumption ---');
  const bigFive = await runtimeService.getPublishedAssessmentBySlug('big-five-personality-test');
  assert.ok(bigFive);

  // User A starts Big Five and answers 4 questions
  const { attempt: attemptA } = await runtimeService.startOrResumeAttempt(bigFive.assessment.id, userA.id, null);
  for (let i = 0; i < 4; i++) {
    const q = bigFive.questions[i];
    const opt = q.options[0];
    await runtimeService.saveAnswer(attemptA.id, q.id, opt.id, userA.id, null);
  }

  const activeA = await dashboardService.getActiveInProgressAttempt(userA.id);
  assert.ok(activeA);
  assert.strictEqual(activeA.attemptId, attemptA.id);
  assert.strictEqual(activeA.assessmentName, 'Big Five (OCEAN) Personality Test');
  assert.strictEqual(activeA.answeredCount, 4);
  assert.strictEqual(activeA.totalQuestions, 10);
  console.log(`✔ User A in-progress attempt tracked: ${activeA.answeredCount}/${activeA.totalQuestions} questions answered`);

  // Verify User B has NO in-progress attempts
  const activeB = await dashboardService.getActiveInProgressAttempt(userB.id);
  assert.strictEqual(activeB, null, 'User B should have no active in-progress attempt');
  console.log('✔ Strict isolation: User B has 0 active attempts');

  console.log('\n--- 3. Testing Completed Assessment & Result Summary ---');
  // Finish User A's Big Five attempt
  for (let i = 4; i < bigFive.questions.length; i++) {
    const q = bigFive.questions[i];
    const opt = q.options[q.options.length - 1];
    await runtimeService.saveAnswer(attemptA.id, q.id, opt.id, userA.id, null);
  }
  await runtimeService.completeAttempt(attemptA.id, userA.id, null);

  const resultsA = await dashboardService.getUserResults(userA.id);
  assert.strictEqual(resultsA.length, 1);
  assert.strictEqual(resultsA[0].assessmentName, 'Big Five (OCEAN) Personality Test');
  assert.ok(resultsA[0].normalizedScore > 0);
  assert.ok(resultsA[0].primaryArchetype);
  console.log(`✔ User A completed result cataloged: "${resultsA[0].primaryArchetype}" (Score: ${resultsA[0].normalizedScore}%)`);

  // Verify User B still has 0 completed results
  const resultsB = await dashboardService.getUserResults(userB.id);
  assert.strictEqual(resultsB.length, 0);
  console.log('✔ Strict isolation: User B has 0 completed results');

  console.log('\n--- 4. Testing AI Report History & Multi-User Isolation ---');
  // Generate AI report for User A
  const reportA = await aiService.generateReportForAttempt(attemptA.id, userA.id, null);
  assert.ok(reportA.reportId);

  const reportsA = await dashboardService.getUserReports(userA.id);
  assert.strictEqual(reportsA.length, 1);
  assert.strictEqual(reportsA[0].reportId, reportA.reportId);
  assert.strictEqual(reportsA[0].status, 'completed');
  console.log(`✔ User A AI report listed in dashboard: "${reportsA[0].assessmentName}" (${reportsA[0].reportId})`);

  // User B report list must be empty
  const reportsB = await dashboardService.getUserReports(userB.id);
  assert.strictEqual(reportsB.length, 0);
  console.log('✔ Strict isolation: User B report catalog is empty');

  console.log('\n--- 5. Testing Dashboard Overview Aggregates ---');
  const overviewA = await dashboardService.getDashboardOverview(userA.id);
  assert.strictEqual(overviewA.completedCount, 1);
  assert.strictEqual(overviewA.reportsCount, 1);
  assert.strictEqual(overviewA.creditBalance, 15); // 20 granted - 5 spent on AI report = 15
  assert.strictEqual(overviewA.recentResults.length, 1);
  assert.strictEqual(overviewA.recentReports.length, 1);
  console.log(`✔ User A Dashboard Overview: ${overviewA.completedCount} completed, ${overviewA.reportsCount} AI reports, ${overviewA.creditBalance} credits`);

  const overviewB = await dashboardService.getDashboardOverview(userB.id);
  assert.strictEqual(overviewB.completedCount, 0);
  assert.strictEqual(overviewB.reportsCount, 0);
  assert.strictEqual(overviewB.creditBalance, 10);
  console.log(`✔ User B Dashboard Overview: ${overviewB.completedCount} completed, ${overviewB.reportsCount} AI reports, ${overviewB.creditBalance} credits`);

  console.log('\n--- 6. Testing Credit Ledger History ---');
  const creditHistoryA = await dashboardService.getCreditHistory(userA.id);
  assert.strictEqual(creditHistoryA.balance, 15);
  assert.strictEqual(creditHistoryA.transactions.length, 2); // 1 grant (+20), 1 usage (-5)
  console.log(`✔ User A credit history: ${creditHistoryA.transactions.length} ledger transactions verified`);

  console.log('\n--- 7. Testing User Profile Updating & Validation ---');
  await userService.updateProfile(userA.id, {
    display_name: 'Alice W. Johnson',
    timezone: 'America/New_York',
    locale: 'en'
  });
  const updatedProfA = await userService.getProfile(userA.id);
  assert.strictEqual(updatedProfA?.display_name, 'Alice W. Johnson');
  assert.strictEqual(updatedProfA?.timezone, 'America/New_York');
  console.log(`✔ Profile updated: ${updatedProfA?.display_name}, Timezone: ${updatedProfA?.timezone}`);

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE 9 USER DASHBOARD TESTS PASSED!');
  console.log('============================================================\n');
}

runUserDashboardTests().catch((err) => {
  console.error('❌ User Dashboard Test failed:', err);
  process.exit(1);
});
