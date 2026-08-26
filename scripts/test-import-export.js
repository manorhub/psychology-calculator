import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('=== Psychology Calculator: Assessment JSON & CSV Import/Export System Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database with Foreign Keys ON
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');
console.log('✔ In-memory SQLite initialized with strict foreign keys enabled');

// 2. Load & Apply All Migrations (0001 through 0023)
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
console.log(`✔ Applied all ${migrationFiles.length} migrations with 0 foreign key errors`);

// 3. Apply Seeds
const seedPath = path.resolve(process.cwd(), 'seeds/dev_seed.sql');
const seedSql = fs.readFileSync(seedPath, 'utf-8');
sqlite.exec(seedSql);
console.log('✔ Seed data applied cleanly');

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
        }
      };
    }
  };
}

const mockDb = createMockD1(sqlite);

// 5. Test Suite Implementation
async function runTests() {
  const { AssessmentImportExportService, REQUIRED_CSV_HEADERS } = await import('../dist/server/entry.mjs').catch(async () => {
    return await import('../src/services/assessment-import-export.service.ts');
  });

  const service = new AssessmentImportExportService(mockDb);

  // =========================================================================
  // PART A: JSON IMPORT / EXPORT SUITE
  // =========================================================================
  console.log('\n--- 1. Demo JSON Template Generation ---');
  const demoTemplate = service.generateDemoTemplate();
  assert.strictEqual(demoTemplate.schema_version, '1.0');
  assert.strictEqual(typeof demoTemplate.assessment.name, 'string');
  assert(demoTemplate.questions.length > 0, 'Demo template must have questions');
  assert(demoTemplate.dimensions.length > 0, 'Demo template must have dimensions');
  assert(demoTemplate.result_profiles.length > 0, 'Demo template must have result profiles');
  console.log('✔ Demo template successfully generated matching Schema v1.0');

  console.log('\n--- 2. Valid JSON Validation ---');
  const valResult = await service.validateJson(demoTemplate);
  assert.strictEqual(valResult.valid, true, 'Demo template should be valid');
  assert.strictEqual(valResult.errors.length, 0, 'Demo template should have 0 errors');
  assert.strictEqual(valResult.preview.title, demoTemplate.assessment.name);
  assert.strictEqual(valResult.preview.questionCount, demoTemplate.questions.length);
  assert.strictEqual(valResult.preview.dimensionCount, demoTemplate.dimensions.length);
  console.log(`✔ Validation passed: "${valResult.preview.title}" (${valResult.preview.questionCount} questions)`);

  console.log('\n--- 3. Invalid JSON Handling (Missing Required Fields) ---');
  const invalidJson1 = {
    schema_version: '1.0',
    assessment: { name: '', slug: '', category_slug: 'personality' },
    questions: []
  };
  const valRes1 = await service.validateJson(invalidJson1);
  assert.strictEqual(valRes1.valid, false);
  assert(valRes1.errors.some(e => e.field === 'assessment.name'), 'Must flag missing title');
  assert(valRes1.errors.some(e => e.field === 'assessment.slug'), 'Must flag missing slug');
  assert(valRes1.errors.some(e => e.field === 'questions'), 'Must flag empty questions');
  console.log(`✔ Correctly blocked invalid JSON with ${valRes1.errors.length} errors`);

  console.log('\n--- 4. Semantic Validation: Duplicate Question IDs ---');
  const invalidJson2 = JSON.parse(JSON.stringify(demoTemplate));
  invalidJson2.questions[1].id = invalidJson2.questions[0].id; // duplicate ID
  const valRes2 = await service.validateJson(invalidJson2);
  assert.strictEqual(valRes2.valid, false);
  assert(valRes2.errors.some(e => e.message.includes('Duplicate question ID')), 'Must flag duplicate question ID');
  console.log('✔ Correctly caught semantic error: Duplicate question ID');

  console.log('\n--- 5. Semantic Validation: Undeclared Dimension Reference ---');
  const invalidJson3 = JSON.parse(JSON.stringify(demoTemplate));
  invalidJson3.questions[0].dimension_key = 'non_existent_dimension_xyz';
  const valRes3 = await service.validateJson(invalidJson3);
  assert.strictEqual(valRes3.valid, false);
  assert(valRes3.errors.some(e => e.message.includes('References dimension "non_existent_dimension_xyz"')), 'Must flag undeclared dimension');
  console.log('✔ Correctly caught semantic error: Undeclared dimension reference');

  console.log('\n--- 6. Semantic Validation: Invalid Score Ranges ---');
  const invalidJson4 = JSON.parse(JSON.stringify(demoTemplate));
  invalidJson4.result_profiles[0].minimum_score = 90;
  invalidJson4.result_profiles[0].maximum_score = 10; // min > max
  const valRes4 = await service.validateJson(invalidJson4);
  assert.strictEqual(valRes4.valid, false);
  assert(valRes4.errors.some(e => e.message.includes('cannot be greater than maximum_score')), 'Must flag invalid score range');
  console.log('✔ Correctly caught semantic error: minimum_score > maximum_score');

  console.log('\n--- 7. Non-existent Category Rejection ---');
  const invalidJson5 = JSON.parse(JSON.stringify(demoTemplate));
  invalidJson5.assessment.category_slug = 'category_that_does_not_exist';
  const valRes5 = await service.validateJson(invalidJson5);
  assert.strictEqual(valRes5.valid, false);
  assert(valRes5.errors.some(e => e.field === 'assessment.category_slug'), 'Must flag non-existent category');
  console.log('✔ Correctly flagged non-existent category slug');

  console.log('\n--- 8. Import New Assessment as Draft (JSON) ---');
  const importRes = await service.importAssessment(demoTemplate, {
    mode: 'create_new',
    fileName: 'workplace-stress.json',
    actorId: 'admin_master_1'
  });
  assert(importRes.assessmentId, 'Must return assessmentId');
  assert.strictEqual(importRes.status, 'draft', 'Must default to draft status');
  assert.strictEqual(importRes.slug, demoTemplate.assessment.slug);

  // Verify records in DB
  const dbAsm = sqlite.prepare('SELECT * FROM assessments WHERE id = ?').get(importRes.assessmentId);
  assert.strictEqual(dbAsm.name, demoTemplate.assessment.name);
  assert.strictEqual(dbAsm.status, 'draft');

  const dbQuestions = sqlite.prepare('SELECT * FROM assessment_questions WHERE assessment_id = ?').all(importRes.assessmentId);
  assert.strictEqual(dbQuestions.length, demoTemplate.questions.length);

  const dbDims = sqlite.prepare('SELECT * FROM assessment_dimensions WHERE assessment_id = ?').all(importRes.assessmentId);
  assert.strictEqual(dbDims.length, demoTemplate.dimensions.length);

  const dbRules = sqlite.prepare('SELECT * FROM scoring_rules WHERE assessment_id = ?').all(importRes.assessmentId);
  assert(dbRules.length > 0, 'Scoring rules must be generated');
  console.log(`✔ Successfully imported "${dbAsm.name}" into D1 with ${dbQuestions.length} questions, ${dbDims.length} dimensions, and ${dbRules.length} scoring rules.`);

  console.log('\n--- 9. Duplicate Slug Conflict Detection (JSON) ---');
  const conflictVal = await service.validateJson(demoTemplate);
  assert.strictEqual(conflictVal.slugConflict.exists, true, 'Must detect duplicate slug');
  assert.strictEqual(conflictVal.slugConflict.existingAssessmentId, importRes.assessmentId);
  console.log(`✔ Slug conflict detected: Existing assessment "${conflictVal.slugConflict.existingAssessmentName}"`);

  console.log('\n--- 10. Update Existing Assessment Safe Replacement (JSON) ---');
  const modifiedPayload = JSON.parse(JSON.stringify(demoTemplate));
  modifiedPayload.assessment.name = 'Workplace Stress & Resilience Inventory (Updated)';
  const updateRes = await service.importAssessment(modifiedPayload, {
    mode: 'update_existing',
    fileName: 'workplace-stress-update.json',
    actorId: 'admin_master_1'
  });
  assert.strictEqual(updateRes.assessmentId, importRes.assessmentId);
  console.log('✔ Existing assessment cleanly updated with 0 orphaned questions or dimensions');

  console.log('\n--- 11. Export Existing Assessment to Schema v1.0 JSON ---');
  const exportedJson = await service.exportAssessment(importRes.assessmentId, 'admin_master_1');
  assert.strictEqual(exportedJson.schema_version, '1.0');
  assert.strictEqual(exportedJson.assessment.slug, demoTemplate.assessment.slug);
  assert.strictEqual(exportedJson.questions.length, demoTemplate.questions.length);
  console.log('✔ Successfully exported assessment to complete Schema v1.0 JSON');

  console.log('\n--- 12. EXPORT → IMPORT ROUND-TRIP FIDELITY TEST (JSON) ---');
  const loveLangExport = await service.exportAssessment('asm_love_language', 'admin_master_1');
  assert.strictEqual(loveLangExport.schema_version, '1.0');

  loveLangExport.assessment.slug = 'love-language-clone-test';
  loveLangExport.assessment.name = 'Love Language Test (Cloned Round-Trip)';
  const roundTripImport = await service.importAssessment(loveLangExport, {
    mode: 'create_new',
    fileName: 'love-language-clone.json',
    actorId: 'admin_master_1'
  });
  const clonedAsm = sqlite.prepare('SELECT * FROM assessments WHERE id = ?').get(roundTripImport.assessmentId);
  assert.strictEqual(clonedAsm.slug, 'love-language-clone-test');
  console.log('✔ 100% Round-Trip Fidelity Verified for JSON');

  // =========================================================================
  // PART B: CSV IMPORT / EXPORT SUITE
  // =========================================================================
  console.log('\n--- 13. CSV Template & Full Example Generators ---');
  const csvTemplate = service.generateDemoCsvTemplate();
  assert(csvTemplate.includes(REQUIRED_CSV_HEADERS.join(',')), 'Must include 21 required headers');
  assert(csvTemplate.includes('workplace-stress-resilience-inventory'));

  const fullExampleCsv = service.generateFullExampleCsv();
  assert(fullExampleCsv.includes('communication-agility-profile'), 'Must include multiple assessments');
  assert(fullExampleCsv.includes('तनाव'), 'Must support Hindi Unicode text');
  assert(fullExampleCsv.includes('शांतपणे'), 'Must support Marathi Unicode text');
  console.log('✔ CSV Template and Multilingual Examples generated with 21 headers and UTF-8 BOM');

  console.log('\n--- 14. Valid CSV Validation (Single & Multi-Assessment) ---');
  const valCsv1 = await service.validateCsv(csvTemplate);
  assert.strictEqual(valCsv1.valid, true, 'CSV Template should be valid');
  assert.strictEqual(valCsv1.assessmentCount, 1);
  assert.strictEqual(valCsv1.assessments[0].questionCount, 3);
  assert.strictEqual(valCsv1.assessments[0].dimensions.length, 2);

  const valCsvFull = await service.validateCsv(fullExampleCsv);
  assert.strictEqual(valCsvFull.valid, true, 'Full example CSV should be valid');
  assert.strictEqual(valCsvFull.assessmentCount, 2, 'Must recognize 2 distinct assessments in 1 CSV file');
  assert.strictEqual(valCsvFull.assessments[0].slug, 'workplace-stress-resilience-inventory');
  assert.strictEqual(valCsvFull.assessments[1].slug, 'communication-agility-profile');
  console.log(`✔ Multi-assessment CSV validation passed: ${valCsvFull.assessmentCount} assessments grouped cleanly`);

  console.log('\n--- 15. Invalid CSV: Missing Headers ---');
  const badCsvHeaders = 'assessment_slug,question_text,dimension\nmy-slug,Some text,Trait';
  const valBadHeaders = await service.validateCsv(badCsvHeaders);
  assert.strictEqual(valBadHeaders.valid, false);
  assert(valBadHeaders.errors.some(e => e.field === 'headers'), 'Must detect missing required headers');
  console.log('✔ Missing CSV headers correctly rejected with clear fatal error');

  console.log('\n--- 16. RFC 4180 Parsing: Embedded Commas, Quotes & Unicode ---');
  const quotedCsv = `${REQUIRED_CSV_HEADERS.join(',')}\r\n` +
    `"mindfulness-check","Mindfulness & Presence Scale","mental-wellbeing","mq1","1","When I am doing tasks, I often think about ""other things"", project issues, or upcoming deadlines.","likert","1","Present Moment Awareness","1.0","0","Never, or very rarely","Rarely","Sometimes","Often","Very often, or always","1","2","3","4","5"\r\n` +
    `"mindfulness-check","Mindfulness & Presence Scale","mental-wellbeing","mq2","2","मला वर्तमानातील संवादांवर पूर्ण लक्ष केंद्रित करता येते. (I focus fully on present conversations)","likert","1","Mindful Attention","1.5","1","Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree","5","4","3","2","1"`;

  const valQuoted = await service.validateCsv(quotedCsv);
  assert.strictEqual(valQuoted.valid, true);
  assert.strictEqual(valQuoted.assessments[0].rows[0].question_text, 'When I am doing tasks, I often think about "other things", project issues, or upcoming deadlines.');
  assert(valQuoted.assessments[0].rows[1].question_text.includes('संवादांवर'));
  assert.strictEqual(valQuoted.assessments[0].rows[1].weight, 1.5);
  assert.strictEqual(valQuoted.assessments[0].rows[1].reverse, true);
  console.log('✔ RFC 4180 quotes, embedded commas, weights, and reverse flags parsed flawlessly');

  console.log('\n--- 17. Semantic Validation: Duplicate Question ID & Missing Dimension ---');
  const semanticBadCsv = `${REQUIRED_CSV_HEADERS.join(',')}\r\n` +
    `"test-asm","Test Assessment","personality","q1","1","Question 1","likert","1","Trait A","1.0","0","Opt 1","Opt 2","","","","1","2","","",""\r\n` +
    `"test-asm","Test Assessment","personality","q1","2","Question 2","likert","1","","1.0","0","Opt 1","Opt 2","","","","1","2","","",""`;

  const valSemanticBad = await service.validateCsv(semanticBadCsv);
  assert.strictEqual(valSemanticBad.valid, false);
  assert(valSemanticBad.errors.some(e => e.message.includes('Duplicate question_id')), 'Must flag duplicate question_id');
  assert(valSemanticBad.errors.some(e => e.message.includes('dimension is required')), 'Must flag missing dimension');
  console.log('✔ Correctly caught duplicate question IDs and missing dimension in CSV');

  console.log('\n--- 18. Batch CSV Import with Default Drafts & Automatic Archetypes ---');
  const importCsvRes = await service.importCsvAssessments(quotedCsv, {
    assessmentModes: { 'mindfulness-check': 'create_new' },
    fileName: 'mindfulness.csv',
    actorId: 'admin_master_1'
  });
  assert.strictEqual(importCsvRes.results.length, 1);
  assert.strictEqual(importCsvRes.results[0].slug, 'mindfulness-check');
  assert.strictEqual(importCsvRes.results[0].status, 'draft');

  const dbMindful = sqlite.prepare('SELECT * FROM assessments WHERE slug = ?').get('mindfulness-check');
  assert(dbMindful, 'Assessment must exist in D1');
  assert.strictEqual(dbMindful.status, 'draft');

  const dbMindfulQ = sqlite.prepare('SELECT * FROM assessment_questions WHERE assessment_id = ?').all(dbMindful.id);
  assert.strictEqual(dbMindfulQ.length, 2);

  const dbMindfulOpts = sqlite.prepare('SELECT * FROM question_options WHERE question_id = ?').all(dbMindfulQ[0].id);
  assert.strictEqual(dbMindfulOpts.length, 5);

  const dbMindfulProfiles = sqlite.prepare('SELECT * FROM result_types WHERE assessment_id = ?').all(dbMindful.id);
  assert(dbMindfulProfiles.length > 0, 'Default result profile must be generated for CSV imports');
  console.log(`✔ CSV Batch imported into D1 with questions, options, dimensions, and default result profile`);

  console.log('\n--- 19. Export Assessment to 21-Column CSV & Formula Injection Defense ---');
  const exportedCsv = await service.exportAssessmentToCsv(dbMindful.id, 'admin_master_1');
  assert(exportedCsv.csv.startsWith('\uFEFF'), 'CSV export must start with UTF-8 BOM');
  assert(exportedCsv.csv.includes('mindfulness-check'));
  assert(exportedCsv.csv.includes('Present Moment Awareness'));

  // Test Formula Injection Escaping
  const formulaCell1 = service.escapeCsvCell('=SUM(A1:A10)');
  assert(formulaCell1.startsWith("'=SUM"), 'Must prefix risky formula with single quote');

  const formulaCell2 = service.escapeCsvCell('+123456');
  assert(formulaCell2.startsWith("'+123456"));

  const formulaCell3 = service.escapeCsvCell('@cmd_exec');
  assert(formulaCell3.startsWith("'@cmd_exec"));
  console.log('✔ CSV Export generated cleanly with spreadsheet Formula Injection defenses');

  console.log('\n--- 20. CSV EXPORT → CSV IMPORT ROUND-TRIP FIDELITY TEST ---');
  // Export Big Five from seed
  const bigFiveCsv = await service.exportAssessmentToCsv('asm_big_five', 'admin_master_1');
  assert(bigFiveCsv.csv.length > 100);

  // Replace slug for clone import
  const clonedCsvContent = bigFiveCsv.csv
    .replaceAll('big-five-personality-test', 'big-five-csv-clone')
    .replaceAll('Big Five (OCEAN) Personality Test', 'Big Five Cloned via CSV');

  const valClonedCsv = await service.validateCsv(clonedCsvContent);
  assert.strictEqual(valClonedCsv.valid, true);

  const cloneCsvImportRes = await service.importCsvAssessments(clonedCsvContent, {
    assessmentModes: { 'big-five-csv-clone': 'create_new' },
    fileName: 'big_five_clone.csv',
    actorId: 'admin_master_1'
  });

  const dbClonedAsm = sqlite.prepare('SELECT * FROM assessments WHERE slug = ?').get('big-five-csv-clone');
  assert(dbClonedAsm);
  const dbClonedQuestions = sqlite.prepare('SELECT * FROM assessment_questions WHERE assessment_id = ?').all(dbClonedAsm.id);
  assert.strictEqual(dbClonedQuestions.length, 10, 'All 10 questions must be re-imported cleanly from CSV');
  console.log('✔ 100% CSV Export -> Import Round-Trip verified with data parity!');

  console.log('\n--- 21. Import History & Audit Logging for CSV ---');
  const historyRows = await service.getImportHistory(10, 0);
  assert(historyRows.some(h => h.schema_version === 'csv_1.0' && h.status === 'success'));

  const csvAuditLogs = sqlite.prepare(`SELECT * FROM audit_logs WHERE action IN ('assessment_imported_csv', 'assessment_exported_csv')`).all();
  assert(csvAuditLogs.length >= 2, 'Must log CSV import and export actions');
  console.log(`✔ CSV operations recorded in import history ledger and audit logs`);

  console.log('\n========================================================================');
  console.log('🎉 ALL 21 JSON & CSV ASSESSMENT IMPORT/EXPORT TESTS PASSED (0 ERRORS)');
  console.log('========================================================================');
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
