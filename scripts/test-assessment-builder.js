import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('=== Psychology Calculator Phase 4: Dynamic Assessment Builder Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database with Foreign Keys ON
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');

console.log('✔ In-memory SQLite initialized with strict foreign keys enabled');

// 2. Load & Apply All Migrations (0001 through 0009)
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

// 5. Test Assessment Builder Service
import { AssessmentBuilderService } from '../src/services/assessment-builder.service.ts';
import { AssessmentValidatorService } from '../src/services/assessment-validator.service.ts';

async function runAssessmentBuilderTests() {
  const service = new AssessmentBuilderService(mockD1);
  const validator = new AssessmentValidatorService(mockD1);

  console.log('\n--- 1. Testing Assessment CRUD & Draft Creation ---');
  const categories = await service.getCategories();
  assert.ok(categories.length > 0, 'Categories loaded from D1');
  const categoryId = categories[0].id;

  const draft = await service.createAssessment(
    {
      name: 'Attachment Style Self-Assessment',
      slug: 'attachment-style',
      category_id: categoryId,
      short_description: 'Discover your relationship attachment patterns: Secure, Anxious, or Avoidant.',
      long_description: 'Based on adult attachment theory by Bowlby and Ainsworth.',
      instructions: 'Answer based on how you feel in close romantic relationships.',
      estimated_minutes: 12,
      access_type: 'free',
      featured: true
    },
    'admin_1'
  );

  assert.strictEqual(draft.name, 'Attachment Style Self-Assessment');
  assert.strictEqual(draft.status, 'draft');
  assert.strictEqual(draft.slug, 'attachment-style');
  console.log(`✔ Created Draft Assessment: ${draft.name} (ID: ${draft.id})`);

  // Test slug uniqueness enforcement
  await assert.rejects(
    async () => {
      await service.createAssessment(
        {
          name: 'Duplicate Test',
          slug: 'attachment-style',
          category_id: categoryId,
          short_description: 'Should fail due to duplicate slug'
        },
        'admin_1'
      );
    },
    /already exists/,
    'Duplicate slug rejected'
  );
  console.log('✔ Slug uniqueness validated server-side');

  console.log('\n--- 2. Testing Dynamic Dimension Builder ---');
  const dimensions = await service.saveDimensions(
    draft.id,
    [
      { name: 'Secure Attachment', slug: 'secure', description: 'Comfortable with intimacy and autonomy', display_order: 0 },
      { name: 'Anxious Attachment', slug: 'anxious', description: 'Fear of rejection and abandonment', display_order: 1 },
      { name: 'Avoidant Attachment', slug: 'avoidant', description: 'Preference for self-reliance and emotional distance', display_order: 2 }
    ],
    'admin_1'
  );

  assert.strictEqual(dimensions.length, 3);
  assert.strictEqual(dimensions[0].slug, 'secure');
  const secureDimId = dimensions[0].id;
  const anxiousDimId = dimensions[1].id;
  const avoidantDimId = dimensions[2].id;
  console.log(`✔ Created 3 Dimensions dynamically: Secure, Anxious, Avoidant`);

  console.log('\n--- 3. Testing Questions & Response Options Builder ---');
  // Question 1: Likert Question (Secure)
  const q1 = await service.saveQuestion(
    draft.id,
    {
      question_text: 'I find it relatively easy to get close to others and depend on them.',
      question_type: 'likert',
      required: true,
      display_order: 0,
      options: [
        { option_text: 'Strongly Disagree', option_value: '1', display_order: 0 },
        { option_text: 'Disagree', option_value: '2', display_order: 1 },
        { option_text: 'Neutral', option_value: '3', display_order: 2 },
        { option_text: 'Agree', option_value: '4', display_order: 3 },
        { option_text: 'Strongly Agree', option_value: '5', display_order: 4 }
      ]
    },
    'admin_1'
  );

  // Question 2: Likert Question (Anxious)
  const q2 = await service.saveQuestion(
    draft.id,
    {
      question_text: 'I often worry that romantic partners will not stay or do not truly love me.',
      question_type: 'likert',
      required: true,
      display_order: 1,
      options: [
        { option_text: 'Strongly Disagree', option_value: '1', display_order: 0 },
        { option_text: 'Disagree', option_value: '2', display_order: 1 },
        { option_text: 'Neutral', option_value: '3', display_order: 2 },
        { option_text: 'Agree', option_value: '4', display_order: 3 },
        { option_text: 'Strongly Agree', option_value: '5', display_order: 4 }
      ]
    },
    'admin_1'
  );

  // Question 3: Yes/No Question (Avoidant)
  const q3 = await service.saveQuestion(
    draft.id,
    {
      question_text: 'I am nervous when someone gets too emotionally close to me.',
      question_type: 'yes_no',
      required: true,
      display_order: 2,
      options: [
        { option_text: 'Yes', option_value: '1', display_order: 0 },
        { option_text: 'No', option_value: '0', display_order: 1 }
      ]
    },
    'admin_1'
  );

  assert.strictEqual(q1.options.length, 5);
  assert.strictEqual(q3.options.length, 2);
  console.log(`✔ Created 3 Questions with Likert and Binary Yes/No option sets`);

  console.log('\n--- 4. Testing Scoring Rules Configuration Matrix ---');
  const scoringRules = [
    // Q1 options map to Secure Dimension
    { question_id: q1.id, dimension_id: secureDimId, option_id: q1.options[0].id, score: 1, weight: 1.0, reverse_scoring: false },
    { question_id: q1.id, dimension_id: secureDimId, option_id: q1.options[1].id, score: 2, weight: 1.0, reverse_scoring: false },
    { question_id: q1.id, dimension_id: secureDimId, option_id: q1.options[2].id, score: 3, weight: 1.0, reverse_scoring: false },
    { question_id: q1.id, dimension_id: secureDimId, option_id: q1.options[3].id, score: 4, weight: 1.0, reverse_scoring: false },
    { question_id: q1.id, dimension_id: secureDimId, option_id: q1.options[4].id, score: 5, weight: 1.0, reverse_scoring: false },
    // Q2 options map to Anxious Dimension
    { question_id: q2.id, dimension_id: anxiousDimId, option_id: q2.options[4].id, score: 5, weight: 1.0, reverse_scoring: false },
    // Q3 options map to Avoidant Dimension
    { question_id: q3.id, dimension_id: avoidantDimId, option_id: q3.options[0].id, score: 5, weight: 1.0, reverse_scoring: false }
  ];

  await service.saveScoringRules(draft.id, scoringRules, 'admin_1');
  console.log(`✔ Configured ${scoringRules.length} scoring rules mapped to dimensions`);

  console.log('\n--- 5. Testing Result Archetypes & Multi-Section Interpretations ---');
  const resultTypes = await service.saveResultTypes(
    draft.id,
    [
      {
        name: 'Secure Attachment Style',
        slug: 'secure-attachment',
        dimension_id: secureDimId,
        description: 'You possess a healthy balance of intimacy and independence in relationships.',
        minimum_score: 15,
        maximum_score: 25,
        display_order: 0,
        contents: [
          {
            section_type: 'overview',
            title: 'Overview',
            content: 'Secure attachment individuals communicate needs clearly and navigate conflicts with empathy.',
            display_order: 0
          },
          {
            section_type: 'strengths',
            title: 'Core Relationship Strengths',
            content: 'High emotional resilience, active listening, and constructive conflict resolution.',
            display_order: 1
          }
        ]
      },
      {
        name: 'Anxious-Preoccupied Attachment',
        slug: 'anxious-attachment',
        dimension_id: anxiousDimId,
        description: 'You highly value closeness but may frequently worry about relationship security.',
        minimum_score: 15,
        maximum_score: 25,
        display_order: 1,
        contents: [
          {
            section_type: 'overview',
            title: 'Overview',
            content: 'You seek deep emotional intimacy and may benefit from self-soothing and direct communication.',
            display_order: 0
          }
        ]
      }
    ],
    'admin_1'
  );

  assert.strictEqual(resultTypes.length, 2);
  assert.strictEqual(resultTypes[0].contents.length, 2);
  console.log(`✔ Configured Result Archetypes with multi-section content narratives`);

  console.log('\n--- 6. Testing Full Entity Assembly ---');
  const full = await service.getAssessmentFull(draft.id);
  assert.ok(full, 'Full assessment loaded');
  assert.strictEqual(full.dimensions.length, 3);
  assert.strictEqual(full.questions.length, 3);
  assert.strictEqual(full.resultTypes.length, 2);
  console.log(`✔ Full Assessment Graph: 3 dimensions, 3 questions (${full.questions.reduce((a, b) => a + b.options.length, 0)} options), ${full.scoringRules.length} rules, 2 result types`);

  console.log('\n--- 7. Testing Publishing Validation ---');
  // Complete assessment should pass validation
  const validation = await validator.validateForPublish(draft.id);
  assert.strictEqual(validation.isValid, true, 'Validation passes for complete assessment');

  // Publish assessment
  const published = await service.publishAssessment(draft.id, 'admin_1');
  assert.strictEqual(published.status, 'published');
  assert.ok(published.published_at !== null);
  console.log(`✔ Published assessment successfully (Version: v${published.version})`);

  // Unpublish assessment
  const unpublished = await service.unpublishAssessment(draft.id, 'admin_1');
  assert.strictEqual(unpublished.status, 'draft');
  console.log(`✔ Unpublished assessment reverted to draft`);

  console.log('\n--- 8. Testing Deep Duplication Engine ---');
  const clone = await service.duplicateAssessment(draft.id, 'admin_1');
  assert.strictEqual(clone.name, 'Attachment Style Self-Assessment (Copy)');
  assert.strictEqual(clone.status, 'draft');

  const cloneFull = await service.getAssessmentFull(clone.id);
  assert.ok(cloneFull);
  assert.strictEqual(cloneFull.dimensions.length, 3);
  assert.strictEqual(cloneFull.questions.length, 3);
  assert.strictEqual(cloneFull.resultTypes.length, 2);
  // Verify foreign keys point to cloned IDs, not original IDs
  assert.notStrictEqual(cloneFull.dimensions[0].id, dimensions[0].id);
  assert.strictEqual(cloneFull.dimensions[0].assessment_id, clone.id);
  console.log(`✔ Deep Duplication: Cloned 3 dimensions, 3 questions, scoring rules, and result archetypes with new mapped IDs`);

  console.log('\n--- 9. Testing Archive & Deletion Safeguards ---');
  // Archive original
  const archived = await service.archiveAssessment(draft.id, 'admin_1');
  assert.strictEqual(archived.status, 'archived');
  console.log(`✔ Archived assessment successfully`);

  // Delete clone (draft without attempts)
  await service.deleteAssessment(clone.id, 'admin_1');
  const deletedCheck = await service.getAssessmentFull(clone.id);
  assert.strictEqual(deletedCheck, null);
  console.log(`✔ Clean draft assessment safely deleted`);

  console.log('\n========================================');
  console.log('🎉 ALL PHASE 4 ASSESSMENT BUILDER TESTS PASSED!');
  console.log('========================================\n');
}

runAssessmentBuilderTests().catch((err) => {
  console.error('❌ Assessment Builder Test failed:', err);
  process.exit(1);
});
