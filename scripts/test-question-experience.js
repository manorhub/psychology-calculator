import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { AssessmentRuntimeService } from '../src/services/assessment-runtime.service.js';

console.log('=== Psychology Calculator: Interactive Question Experience Test Suite ===\n');

// 1. In-Memory SQLite Setup
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
            return {
              success: true,
              meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) }
            };
          }
        };
      },
      async first() {
        return stmt.get() || null;
      },
      async all() {
        const results = stmt.all();
        return { results, success: true };
      },
      async run() {
        const info = stmt.run();
        return {
          success: true,
          meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) }
        };
      }
    };
  }
};

// Apply all 25 migrations
const migrationsDir = path.resolve(process.cwd(), 'migrations');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  rawDb.exec(sql);
}

// Seed development fixtures
const seedSqlPath = path.resolve(process.cwd(), 'scripts', 'dev-seed.sql');
if (fs.existsSync(seedSqlPath)) {
  const seedSql = fs.readFileSync(seedSqlPath, 'utf8');
  rawDb.exec(seedSql);
}

console.log('✔ In-memory SQLite initialized with migrations and dev seed data');

async function runQuestionExperienceTests() {
  const runtimeService = new AssessmentRuntimeService(mockD1);

  console.log('\n--- 1. Testing Component Structure & UI Accessibility Verification ---');
  const takeAstroPath = path.resolve(process.cwd(), 'src/pages/assessments/[slug]/take.astro');
  assert.ok(fs.existsSync(takeAstroPath), 'take.astro exists');
  const takeAstroContent = fs.readFileSync(takeAstroPath, 'utf8');

  // Verify One Question at a time architecture
  assert.ok(takeAstroContent.includes('question-slide'), 'Must contain question-slide containers');
  assert.ok(takeAstroContent.includes('data-q-index'), 'Must track question indices');
  assert.ok(takeAstroContent.includes('progress-bar'), 'Must contain progress bar');
  assert.ok(takeAstroContent.includes('progress-step-text'), 'Must display step text (e.g. 1 of 25)');
  assert.ok(takeAstroContent.includes('auto-advance-toggle'), 'Must provide auto-advance toggle');
  assert.ok(takeAstroContent.includes('option-card'), 'Must render premium option cards');
  assert.ok(takeAstroContent.includes('selection-indicator'), 'Must render custom selection indicator');
  assert.ok(takeAstroContent.includes('calculating-screen'), 'Must render dedicated results calculation screen');
  assert.ok(takeAstroContent.includes('prefers-reduced-motion'), 'Must support prefers-reduced-motion accessibility');
  console.log('✔ Component structure, one-question card deck, and accessibility markers verified');

  console.log('\n--- 2. Testing End-to-End Question Flow & Non-Destructive Back Navigation ---');
  const testUserId = 'usr_runner_tester';
  rawDb.exec(`INSERT OR IGNORE INTO users (id, email, role, status) VALUES ('${testUserId}', 'runner@example.com', 'user', 'active')`);

  const assessmentObj = await runtimeService.getPublishedAssessmentBySlug('big-five-personality-test');
  assert.ok(assessmentObj);

  // Start attempt
  const { attempt } = await runtimeService.startOrResumeAttempt(assessmentObj.assessment.id, testUserId, null);
  assert.ok(attempt.id);

  // Answer Q1
  const q1 = assessmentObj.questions[0];
  const q1Option = q1.options[0];
  await runtimeService.saveAnswer(attempt.id, q1.id, q1Option.id, testUserId, null);

  // Answer Q2
  const q2 = assessmentObj.questions[1];
  const q2Option = q2.options[q2.options.length - 1];
  await runtimeService.saveAnswer(attempt.id, q2.id, q2Option.id, testUserId, null);

  // Retrieve attempt details (simulating user clicking Back or refreshing)
  const attemptData = await runtimeService.getAttemptWithAnswers(attempt.id, testUserId, null);
  assert.strictEqual(attemptData.answers.length, 2);
  const foundQ1 = attemptData.answers.find((a) => a.question_id === q1.id);
  const foundQ2 = attemptData.answers.find((a) => a.question_id === q2.id);
  assert.strictEqual(foundQ1?.option_id, q1Option.id, 'Q1 answer must be preserved on back/reload');
  assert.strictEqual(foundQ2?.option_id, q2Option.id, 'Q2 answer must be preserved on back/reload');
  console.log('✔ Non-destructive answer saving and back-navigation persistence verified');

  console.log('\n--- 3. Testing Real-time Completion & Scoring Transition ---');
  // Complete remaining questions
  for (let i = 2; i < assessmentObj.questions.length; i++) {
    const q = assessmentObj.questions[i];
    const opt = q.options[0];
    await runtimeService.saveAnswer(attempt.id, q.id, opt.id, testUserId, null);
  }

  const completionResult = await runtimeService.completeAttempt(attempt.id, testUserId, null);
  assert.strictEqual(completionResult.status, 'completed');
  assert.ok(completionResult.scores.length > 0, 'Scoring engine must compute dimension scores');
  assert.ok(completionResult.totalNormalizedScore >= 0, 'Total normalized score must be computed');
  console.log(`✔ Attempt finalized with status: "${completionResult.status}" and ${completionResult.scores.length} dimensional scores`);

  console.log('\n========================================================================');
  console.log('🎉 ALL QUESTION EXPERIENCE TESTS PASSED WITH ZERO ERRORS!');
  console.log('========================================================================\n');
}

runQuestionExperienceTests().catch((err) => {
  console.error('❌ Question experience test failed:', err);
  process.exit(1);
});
