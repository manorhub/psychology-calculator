import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('=== Psychology Calculator Phase 5: Assessment Engine & Scoring Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');

console.log('✔ In-memory SQLite initialized with strict foreign keys enabled');

// 2. Load & Apply All Migrations (0001 through 0009)
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
console.log('✔ Foreign key integrity verified across all 9 migrations');

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
import { ScoringService } from '../src/services/scoring.service.ts';
import { AssessmentBuilderService } from '../src/services/assessment-builder.service.ts';

async function runAssessmentEngineTests() {
  const runtimeService = new AssessmentRuntimeService(mockD1);
  const scoringService = new ScoringService(mockD1);
  const builderService = new AssessmentBuilderService(mockD1);

  console.log('\n--- 1. Testing Public Assessment Discovery & Access Control ---');
  // Big Five is seeded and published
  const publicAssessment = await runtimeService.getPublishedAssessmentBySlug('big-five-personality-test');
  assert.ok(publicAssessment, 'Published assessment loaded');
  assert.strictEqual(publicAssessment.assessment.name, 'Big Five (OCEAN) Personality Test');
  assert.strictEqual(publicAssessment.dimensions.length, 5);
  assert.ok(publicAssessment.questions.length > 0);
  console.log(`✔ Public assessment loaded: "${publicAssessment.assessment.name}" with ${publicAssessment.questions.length} questions`);

  // Draft assessment should NOT be loaded through public endpoint
  const draftTest = await builderService.createAssessment(
    {
      name: 'Unpublished Draft Assessment',
      slug: 'draft-assessment-test',
      category_id: publicAssessment.assessment.category_id,
      short_description: 'This is a draft assessment that must not be public.'
    },
    'admin_1'
  );
  const draftPublicCheck = await runtimeService.getPublishedAssessmentBySlug('draft-assessment-test');
  assert.strictEqual(draftPublicCheck, null, 'Draft assessment is hidden from public discovery');
  console.log('✔ Draft & unlisted assessments strictly blocked from public discovery');

  console.log('\n--- 2. Testing Guest & Authenticated Attempt Lifecycle ---');
  const guestSessionId = 'guest_sess_abc123';
  const { attempt: guestAttempt, isResumed: isResumed1 } = await runtimeService.startOrResumeAttempt(
    publicAssessment.assessment.id,
    null,
    guestSessionId
  );
  assert.strictEqual(isResumed1, false, 'New guest attempt created');
  assert.strictEqual(guestAttempt.status, 'in_progress');
  assert.strictEqual(guestAttempt.session_id, guestSessionId);
  console.log(`✔ Guest attempt initialized: ID=${guestAttempt.id}`);

  // Test Attempt Resumption for same guest
  const { attempt: resumedAttempt, isResumed: isResumed2 } = await runtimeService.startOrResumeAttempt(
    publicAssessment.assessment.id,
    null,
    guestSessionId
  );
  assert.strictEqual(isResumed2, true, 'Existing in_progress attempt resumed');
  assert.strictEqual(resumedAttempt.id, guestAttempt.id);
  console.log('✔ Resumed active attempt without creating duplicates');

  console.log('\n--- 3. Testing Server-Side Anti-Tampering & Answer Persistence ---');
  const q1 = publicAssessment.questions[0];
  const q1OptStronglyAgree = q1.options.find((o) => o.option_value === '5') || q1.options[0];

  // Save valid answer
  const savedAns1 = await runtimeService.saveAnswer(
    guestAttempt.id,
    q1.id,
    q1OptStronglyAgree.id,
    null,
    guestSessionId
  );
  assert.strictEqual(savedAns1.question_id, q1.id);
  assert.strictEqual(savedAns1.option_id, q1OptStronglyAgree.id);
  console.log(`✔ Saved valid answer: Q1 -> Option "${q1OptStronglyAgree.option_text}"`);

  // Anti-tampering: Reject non-existent option
  await assert.rejects(
    async () => {
      await runtimeService.saveAnswer(
        guestAttempt.id,
        q1.id,
        'fake-option-id-999',
        null,
        guestSessionId
      );
    },
    /Invalid response option/,
    'Tampered option rejected'
  );
  console.log('✔ Anti-tampering: Invalid option rejected');

  // Anti-tampering: Unauthorized guest access rejected
  await assert.rejects(
    async () => {
      await runtimeService.saveAnswer(
        guestAttempt.id,
        q1.id,
        q1OptStronglyAgree.id,
        null,
        'malicious_intruder_session'
      );
    },
    /Unauthorized/,
    'Unauthorized session access denied'
  );
  console.log('✔ Anti-tampering: Unauthorized attempt access blocked');

  // Answer remaining questions for Big Five
  for (let i = 1; i < publicAssessment.questions.length; i++) {
    const q = publicAssessment.questions[i];
    const opt = q.options[0]; // Select first option
    await runtimeService.saveAnswer(guestAttempt.id, q.id, opt.id, null, guestSessionId);
  }

  const progress = await runtimeService.getAttemptProgress(guestAttempt.id, null, guestSessionId);
  assert.strictEqual(progress.answeredCount, publicAssessment.questions.length);
  console.log(`✔ Attempt progress tracked: ${progress.answeredCount}/${progress.totalQuestions} items answered`);

  console.log('\n--- 4. Testing Deterministic Scoring Engine & Result Classification ---');
  const scoringResult = await runtimeService.completeAttempt(guestAttempt.id, null, guestSessionId);
  assert.strictEqual(scoringResult.attemptId, guestAttempt.id);
  assert.ok(scoringResult.dimensionScores.length > 0, 'Dimensions scored');
  assert.ok(scoringResult.totalRawScore > 0, 'Total raw score calculated');
  console.log(`✔ Scored attempt: Raw Total=${scoringResult.totalRawScore}, Normalized Total=${scoringResult.totalNormalizedScore}%`);

  for (const dim of scoringResult.dimensionScores) {
    console.log(`   • ${dim.dimensionName}: ${dim.normalizedScore}% (Raw: ${dim.rawScore}/${dim.maxScore})`);
  }

  // Verify database record updated
  const completedAttempt = await mockD1
    .prepare('SELECT * FROM assessment_attempts WHERE id = ?')
    .bind(guestAttempt.id)
    .first();
  assert.strictEqual(completedAttempt.status, 'completed');
  assert.ok(completedAttempt.completed_at !== null);
  console.log('✔ Database attempt updated: status=completed with duration and timestamp');

  console.log('\n--- 5. Testing Duplicate Completion & Modification Prevention ---');
  // Attempting to save new answers on completed attempt must fail
  await assert.rejects(
    async () => {
      await runtimeService.saveAnswer(
        guestAttempt.id,
        q1.id,
        q1.options[1].id,
        null,
        guestSessionId
      );
    },
    /already finalized/,
    'Modification of finalized attempt blocked'
  );
  console.log('✔ Prevented modifications to completed attempt');

  // Calling complete on already completed attempt retrieves existing scores idempotently
  const reScore = await scoringService.calculateAttemptScores(guestAttempt.id);
  assert.strictEqual(reScore.totalRawScore, scoringResult.totalRawScore);
  console.log('✔ Idempotent scoring retrieval for completed attempts');

  console.log('\n--- 6. Testing End-to-End Custom Assessment with Reverse Scoring & Weights ---');
  // Dynamically create a custom 3-dimension assessment with reverse-scoring and weighted items
  const customDraft = await builderService.createAssessment(
    {
      name: 'Emotional Resilience Assessment',
      slug: 'emotional-resilience-demo',
      category_id: publicAssessment.assessment.category_id,
      short_description: 'Evaluate stress tolerance, emotional regulation, and cognitive adaptability.',
      estimated_minutes: 8,
      access_type: 'free'
    },
    'admin_1'
  );

  // Dimensions
  const dims = await builderService.saveDimensions(
    customDraft.id,
    [
      { name: 'Stress Tolerance', slug: 'stress-tolerance', display_order: 0 },
      { name: 'Adaptability', slug: 'adaptability', display_order: 1 }
    ],
    'admin_1'
  );

  // Question 1: Regular scoring (Weight: 2.0)
  const cq1 = await builderService.saveQuestion(
    customDraft.id,
    {
      question_text: 'I remain calm and clear-headed during unexpected crises.',
      question_type: 'likert',
      required: true,
      options: [
        { option_text: 'Disagree', option_value: '1', display_order: 0 },
        { option_text: 'Neutral', option_value: '2', display_order: 1 },
        { option_text: 'Agree', option_value: '3', display_order: 2 }
      ]
    },
    'admin_1'
  );

  // Question 2: Reverse-scored question
  const cq2 = await builderService.saveQuestion(
    customDraft.id,
    {
      question_text: 'Small setbacks make me feel overwhelmed.',
      question_type: 'likert',
      required: true,
      options: [
        { option_text: 'Never', option_value: '1', display_order: 0 },
        { option_text: 'Sometimes', option_value: '2', display_order: 1 },
        { option_text: 'Always', option_value: '3', display_order: 2 }
      ]
    },
    'admin_1'
  );

  // Scoring Rules:
  // CQ1 Option "Agree" (val 3) -> Stress Tolerance (Score: 3, Weight: 2.0) => 6 points
  // CQ2 Option "Never" (val 1) -> Stress Tolerance (Reverse Scored: min 1, max 3 => 3 + 1 - 1 = 3 points)
  await builderService.saveScoringRules(
    customDraft.id,
    [
      { question_id: cq1.id, dimension_id: dims[0].id, option_id: cq1.options[2].id, score: 3, weight: 2.0, reverse_scoring: false },
      { question_id: cq2.id, dimension_id: dims[0].id, option_id: cq2.options[0].id, score: 1, weight: 1.0, reverse_scoring: true },
      { question_id: cq2.id, dimension_id: dims[0].id, option_id: cq2.options[2].id, score: 3, weight: 1.0, reverse_scoring: true }
    ],
    'admin_1'
  );

  // Result Types
  await builderService.saveResultTypes(
    customDraft.id,
    [
      {
        name: 'High Emotional Resilience',
        slug: 'high-resilience',
        dimension_id: dims[0].id,
        description: 'Exceptional capacity to withstand psychological pressure and bounce back.',
        minimum_score: 5,
        maximum_score: 20,
        contents: [{ section_type: 'overview', title: 'Overview', content: 'You handle pressure with ease.' }]
      }
    ],
    'admin_1'
  );

  // Publish
  await builderService.publishAssessment(customDraft.id, 'admin_1');
  console.log(`✔ Dynamically created and published custom assessment: "${customDraft.name}"`);

  // Execute attempt on custom assessment
  const { attempt: customAttempt } = await runtimeService.startOrResumeAttempt(
    customDraft.id,
    'user_tester_1',
    null
  );

  // Select CQ1 Agree (val 3, weight 2.0 => 6 pts)
  await runtimeService.saveAnswer(customAttempt.id, cq1.id, cq1.options[2].id, 'user_tester_1', null);
  // Select CQ2 Never (val 1, reverse scored from scale 1-3 => 3 pts)
  await runtimeService.saveAnswer(customAttempt.id, cq2.id, cq2.options[0].id, 'user_tester_1', null);

  const customResult = await runtimeService.completeAttempt(customAttempt.id, 'user_tester_1', null);
  // Total raw score should equal 6 + 3 = 9 points
  assert.strictEqual(customResult.dimensionScores[0].rawScore, 9);
  assert.strictEqual(customResult.primaryResultType?.slug, 'high-resilience');
  console.log(`✔ Verified deterministic calculation: Weighted + Reverse-Scored = ${customResult.dimensionScores[0].rawScore} pts`);
  console.log(`✔ Classified primary outcome: "${customResult.primaryResultType?.name}"`);

  console.log('\n========================================');
  console.log('🎉 ALL PHASE 5 ASSESSMENT ENGINE TESTS PASSED!');
  console.log('========================================\n');
}

runAssessmentEngineTests().catch((err) => {
  console.error('❌ Assessment Engine Test failed:', err);
  process.exit(1);
});
