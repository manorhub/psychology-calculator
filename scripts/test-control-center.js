import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { SettingsService } from '../src/services/settings/settings.service.ts';
import { FeatureService } from '../src/services/features/feature.service.ts';
import { SystemHealthService } from '../src/services/system/system-health.service.ts';

function createMockD1(rawDb) {
  return {
    prepare(query) {
      const stmt = rawDb.prepare(query);
      return {
        bind(...params) {
          return {
            async all() {
              const rows = stmt.all(...params);
              return { results: rows, success: true, meta: {} };
            },
            async first(colName) {
              const row = stmt.get(...params);
              if (!row) return null;
              return colName ? row[colName] : row;
            },
            async run() {
              const info = stmt.run(...params);
              return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
            }
          };
        },
        async all() {
          const rows = stmt.all();
          return { results: rows, success: true, meta: {} };
        },
        async first(colName) {
          const row = stmt.get();
          if (!row) return null;
          return colName ? row[colName] : row;
        },
        async run() {
          const info = stmt.run();
          return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
        }
      };
    }
  };
}

async function runTests() {
  console.log('\n=== Psychology Calculator Phase 16: Admin Control Center & Global Settings Test Suite ===\n');

  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec('PRAGMA foreign_keys = ON;');

  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  const migrationFiles = [
    '0001_core_users.sql',
    '0002_assessments_schema.sql',
    '0003_scoring_and_results.sql',
    '0004_attempts_and_answers.sql',
    '0005_ai_and_prompts.sql',
    '0006_billing_and_credits.sql',
    '0007_content_and_settings.sql',
    '0008_auth_system.sql',
    '0009_assessment_builder_enhancements.sql',
    '0010_result_snapshots_and_sharing.sql',
    '0011_initial_psychology_assessments_seed.sql',
    '0012_ai_engine_and_generations.sql',
    '0013_pdf_and_generated_files.sql',
    '0014_lemon_squeezy_billing.sql',
    '0015_seo_engine_and_redirects.sql',
    '0016_content_cms_and_blog.sql',
    '0017_email_notifications_and_templates.sql',
    '0018_analytics_and_business_intelligence.sql',
    '0019_admin_control_center_and_global_settings.sql'
  ];

  for (const f of migrationFiles) {
    const filePath = path.join(migrationsDir, f);
    const sql = fs.readFileSync(filePath, 'utf8');
    rawDb.exec(sql);
  }

  console.log('✔ In-memory SQLite initialized with all 19 migrations and seeded settings\n');

  const d1 = createMockD1(rawDb);
  const settingsService = new SettingsService(d1);
  const featureService = new FeatureService(d1);
  const healthService = new SystemHealthService(d1, settingsService);

  // 1. Testing Settings CRUD & Cache Invalidation
  console.log('--- 1. Testing Dynamic Settings CRUD & In-Memory Cache ---');
  const initialSiteName = await settingsService.get('site_name', 'Default');
  assert.strictEqual(initialSiteName, 'Psychology Calculator', 'Initial site_name should match seeded default');

  // Update setting
  await settingsService.set('site_name', 'MindMetrics Pro', {}, 'admin_super');
  const updatedSiteName = await settingsService.get('site_name', 'Default');
  assert.strictEqual(updatedSiteName, 'MindMetrics Pro', 'Setting should immediately return updated value');

  // Revert
  await settingsService.set('site_name', 'Psychology Calculator', {}, 'admin_super');
  console.log('✔ Dynamic Settings get/set & immediate cache invalidation verified');

  // 2. Testing Public vs Secret Isolation
  console.log('\n--- 2. Testing Public vs Secret Configuration Isolation ---');
  await settingsService.set('smtp_password', 'ultra_secret_smtp_key_999');
  
  const publicSettings = await settingsService.getPublicSettings();
  assert.strictEqual(publicSettings.siteName, 'Psychology Calculator');
  assert.strictEqual(publicSettings.smtp_password, undefined, 'Secrets must never exist in public settings');

  const maskedGroup = await settingsService.getGroup('email');
  assert.strictEqual(maskedGroup.smtp_password, '••••••••', 'Secrets must be masked in group retrieval');
  console.log('✔ Public vs Secret isolation verified: secrets masked in UI and excluded from public payload');

  // 3. Testing Feature Flags Center
  console.log('\n--- 3. Testing Centralized Feature Flags ---');
  const allFlags = await featureService.getAll();
  assert.ok(allFlags.length >= 8, 'All 8 core feature flags seeded');

  const aiInitial = await featureService.isEnabled('ai_reports');
  assert.strictEqual(aiInitial, true, 'AI reports feature should be enabled by default');

  await featureService.toggle('ai_reports', false, 'admin_super');
  const aiDisabled = await featureService.isEnabled('ai_reports');
  assert.strictEqual(aiDisabled, false, 'AI reports feature should reflect toggled state');

  await featureService.toggle('ai_reports', true, 'admin_super');
  console.log('✔ Feature flag service toggles and database updates verified');

  // 4. Testing Homepage Dynamic Settings
  console.log('\n--- 4. Testing Homepage Dynamic Content & Sections ---');
  const homepageGroup = await settingsService.getGroup('homepage');
  assert.strictEqual(typeof homepageGroup.hero_heading, 'string');
  assert.strictEqual(homepageGroup.featured_assessments_enabled, true);

  await settingsService.setGroup('homepage', {
    hero_heading: 'Empower Your Emotional Journey'
  }, 'admin_super');

  const updatedHero = await settingsService.get('hero_heading', '');
  assert.strictEqual(updatedHero, 'Empower Your Emotional Journey');
  console.log('✔ Homepage group settings dynamically updated');

  // 5. Testing Announcement Bar & Maintenance Mode
  console.log('\n--- 5. Testing Announcement Bar & Maintenance Mode ---');
  await settingsService.setGroup('announcement', {
    announcement_enabled: true,
    announcement_message: 'Spring Sale: 20% off Pro subscriptions!'
  }, 'admin_super');

  const annSettings = await settingsService.getGroup('announcement');
  assert.strictEqual(annSettings.announcement_enabled, true);
  assert.strictEqual(annSettings.announcement_message, 'Spring Sale: 20% off Pro subscriptions!');

  const maintInitial = await settingsService.get('maintenance_mode', false);
  assert.strictEqual(maintInitial, false, 'Maintenance mode is off by default');
  console.log('✔ Announcement banner and maintenance mode configuration verified');

  // 6. Testing Legal Pages & Dynamic Markdown Rendering
  console.log('\n--- 6. Testing Legal & Policy Documents CMS ---');
  const legalPages = await settingsService.getLegalPages();
  assert.ok(legalPages.length >= 5, 'All 5 default legal pages seeded');

  const privacyPage = await settingsService.getLegalPageBySlug('privacy-policy');
  assert.ok(privacyPage, 'Privacy policy exists');
  assert.ok(privacyPage.content_html.includes('<h1>Privacy Policy</h1>'), 'Markdown correctly parsed to HTML');

  await settingsService.upsertLegalPage(
    'disclaimer',
    'Psychological & Medical Disclaimer',
    '# Important Clinical Notice\n\nThis platform is an educational self-reflection instrument.',
    true,
    'admin_super'
  );
  const updatedDisclaimer = await settingsService.getLegalPageBySlug('disclaimer');
  assert.ok(updatedDisclaimer?.content_html.includes('<h1>Important Clinical Notice</h1>'));
  console.log('✔ Legal CMS CRUD and Markdown-to-HTML rendering verified');

  // 7. Testing Configuration Export & Validated Import
  console.log('\n--- 7. Testing Sanitized JSON Backup Export & Validated Import ---');
  const exported = await settingsService.exportSanitizedConfig();
  assert.strictEqual(exported.appName, 'Psychology Calculator');
  assert.ok(exported.settings.site_name);
  assert.strictEqual(exported.settings.smtp_password, undefined, 'Exported JSON must omit secrets');
  assert.ok(exported.legalPages.length >= 5);

  const importResult = await settingsService.validateAndImportConfig(exported, 'admin_super');
  assert.ok(importResult.importedCount > 0, 'Config import applied records successfully');
  console.log(`✔ Sanitized JSON backup exported and restored (${importResult.importedCount} settings verified)`);

  // 8. Testing System Health & Infrastructure Diagnostics
  console.log('\n--- 8. Testing System Diagnostics & Infrastructure Health ---');
  const health = await healthService.getOverallHealth();
  assert.ok(health.checks.length >= 5, '5 subsystem health checks performed');
  const d1Check = health.checks.find((c) => c.service === 'Cloudflare D1 Database');
  assert.ok(d1Check && d1Check.status === 'healthy', 'D1 database check is healthy');
  console.log(`✔ Overall system health verified: ${health.status.toUpperCase()} across ${health.checks.length} checks`);

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE 16 ADMIN CONTROL CENTER & SETTINGS TESTS PASSED!');
  console.log('============================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Control Center Test Failed:', err);
  process.exit(1);
});
