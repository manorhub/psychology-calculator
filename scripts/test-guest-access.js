import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { AssessmentService } from '../src/services/assessment.service.ts';
import { AssessmentRuntimeService } from '../src/services/assessment-runtime.service.ts';
import { ResultService } from '../src/services/result.service.ts';
import { AuthService } from '../src/services/auth.service.ts';
import { SettingsService } from '../src/services/settings/settings.service.ts';
import { EntitlementService } from '../src/services/billing/entitlement.service.ts';
import { ForbiddenError } from '../src/lib/errors.ts';

console.log('=== Psychology Calculator Guest Assessment Access & Conversion Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database & Apply Migrations
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');

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
if (fs.existsSync(seedPath)) {
  const seedSql = fs.readFileSync(seedPath, 'utf-8');
  sqlite.exec(seedSql);
}

// 2. Cloudflare D1 Mock Wrapper
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
      const results = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results;
    },
    async exec(query) {
      rawDb.exec(query);
      return { count: 1, duration: 0 };
    }
  };
}

async function runTests() {
  const db = createMockD1(sqlite);

  const assessmentService = new AssessmentService(db);
  const runtimeService = new AssessmentRuntimeService(db);
  const resultService = new ResultService(db);
  const authService = new AuthService(db);
  const settingsService = new SettingsService(db);
  const entitlementService = new EntitlementService(db);

  // --- Test 1: Public Assessment Discovery Without Login ---
  console.log('--- 1. Testing Public Assessment Discovery Without Login ---');
  const publishedAssessments = await assessmentService.getAssessments({ status: 'published' });
  assert.ok(publishedAssessments.length > 0, 'Should find published assessments');
  const targetAssessment = publishedAssessments[0];
  assert.ok(targetAssessment, 'Target assessment should be discovered');

  const entitlement = await entitlementService.canTakeAssessment(null, 'free');
  assert.strictEqual(entitlement.allowed, true, 'Unauthenticated guest should be allowed to take free assessment');
  console.log(`✔ Public assessment discovery verified for: ${targetAssessment.name}`);

  // --- Test 2: Unauthenticated Guest Attempt Start ---
  console.log('\n--- 2. Testing Unauthenticated Guest Attempt Start ---');
  const guestSessionId = 'guest_session_' + crypto.randomUUID();
  const { attempt: guestAttempt, isResumed } = await runtimeService.startOrResumeAttempt(
    targetAssessment.id,
    null,
    guestSessionId
  );

  assert.ok(guestAttempt.id, 'Attempt ID must be generated');
  assert.strictEqual(guestAttempt.user_id, null, 'User ID must be null for guest');
  assert.strictEqual(guestAttempt.session_id, guestSessionId, 'Session ID must match guest session');
  assert.strictEqual(guestAttempt.status, 'in_progress');
  assert.strictEqual(isResumed, false);
  console.log(`✔ Guest attempt created: ${guestAttempt.id} (session: ${guestSessionId})`);

  // --- Test 3: Submitting Answers as Guest ---
  console.log('\n--- 3. Testing Guest Answer Submissions ---');
  const fullAssessment = await runtimeService.getPublishedAssessmentBySlug(targetAssessment.slug);
  assert.ok(fullAssessment && fullAssessment.questions.length > 0, 'Assessment questions must exist');

  for (const q of fullAssessment.questions) {
    if (q.options.length > 0) {
      await runtimeService.saveAnswer(guestAttempt.id, q.id, q.options[0].id, null, guestSessionId);
    }
  }

  const progress = await runtimeService.getAttemptProgress(guestAttempt.id, null, guestSessionId);
  assert.strictEqual(progress.answeredCount, fullAssessment.questions.length, 'All questions answered');
  console.log(`✔ Guest answers saved (${progress.answeredCount}/${fullAssessment.questions.length})`);

  // --- Test 4: Finalizing Attempt & Calculating Deterministic Scores ---
  console.log('\n--- 4. Testing Guest Attempt Completion & Scoring ---');
  const scoring = await runtimeService.completeAttempt(guestAttempt.id, null, guestSessionId);
  assert.ok(scoring.totalRawScore !== undefined, 'Raw score calculated');
  assert.ok(scoring.totalNormalizedScore !== undefined, 'Normalized score calculated');
  console.log(`✔ Attempt finalized with normalized score: ${scoring.totalNormalizedScore}%`);

  // --- Test 5: Instant Guest Result Access ---
  console.log('\n--- 5. Testing Instant Guest Result Snapshot Access ---');
  const resultData = await resultService.getResult(guestAttempt.id, null, guestSessionId);
  assert.ok(resultData.snapshot, 'Snapshot must be present');
  assert.strictEqual(resultData.snapshot.assessmentName, targetAssessment.name);
  assert.strictEqual(resultData.isSharedView, false);
  console.log('✔ Guest result retrieved successfully without login');

  // --- Test 6: IDOR Protection on Guest Results ---
  console.log('\n--- 6. Testing IDOR & Unauthorized Access Rejection ---');
  let rejected = false;
  try {
    await resultService.getResult(guestAttempt.id, null, 'unauthorized_session_hacker');
  } catch (err) {
    if (err instanceof ForbiddenError) {
      rejected = true;
    }
  }
  assert.strictEqual(rejected, true, 'Access with mismatched session ID must throw ForbiddenError');
  console.log('✔ IDOR protection verified: unauthenticated snooping blocked with 403');

  // --- Test 7: Guest -> Account Conversion & Result Linking ---
  console.log('\n--- 7. Testing Guest -> User Account Linking ---');
  const testUserEmail = `guest_convert_${Date.now()}@example.com`;
  await authService.register({
    name: 'Jane Doe',
    email: testUserEmail,
    password: 'Password123!',
    guestSessionId
  });

  // Verify attempt is now linked to the newly registered user
  const linkedAttempt = await db
    .prepare('SELECT * FROM assessment_attempts WHERE id = ?')
    .bind(guestAttempt.id)
    .first();

  assert.ok(linkedAttempt.user_id, 'Attempt user_id must be updated from null');

  // Verify authenticated user can now view their linked result
  const userResult = await resultService.getResult(guestAttempt.id, linkedAttempt.user_id, null);
  assert.ok(userResult.snapshot, 'Linked result must be accessible via user_id');
  console.log(`✔ Attempt successfully attached to account (${linkedAttempt.user_id})`);

  // --- Test 8: Dynamic Admin Settings for Assessments ---
  console.log('\n--- 8. Testing Dynamic Admin Assessment Settings ---');
  const settings = await settingsService.getGroup('assessments');
  assert.strictEqual(settings.guest_assessments_enabled, true);
  assert.strictEqual(settings.guest_results_enabled, true);

  // Test toggling guest assessments off
  await settingsService.set('guest_assessments_enabled', false, {}, 'admin_1');
  let guestBlocked = false;
  try {
    await runtimeService.startOrResumeAttempt(targetAssessment.id, null, 'new_guest_session_99');
  } catch (err) {
    if (err instanceof ForbiddenError) {
      guestBlocked = true;
    }
  }
  assert.strictEqual(guestBlocked, true, 'When disabled, guest attempt must throw ForbiddenError');

  // Re-enable
  await settingsService.set('guest_assessments_enabled', true, {}, 'admin_1');
  console.log('✔ Dynamic admin assessment toggles and policy enforcement verified');

  console.log('\n============================================================');
  console.log('🎉 ALL GUEST ASSESSMENT ACCESS & CONVERSION TESTS PASSED!');
  console.log('============================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
