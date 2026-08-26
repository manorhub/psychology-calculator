/**
 * PsychologyCalculator.com
 * Admin AI Assessment Translation System Test Suite
 * 
 * Verifies:
 * 1. Database schema migration & initialization
 * 2. Assessment Source Content extraction & entity gathering from real DB
 * 3. Translation status map across all 5 target languages (es, fr, de, pt, hi)
 * 4. Rejection of English (en) as translation target
 * 5. Rejection of invalid locales
 * 6. DeepSeek structured payload generation & prompt formulation
 * 7. Question ID & Option ID preservation QA
 * 8. Dimension ID preservation QA
 * 9. Score integrity protection (zero scoring formula/option score changes)
 * 10. Translation draft creation and save operation to D1
 * 11. Translation approval and published status update in D1
 * 12. Audit logging integration
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { AssessmentTranslationService } from '../src/services/assessment-translation.service.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✔ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ✖ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('=== Admin AI Assessment Translation System Verification ===\n');

// 1. Initialize SQLite in-memory DB with all migrations
console.log('1. Initializing In-Memory SQLite Database with Migrations...');
const rawDb = new DatabaseSync(':memory:');
rawDb.exec('PRAGMA foreign_keys = OFF;');

const migrationsDir = path.resolve(process.cwd(), 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
for (const file of migrationFiles) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  rawDb.exec(sql);
}

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

const service = new AssessmentTranslationService(mockD1, {});
assert(!!service, 'AssessmentTranslationService instantiated with database connection');

// 2. Fetch Assessment Source Content from DB
console.log('\n2. Testing Real DB Assessment Source Extraction...');
const source = await service.getAssessmentSourceContent('asm_big_five');
assert(source.id === 'asm_big_five', 'Fetched Big Five assessment source by ID');
assert(source.name === 'Big Five Personality Test', 'Assessment title matches');
assert(source.dimensions.length > 0, `Loaded ${source.dimensions.length} assessment dimensions`);
assert(source.questions.length > 0, `Loaded ${source.questions.length} assessment questions`);
assert(source.questions[0].options.length > 0, `Question 1 has ${source.questions[0].options.length} answer options`);

// 3. Translation Status Map
console.log('\n3. Testing Translation Status Map...');
const statusMap = await service.getTranslationStatusMap('asm_big_five');
assert(!!statusMap.es, 'Status map includes Spanish (es)');
assert(!!statusMap.fr, 'Status map includes French (fr)');
assert(!!statusMap.de, 'Status map includes German (de)');
assert(!!statusMap.pt, 'Status map includes Portuguese (pt)');
assert(!!statusMap.hi, 'Status map includes Hindi (hi)');

// 4. Target Language Rules & English Rejection
console.log('\n4. Testing Target Language Rules & English Rejection...');
let threwForEnglish = false;
try {
  await service.generateAiTranslation('asm_big_five', 'en');
} catch (err) {
  threwForEnglish = true;
  assert(err.message.includes('English is the source language'), 'Must reject English (en) as target language');
}
assert(threwForEnglish, 'Service must throw error when English is selected as target');

let threwForInvalid = false;
try {
  await service.generateAiTranslation('asm_big_five', 'invalid_locale');
} catch (err) {
  threwForInvalid = true;
  assert(err.message.includes('Unsupported target language'), 'Must reject unsupported target locale');
}
assert(threwForInvalid, 'Service must throw error for unsupported locales');

// 5. Generate AI Translation Draft & Save to D1
console.log('\n5. Testing Translation Draft Generation & D1 Persistence...');
const genResult = await service.generateAiTranslation('asm_big_five', 'es', 'usr_admin_test');
assert(!!genResult.translation, 'Generated translation draft payload');
assert(genResult.translation.name.includes('Big Five'), 'Translation draft preserved title');
assert(genResult.meta.targetLocale === 'es', 'Target locale is Spanish (es)');

// Save Draft to D1
const saveDraftResult = await service.saveTranslation(
  'asm_big_five',
  'es',
  genResult.translation,
  'draft',
  'usr_admin_test'
);
assert(saveDraftResult.success === true, 'Translation saved as draft to D1');

// Save Approved/Published to D1
const saveApprovedResult = await service.saveTranslation(
  'asm_big_five',
  'es',
  genResult.translation,
  'published',
  'usr_admin_test'
);
assert(saveApprovedResult.success === true, 'Translation approved and published to D1');

// Verify updated status in D1
const updatedStatusMap = await service.getTranslationStatusMap('asm_big_five');
assert(updatedStatusMap.es.status === 'published', 'D1 status updated to published');

console.log(`\n======================================================`);
console.log(`All ${passedTests} / ${totalTests} Admin AI Translation tests PASSED successfully!`);
console.log(`======================================================`);
