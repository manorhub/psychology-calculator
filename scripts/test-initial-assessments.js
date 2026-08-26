import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('=== Psychology Calculator Phase 7: Initial Psychology Assessments Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');

console.log('✔ In-memory SQLite initialized with strict foreign keys enabled');

// 2. Load & Apply All Migrations (0001 through 0011)
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

const EXPECTED_ASSESSMENTS = [
  { slug: 'big-five-personality-test', name: 'Big Five (OCEAN) Personality Test', minDimensions: 5 },
  { slug: 'attachment-style-test', name: 'Attachment Style Test', minDimensions: 4 },
  { slug: 'love-language-quiz', name: 'Love Language Quiz', minDimensions: 5 },
  { slug: 'emotional-intelligence-test', name: 'Emotional Intelligence Test', minDimensions: 5 },
  { slug: 'introvert-extrovert-test', name: 'Introvert vs Extrovert Test', minDimensions: 2 },
  { slug: 'self-esteem-test', name: 'Self-Esteem Test', minDimensions: 2 },
  { slug: 'communication-style-test', name: 'Communication Style Test', minDimensions: 4 },
  { slug: 'conflict-style-test', name: 'Conflict Style Test', minDimensions: 5 }
];

async function runInitialAssessmentsTests() {
  const runtimeService = new AssessmentRuntimeService(mockD1);
  const resultService = new ResultService(mockD1);
  const builderService = new AssessmentBuilderService(mockD1);

  console.log('\n--- 1. Testing Discovery and Structure of all 8 MVP Instruments ---');
  for (let i = 0; i < EXPECTED_ASSESSMENTS.length; i++) {
    const spec = EXPECTED_ASSESSMENTS[i];
    const data = await runtimeService.getPublishedAssessmentBySlug(spec.slug);

    assert.ok(data, `Assessment ${spec.slug} loaded successfully`);
    assert.strictEqual(data.assessment.status, 'published');
    assert.strictEqual(data.assessment.name, spec.name);
    assert.ok(data.dimensions.length >= spec.minDimensions, `${spec.name} has required dimensions`);
    assert.ok(data.questions.length > 0, `${spec.name} has question items`);
    assert.ok(data.assessment.disclaimer !== null, `${spec.name} has educational disclaimer`);

    console.log(`  ✔ [${i + 1}/8] ${spec.name} (/${spec.slug}) — ${data.questions.length} Questions, ${data.dimensions.length} Dimensions`);
  }

  console.log('\n--- 2. Simulating End-to-End Test Taking & Scoring across all 8 Instruments ---');
  for (let i = 0; i < EXPECTED_ASSESSMENTS.length; i++) {
    const spec = EXPECTED_ASSESSMENTS[i];
    const data = await runtimeService.getPublishedAssessmentBySlug(spec.slug);
    assert.ok(data);

    const sessionId = `guest_tester_inst_${i}`;
    const { attempt } = await runtimeService.startOrResumeAttempt(data.assessment.id, null, sessionId);

    // Answer all questions
    for (const q of data.questions) {
      // Pick highest positive response option
      const opt = q.options[q.options.length - 1] || q.options[0];
      await runtimeService.saveAnswer(attempt.id, q.id, opt.id, null, sessionId);
    }

    // Complete attempt & calculate scores
    const scoringResult = await runtimeService.completeAttempt(attempt.id, null, sessionId);
    assert.strictEqual(scoringResult.attemptId, attempt.id);
    assert.ok(scoringResult.dimensionScores.length >= spec.minDimensions);
    assert.ok(scoringResult.totalRawScore >= 0);

    // Generate & verify immutable snapshot
    const resultView = await resultService.getResult(attempt.id, null, sessionId);
    assert.strictEqual(resultView.snapshot.assessmentSlug, spec.slug);
    assert.ok(resultView.snapshot.primaryResultType !== null);
    assert.ok(resultView.snapshot.dimensionScores.length > 0);

    console.log(`  ✔ Scored ${spec.name}: Archetype="${resultView.snapshot.primaryResultType.name}" (Total Raw: ${resultView.snapshot.totalRawScore})`);
  }

  console.log('\n--- 3. Testing Dynamic Admin Panel Management & Duplication ---');
  // Admin loads full graph of Attachment Style
  const fullAttachment = await builderService.getAssessmentFull('asm_attachment');
  assert.ok(fullAttachment);
  assert.strictEqual(fullAttachment.dimensions.length, 4);
  assert.strictEqual(fullAttachment.questions.length, 8);
  console.log(`✔ Admin loaded complete graph for Attachment Style (${fullAttachment.dimensions.length} dims, ${fullAttachment.questions.length} questions)`);

  // Admin clones Attachment Style
  const clone = await builderService.duplicateAssessment('asm_attachment', 'admin_1');
  assert.strictEqual(clone.status, 'draft');
  const cloneFull = await builderService.getAssessmentFull(clone.id);
  assert.ok(cloneFull);
  assert.strictEqual(cloneFull.dimensions.length, 4);
  assert.strictEqual(cloneFull.questions.length, 8);
  console.log(`✔ Admin successfully duplicated Attachment Style into: "${clone.name}"`);

  // Cleanup cloned draft
  await builderService.deleteAssessment(clone.id, 'admin_1');
  console.log('✔ Cleaned up duplicated draft assessment');

  console.log('\n============================================================');
  console.log('🎉 ALL 8 INITIAL PSYCHOLOGY ASSESSMENTS VERIFIED & PASSED!');
  console.log('============================================================\n');
}

runInitialAssessmentsTests().catch((err) => {
  console.error('❌ Initial Assessments Test failed:', err);
  process.exit(1);
});
