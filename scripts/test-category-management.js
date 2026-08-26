import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { AssessmentCategoryService } from '../src/services/assessment-category.service.ts';
import { SeoService } from '../src/services/seo/seo.service.ts';
import { AssessmentImportExportService } from '../src/services/assessment-import-export.service.ts';

console.log('\n=== Psychology Calculator: Assessment Category Management Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database with Foreign Keys ON
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');
console.log('✔ In-memory SQLite initialized with strict foreign keys enabled');

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

const fkCheck = sqlite.prepare('PRAGMA foreign_key_check').all();
assert.strictEqual(fkCheck.length, 0, 'Foreign key errors found in migrations');
console.log(`✔ Applied all ${migrationFiles.length} migrations with 0 foreign key errors`);

// 3. Apply Seeds
const seedPath = path.resolve(process.cwd(), 'seeds/dev_seed.sql');
const seedSql = fs.readFileSync(seedPath, 'utf-8');
sqlite.exec(seedSql);
console.log('✔ Development seed data applied cleanly');

// 4. Create Cloudflare D1 Mock Interface
function createMockD1(rawDb) {
  return {
    prepare(query) {
      return {
        bind(...params) {
          return {
            async first(colName) {
              const stmt = rawDb.prepare(query);
              const result = stmt.get(...params);
              if (!result) return null;
              return colName ? result[colName] : result;
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
const categoryService = new AssessmentCategoryService(mockDb);
const seoService = new SeoService(mockDb);
const importExportService = new AssessmentImportExportService(mockDb);

let testsPassed = 0;
function pass(msg) {
  testsPassed++;
  console.log(`✔ ${msg}`);
}

async function runTests() {
  // ----------------------------------------------------
  // Test 1: Seed Master Psychology Categories
  // ----------------------------------------------------
  console.log('\n--- 1. Testing Master Categories Seeding ---');
  await categoryService.seedMasterCategories();
  const allCategories = await categoryService.getCategories();
  assert(allCategories.length >= 7, 'Expected at least 7 categories seeded');
  pass(`Verified ${allCategories.length} categories present in database`);

  // ----------------------------------------------------
  // Test 2: Idempotent Seeding (0 Duplicates)
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Idempotent Seeding (No Duplicates) ---');
  const seededAgain = await categoryService.seedMasterCategories();
  assert.strictEqual(seededAgain, 0, `Expected 0 new categories seeded on second run, got ${seededAgain}`);
  const categoriesAfterSecondSeed = await categoryService.getCategories();
  assert.strictEqual(categoriesAfterSecondSeed.length, allCategories.length, 'Category count should remain unchanged on re-seeding');
  pass('Idempotent seeding verified: 0 duplicates created');

  // ----------------------------------------------------
  // Test 3: Create Category
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Category Creation ---');
  const createdCat = await categoryService.createCategory({
    name: 'Mindfulness & Meditation',
    slug: 'mindfulness-meditation',
    short_description: 'Assess mindfulness tendencies and state awareness.',
    description: 'Explore mindful presence, grounding practices, and meditative awareness through psychometric scales.',
    icon: '🧘',
    sort_order: 8,
    status: 'active',
    featured: true,
    seo_title: 'Mindfulness & Meditation Assessments | Psychology Calculator',
    seo_description: 'Explore state and trait mindfulness assessments.'
  }, 'admin_master_1');

  assert(createdCat.id.startsWith('cat_'), 'Category ID should start with cat_');
  assert.strictEqual(createdCat.name, 'Mindfulness & Meditation', 'Category name should match');
  assert.strictEqual(createdCat.slug, 'mindfulness-meditation', 'Category slug should match');
  assert.strictEqual(createdCat.featured, 1, 'Category should be featured');
  assert.strictEqual(createdCat.display_order, 8, 'Display order should be 8');
  pass(`Created Category "${createdCat.name}" (ID: ${createdCat.id})`);

  // ----------------------------------------------------
  // Test 4: Duplicate Slug Rejection
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Duplicate Slug Rejection ---');
  let duplicateRejected = false;
  try {
    await categoryService.createCategory({
      name: 'Duplicate Mindfulness',
      slug: 'mindfulness-meditation' // Duplicate
    }, 'admin_master_1');
  } catch (err) {
    duplicateRejected = true;
    assert(err.message.includes('already exists'), 'Expected slug collision error');
  }
  assert(duplicateRejected, 'Duplicate slug creation must be rejected');
  pass('Duplicate slug collision correctly caught and rejected');

  // ----------------------------------------------------
  // Test 5: Category Retrieval by Slug & ID
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Category Retrieval by Slug & ID ---');
  const fetchedBySlug = await categoryService.getCategoryBySlug('mindfulness-meditation');
  assert(fetchedBySlug !== null, 'Category should be retrieved by slug');
  assert.strictEqual(fetchedBySlug.id, createdCat.id, 'Fetched category ID should match');

  const fetchedById = await categoryService.getCategoryById(createdCat.id);
  assert(fetchedById !== null, 'Category should be retrieved by ID');
  assert.strictEqual(fetchedById.slug, 'mindfulness-meditation', 'Fetched category slug should match');
  pass('Category retrieval by slug and ID verified');

  // ----------------------------------------------------
  // Test 6: Edit Category
  // ----------------------------------------------------
  console.log('\n--- 6. Testing Category Edit & Updates ---');
  const updatedCat = await categoryService.updateCategory(createdCat.id, {
    name: 'Mindfulness, Focus & Awareness',
    short_description: 'Assess attentional focus, mindfulness, and meta-awareness.',
    display_order: 10
  }, 'admin_master_1');

  assert.strictEqual(updatedCat.name, 'Mindfulness, Focus & Awareness', 'Category name should be updated');
  assert.strictEqual(updatedCat.display_order, 10, 'Display order should be updated to 10');
  pass(`Updated category name to: "${updatedCat.name}"`);

  // ----------------------------------------------------
  // Test 7: Change Slug with Uniqueness
  // ----------------------------------------------------
  console.log('\n--- 7. Testing Slug Change & Collision Check ---');
  const updatedSlugCat = await categoryService.updateCategory(createdCat.id, {
    slug: 'mindfulness-focus-awareness'
  }, 'admin_master_1');
  assert.strictEqual(updatedSlugCat.slug, 'mindfulness-focus-awareness', 'Slug should be updated');

  let editDuplicateRejected = false;
  try {
    await categoryService.updateCategory(createdCat.id, {
      slug: 'personality' // Collides with existing master category
    }, 'admin_master_1');
  } catch (err) {
    editDuplicateRejected = true;
  }
  assert(editDuplicateRejected, 'Slug update collision must be rejected');
  pass('Slug update and collision validation verified');

  // ----------------------------------------------------
  // Test 8: Category Archive & Public Visibility Isolation
  // ----------------------------------------------------
  console.log('\n--- 8. Testing Category Archive & Public Visibility ---');
  const archivedCat = await categoryService.archiveCategory(createdCat.id, 'admin_master_1');
  assert.strictEqual(archivedCat.status, 'archived', 'Category status should be archived');

  const publicSearch = await categoryService.getCategoryBySlug(archivedCat.slug, false);
  assert.strictEqual(publicSearch, null, 'Archived category must NOT be returned in public queries');

  const adminSearch = await categoryService.getCategoryBySlug(archivedCat.slug, true);
  assert(adminSearch !== null, 'Archived category should be accessible when includeNonActive=true');
  pass('Category archiving and public isolation verified');

  // ----------------------------------------------------
  // Test 9: Category Restore / Unarchive
  // ----------------------------------------------------
  console.log('\n--- 9. Testing Category Restore / Unarchive ---');
  const restoredCat = await categoryService.archiveCategory(createdCat.id, 'admin_master_1');
  assert.strictEqual(restoredCat.status, 'active', 'Category should toggle back to active');

  const restoredPublicSearch = await categoryService.getCategoryBySlug(restoredCat.slug, false);
  assert(restoredPublicSearch !== null, 'Restored active category should now appear in public queries');
  pass('Category restored to active verified');

  // ----------------------------------------------------
  // Test 10: Sort Order Sorting
  // ----------------------------------------------------
  console.log('\n--- 10. Testing Sort Order Hierarchy ---');
  const orderedList = await categoryService.getCategories({ status: 'active' });
  for (let i = 0; i < orderedList.length - 1; i++) {
    assert(
      orderedList[i].display_order <= orderedList[i + 1].display_order,
      `Sort order failure at index ${i}: ${orderedList[i].display_order} > ${orderedList[i + 1].display_order}`
    );
  }
  pass(`Verified strict ascending sort order across ${orderedList.length} active categories`);

  // ----------------------------------------------------
  // Test 11: Search Filtering
  // ----------------------------------------------------
  console.log('\n--- 11. Testing Category Search Filtering ---');
  const searchResults = await categoryService.getCategories({ search: 'Mindfulness' });
  assert(searchResults.length >= 1, 'Search for Mindfulness should return at least 1 result');
  assert(searchResults[0].slug.includes('mindfulness'), 'Search result should match query');
  pass('Search filtering verified');

  // ----------------------------------------------------
  // Test 12: Real Assessment Count Calculation
  // ----------------------------------------------------
  console.log('\n--- 12. Testing Assessment Count Calculation ---');
  const personalityCat = await categoryService.getCategoryBySlug('personality');
  assert(personalityCat !== null, 'Personality category should exist');
  assert(personalityCat.assessment_count > 0, `Expected assessments in personality category, got ${personalityCat.assessment_count}`);
  pass(`Verified real assessment count for "${personalityCat.name}": ${personalityCat.assessment_count} assessments`);

  // ----------------------------------------------------
  // Test 13: Empty Category Handling
  // ----------------------------------------------------
  console.log('\n--- 13. Testing Empty Category Handling ---');
  const emptyCat = await categoryService.getCategoryById(createdCat.id);
  assert.strictEqual(emptyCat.assessment_count, 0, `Expected 0 assessments in newly created category, got ${emptyCat.assessment_count}`);
  const emptyAssessments = await categoryService.getPublishedAssessmentsByCategory(createdCat.id);
  assert.strictEqual(emptyAssessments.length, 0, 'Published assessments array should be empty');
  pass('Empty category count (0) verified');

  // ----------------------------------------------------
  // Test 14: Safe Delete Guard (Blocked when assessments assigned)
  // ----------------------------------------------------
  console.log('\n--- 14. Testing Safe Delete Guard with Linked Assessments ---');
  let deleteBlocked = false;
  try {
    await categoryService.deleteCategory(personalityCat.id, 'admin_master_1');
  } catch (err) {
    deleteBlocked = true;
    assert(err.message.includes('This category contains assessments'), 'Expected assessment assignment warning');
  }
  assert(deleteBlocked, 'Category with assessments must NOT be deleted');
  pass('Safe delete guard verified: Prevented deletion of category with active assessments');

  // ----------------------------------------------------
  // Test 15: Safe Delete for Empty Category
  // ----------------------------------------------------
  console.log('\n--- 15. Testing Clean Deletion of Empty Category ---');
  const deleted = await categoryService.deleteCategory(createdCat.id, 'admin_master_1');
  assert.strictEqual(deleted, true, 'Empty category should be deleted successfully');
  const verifyDeleted = await categoryService.getCategoryById(createdCat.id);
  assert.strictEqual(verifyDeleted, null, 'Deleted category should no longer exist in D1');
  pass('Clean deletion of empty category verified');

  // ----------------------------------------------------
  // Test 16: HTML & XSS Sanitization
  // ----------------------------------------------------
  console.log('\n--- 16. Testing Input Sanitization (XSS Defense) ---');
  const xssCat = await categoryService.createCategory({
    name: 'Sanitization Test Category',
    slug: 'sanitization-test-category',
    short_description: '<script>alert("XSS")</script>Safe Short Text',
    description: '<script>alert("XSS")</script><p>Clean educational description</p>'
  }, 'admin_master_1');

  assert(!xssCat.short_description.includes('<script>'), 'Script tags must be stripped from short_description');
  assert(!xssCat.description.includes('<script>'), 'Script tags must be stripped from description');
  await categoryService.deleteCategory(xssCat.id, 'admin_master_1');
  pass('XSS and script tag sanitization verified');

  // ----------------------------------------------------
  // Test 17: SEO Metadata & Dynamic Title Generation
  // ----------------------------------------------------
  console.log('\n--- 17. Testing SEO Metadata Generation ---');
  const metaCat = await categoryService.getCategoryBySlug('personality');
  const pageMeta = await seoService.getPageMetadata({
    pageType: 'category',
    entityId: metaCat.id,
    path: `/assessments/category/${metaCat.slug}`,
    rawTitle: metaCat.seo_title || `${metaCat.name} Tests | Psychology Calculator`,
    defaultDescription: metaCat.seo_description || metaCat.description || ''
  });

  assert(pageMeta.title.includes('Personality'), 'SEO Title should contain category name');
  assert(pageMeta.canonicalUrl.includes('/assessments/category/personality'), 'Canonical URL should point to category path');
  assert.strictEqual(pageMeta.robots, 'index, follow', 'Active category should be indexed');
  pass(`SEO Metadata verified: Title = "${pageMeta.title}", Canonical = "${pageMeta.canonicalUrl}"`);

  // ----------------------------------------------------
  // Test 18: Sitemap Dynamic Inclusion
  // ----------------------------------------------------
  console.log('\n--- 18. Testing Sitemap Dynamic Inclusion ---');
  const sitemapXml = await seoService.generateXmlSitemap('https://psychologycalculator.com');
  assert(sitemapXml.includes('/assessments/category/personality'), 'Sitemap should include active personality category');
  pass('Sitemap inclusion of dynamic category URLs verified');

  // ----------------------------------------------------
  // Test 19: JSON Schema v1.0 Import Compatibility
  // ----------------------------------------------------
  console.log('\n--- 19. Testing JSON Schema v1.0 Import Compatibility ---');
  const demoJson = importExportService.generateDemoTemplateJson();
  demoJson.assessment.category_slug = 'personality'; // valid category
  const validResult = await importExportService.validateAssessmentJson(demoJson);
  assert(validResult.valid, `JSON Import should validate with valid category slug: ${JSON.stringify(validResult.errors)}`);

  demoJson.assessment.category_slug = 'non-existent-category-slug-999';
  const invalidResult = await importExportService.validateAssessmentJson(demoJson);
  assert(!invalidResult.valid, 'JSON Import must reject non-existent category slug');
  assert(invalidResult.errors.some((e) => e.field === 'category_slug'), 'Error should specify category_slug');
  pass('JSON Import Schema category validation verified');

  // ----------------------------------------------------
  // Test 20: CSV Import Compatibility
  // ----------------------------------------------------
  console.log('\n--- 20. Testing CSV Import Compatibility ---');
  const demoCsv = importExportService.generateDemoCsvTemplate();
  const validCsvResult = await importExportService.validateCsv(demoCsv);
  assert(validCsvResult.valid, `Valid CSV template should pass validation: ${JSON.stringify(validCsvResult.errors)}`);

  const badCategoryCsv = demoCsv.replace(/personality/g, 'non-existent-random-category-1234');
  const invalidCsvResult = await importExportService.validateCsv(badCategoryCsv);
  assert(!invalidCsvResult.valid, 'CSV Import must reject non-existent category slug');
  pass('CSV Import category validation verified');

  // ----------------------------------------------------
  // Test 21: Audit Logging Verification
  // ----------------------------------------------------
  console.log('\n--- 21. Testing Audit Logging for Category Actions ---');
  const auditLogs = sqlite.prepare('SELECT action, entity, entity_id FROM audit_logs WHERE entity = "category"').all();
  assert(auditLogs.length >= 3, `Expected at least 3 category audit logs, got ${auditLogs.length}`);
  const actions = auditLogs.map((l) => l.action);
  assert(actions.includes('category_created'), 'Audit trail should record category_created');
  assert(actions.includes('category_updated'), 'Audit trail should record category_updated');
  assert(actions.includes('category_deleted'), 'Audit trail should record category_deleted');
  pass(`Audit trail verified: Logged actions = [${Array.from(new Set(actions)).join(', ')}]`);

  // ----------------------------------------------------
  // Test 22: Full End-to-End User Acceptance Flow
  // ----------------------------------------------------
  console.log('\n--- 22. Executing Final End-to-End User Acceptance Flow ---');
  
  // Step A: Admin creates category "Test Acceptance Category"
  const e2eCat = await categoryService.createCategory({
    name: 'Test Acceptance Category',
    slug: 'test-acceptance-category',
    short_description: 'E2E Acceptance Test Domain',
    status: 'active'
  }, 'admin_master_1');
  console.log('  1. Admin created category: "Test Acceptance Category"');

  // Step B: Public category list loads it
  let activeCats = await categoryService.getActiveCategories();
  assert(activeCats.some((c) => c.slug === 'test-acceptance-category'), 'New category should appear in public list');
  console.log('  2. Category appeared in active public category list');

  // Step C: Admin edits category name
  await categoryService.updateCategory(e2eCat.id, {
    name: 'Updated Acceptance Category'
  }, 'admin_master_1');
  const updatedE2E = await categoryService.getCategoryById(e2eCat.id);
  assert.strictEqual(updatedE2E.name, 'Updated Acceptance Category', 'Category name should be updated');
  console.log('  3. Admin edited category name to "Updated Acceptance Category"');

  // Step D: Admin archives category
  await categoryService.archiveCategory(e2eCat.id, 'admin_master_1');
  activeCats = await categoryService.getActiveCategories();
  assert(!activeCats.some((c) => c.slug === 'test-acceptance-category'), 'Archived category should disappear from public list');
  console.log('  4. Category archived: disappeared from public listing while persisting in D1');

  // Step E: Clean up
  await categoryService.deleteCategory(e2eCat.id, 'admin_master_1');
  console.log('  5. Cleaned up acceptance test category');

  console.log('\n========================================================================');
  console.log(`🎉 ALL ${testsPassed} CATEGORY MANAGEMENT TESTS PASSED WITH ZERO ERRORS!`);
  console.log('========================================================================\n');
}

runTests().catch((err) => {
  console.error('Unhandled error in test suite:', err);
  process.exit(1);
});
