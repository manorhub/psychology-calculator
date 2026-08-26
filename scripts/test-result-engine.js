import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('=== Psychology Calculator Phase 6: Result & Report Engine Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');

console.log('✔ In-memory SQLite initialized with strict foreign keys enabled');

// 2. Load & Apply All Migrations (0001 through 0010)
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
import { ResultService } from '../src/services/result.service.ts';
import { AssessmentBuilderService } from '../src/services/assessment-builder.service.ts';

async function runResultEngineTests() {
  const runtimeService = new AssessmentRuntimeService(mockD1);
  const resultService = new ResultService(mockD1);
  const builderService = new AssessmentBuilderService(mockD1);

  console.log('\n--- 1. Testing Assessment Completion & Result Snapshot Generation ---');
  const publicAssessment = await runtimeService.getPublishedAssessmentBySlug('big-five-personality');
  assert.ok(publicAssessment);

  const guestSessionA = 'guest_session_user_a';
  const { attempt } = await runtimeService.startOrResumeAttempt(
    publicAssessment.assessment.id,
    null,
    guestSessionA
  );

  // Answer questions to get high openness score
  for (const q of publicAssessment.questions) {
    const opt = q.options.find((o) => o.option_value === '5') || q.options[0];
    await runtimeService.saveAnswer(attempt.id, q.id, opt.id, null, guestSessionA);
  }

  // Complete attempt
  await runtimeService.completeAttempt(attempt.id, null, guestSessionA);

  // Generate / Fetch Result
  const result = await resultService.getResult(attempt.id, null, guestSessionA);
  assert.strictEqual(result.snapshot.attemptId, attempt.id);
  assert.strictEqual(result.snapshot.assessmentName, 'Big Five (OCEAN) Personality Test');
  assert.strictEqual(result.snapshot.dimensionScores.length, 5);
  assert.ok(result.snapshot.primaryResultType !== null);
  assert.strictEqual(result.snapshot.primaryResultType.slug, 'high-openness');
  assert.strictEqual(result.isSharedView, false);
  console.log(`✔ Generated result for "${result.snapshot.assessmentName}": Archetype = "${result.snapshot.primaryResultType.name}"`);

  console.log('\n--- 2. Testing Strict Security & Access Authorization ---');
  // Unauthorized guest attempting to access User A's result must fail
  await assert.rejects(
    async () => {
      await resultService.getResult(attempt.id, null, 'unauthorized_guest_session_b');
    },
    /Unauthorized/,
    'Access denied to foreign guest attempt'
  );
  console.log('✔ Unauthorized guest taker access blocked');

  // Authenticated user attempting to access foreign guest attempt without share token must fail
  sqlite.exec("INSERT OR IGNORE INTO users (id, email, role, status) VALUES ('usr_mallory', 'mallory@evil.com', 'user', 'active')");
  await assert.rejects(
    async () => {
      await resultService.getResult(attempt.id, 'usr_mallory', null);
    },
    /Unauthorized/,
    'Access denied to foreign user'
  );
  console.log('✔ Unauthorized user access blocked');

  console.log('\n--- 3. Testing Historical Snapshot Integrity Across Admin Mutations ---');
  // Capture initial snapshot overview text
  const initialOverview = result.snapshot.primaryResultType.contents.find((c) => c.section_type === 'overview')?.content;
  assert.ok(initialOverview);

  // Admin updates the result_content in D1 after the test was taken
  sqlite.exec(
    "UPDATE result_contents SET content = 'MODIFIED FUTURE OVERVIEW CONTENT' WHERE result_type_id = 'rt_openness_high' AND section_type = 'overview'"
  );

  // Re-fetch historical result for the previous attempt
  const historicalResult = await resultService.getResult(attempt.id, null, guestSessionA);
  const preservedOverview = historicalResult.snapshot.primaryResultType.contents.find((c) => c.section_type === 'overview')?.content;

  // The historical result MUST retain the original frozen text, not the modified future text
  assert.strictEqual(preservedOverview, initialOverview);
  assert.notStrictEqual(preservedOverview, 'MODIFIED FUTURE OVERVIEW CONTENT');
  console.log('✔ Historical result snapshot remained immutable after Admin database update');

  // A new attempt taken AFTER the change will receive the updated content
  const { attempt: newAttempt } = await runtimeService.startOrResumeAttempt(
    publicAssessment.assessment.id,
    null,
    'guest_session_user_c'
  );
  for (const q of publicAssessment.questions) {
    const opt = q.options.find((o) => o.option_value === '5') || q.options[0];
    await runtimeService.saveAnswer(newAttempt.id, q.id, opt.id, null, 'guest_session_user_c');
  }
  await runtimeService.completeAttempt(newAttempt.id, null, 'guest_session_user_c');
  const newResult = await resultService.getResult(newAttempt.id, null, 'guest_session_user_c');
  const newOverview = newResult.snapshot.primaryResultType?.contents.find((c) => c.section_type === 'overview')?.content;
  assert.strictEqual(newOverview, 'MODIFIED FUTURE OVERVIEW CONTENT');
  console.log('✔ Fresh assessment attempt adopted updated Admin result content correctly');

  console.log('\n--- 4. Testing Secure Public Sharing & Revocation ---');
  // Generate Share Token
  const share = await resultService.generateShareToken(attempt.id, null, guestSessionA);
  assert.ok(share.shareToken);
  assert.ok(share.shareUrl.includes(share.shareToken));
  console.log(`✔ Generated cryptographic share token: ${share.shareToken}`);

  // Third-party visitor opens result with shareToken
  const sharedView = await resultService.getResult(attempt.id, null, null, share.shareToken);
  assert.strictEqual(sharedView.isSharedView, true);
  assert.strictEqual(sharedView.snapshot.assessmentName, 'Big Five (OCEAN) Personality Test');
  console.log('✔ Third-party viewer successfully accessed shared result via valid token');

  // Revoke Share Token
  await resultService.revokeShareToken(attempt.id, null, guestSessionA);
  console.log('✔ Share token revoked by owner');

  // Third-party visitor attempting to view after revocation must fail
  await assert.rejects(
    async () => {
      await resultService.getResult(attempt.id, null, null, share.shareToken);
    },
    /invalid or has been revoked/,
    'Revoked share token rejected'
  );
  console.log('✔ Revoked share token blocked from public access');

  console.log('\n--- 5. Testing Related Assessments and FAQs Queries ---');
  const related = await resultService.getRelatedAssessments(
    publicAssessment.assessment.category_id,
    publicAssessment.assessment.id,
    3
  );
  console.log(`✔ Retrieved ${related.length} related category assessments`);

  const faqs = await resultService.getAssessmentFaqs(publicAssessment.assessment.id);
  assert.ok(faqs.length > 0);
  console.log(`✔ Retrieved ${faqs.length} dynamic FAQs for result presentation`);

  console.log('\n========================================');
  console.log('🎉 ALL PHASE 6 RESULT ENGINE TESTS PASSED!');
  console.log('========================================\n');
}

runResultEngineTests().catch((err) => {
  console.error('❌ Result Engine Test failed:', err);
  process.exit(1);
});
