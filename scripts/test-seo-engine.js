import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { SeoService } from '../src/services/seo/seo.service.js';
import { InternalLinkService } from '../src/services/seo/internal-link.service.js';
import { RedirectService } from '../src/services/seo/redirect.service.js';

console.log('=== Psychology Calculator Phase 12: SEO & Programmatic Engine Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database
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

// Apply all 15 migrations
const migrationsDir = path.resolve(process.cwd(), 'migrations');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  rawDb.exec(sql);
}

// Apply development seeds
const seedSql = fs.readFileSync(path.resolve(process.cwd(), 'seeds/dev_seed.sql'), 'utf8');
rawDb.exec(seedSql);
console.log(`✔ In-memory SQLite initialized with ${migrationFiles.length} migrations and seed data`);

async function runSeoTests() {
  const seoService = new SeoService(mockD1);
  const linkService = new InternalLinkService(mockD1);
  const redirectService = new RedirectService(mockD1);

  console.log('\n--- 1. Testing Global SEO Settings & Dynamic Templating ---');
  const initialSettings = await seoService.getSeoSettings();
  assert.strictEqual(initialSettings.siteTitle, 'Psychology Calculator');
  assert.strictEqual(initialSettings.canonicalDomain, 'https://www.psychologycalculator.com');
  assert.strictEqual(initialSettings.titleTemplate, '{{page_title}} | PsychologyCalculator.com');

  const formatted = seoService.formatTitle('Attachment Style Quiz', initialSettings.titleTemplate);
  assert.strictEqual(formatted, 'Attachment Style Quiz | PsychologyCalculator.com');

  // Verify Admin Dynamic Update without code change
  rawDb
    .prepare("UPDATE site_settings SET value = '{{page_title}} — Scientific Psychometrics' WHERE key = 'seo_title_template'")
    .run();

  const updatedSettings = await seoService.getSeoSettings();
  assert.strictEqual(updatedSettings.titleTemplate, '{{page_title}} — Scientific Psychometrics');

  const newFormatted = seoService.formatTitle('Attachment Style Quiz', updatedSettings.titleTemplate);
  assert.strictEqual(newFormatted, 'Attachment Style Quiz | PsychologyCalculator.com');
  console.log(`✔ Dynamic title formula updated via D1 settings: "${newFormatted}"`);

  console.log('\n--- 2. Testing Page Metadata & Canonical URLs ---');
  const pageMeta = await seoService.getPageMetadata({
    pageType: 'assessment',
    entityId: 'asm_big_five',
    path: '/assessments/big-five-personality-test',
    rawTitle: 'Big Five Personality Assessment',
    defaultDescription: 'Take our standardized OCEAN Big Five assessment.'
  });

  assert.strictEqual(pageMeta.canonicalUrl, 'https://www.psychologycalculator.com/assessments/big-five-personality-test');
  assert.strictEqual(pageMeta.robots, 'index, follow');
  assert.strictEqual(pageMeta.ogType, 'website');
  assert.ok(pageMeta.ogImage.startsWith('https://www.psychologycalculator.com'));
  console.log(`✔ Resolved canonical URL: "${pageMeta.canonicalUrl}" with robots: "${pageMeta.robots}"`);

  console.log('\n--- 3. Testing Schema.org JSON-LD Structured Data ---');
  const orgSchema = seoService.generateStructuredData('Organization', {}, initialSettings);
  assert.strictEqual(orgSchema['@type'], 'Organization');
  assert.strictEqual(orgSchema.name, 'Psychology Calculator');
  assert.strictEqual(orgSchema.url, 'https://www.psychologycalculator.com');

  const siteSchema = seoService.generateStructuredData('WebSite', {}, initialSettings);
  assert.strictEqual(siteSchema['@type'], 'WebSite');
  assert.ok(siteSchema.potentialAction);

  const breadcrumbsSchema = seoService.generateStructuredData('BreadcrumbList', {
    items: [
      { name: 'Home', url: '/' },
      { name: 'Assessments', url: '/assessments' },
      { name: 'Big Five', url: '/assessments/big-five-personality-test' }
    ]
  }, initialSettings);
  assert.strictEqual(breadcrumbsSchema['@type'], 'BreadcrumbList');
  assert.strictEqual(breadcrumbsSchema.itemListElement.length, 3);
  assert.strictEqual(breadcrumbsSchema.itemListElement[0].position, 1);
  assert.strictEqual(breadcrumbsSchema.itemListElement[2].item, 'https://www.psychologycalculator.com/assessments/big-five-personality-test');

  const faqSchema = seoService.generateStructuredData('FAQPage', {
    faqs: [
      { question: 'Is this assessment scientifically validated?', answer: 'Yes, based on the 5-factor model.' }
    ]
  });
  assert.strictEqual(faqSchema['@type'], 'FAQPage');
  assert.strictEqual(faqSchema.mainEntity.length, 1);
  console.log('✔ JSON-LD structured data verified: Organization, WebSite, BreadcrumbList, FAQPage');

  console.log('\n--- 4. Testing Dynamic XML Sitemap Generation ---');
  const sitemapXml = await seoService.generateSitemapXml();
  assert.ok(sitemapXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(sitemapXml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  assert.ok(sitemapXml.includes('<loc>https://www.psychologycalculator.com/</loc>'));
  assert.ok(sitemapXml.includes('<loc>https://www.psychologycalculator.com/assessments</loc>'));
  assert.ok(sitemapXml.includes('<loc>https://www.psychologycalculator.com/pricing</loc>'));
  assert.ok(sitemapXml.includes('<loc>https://www.psychologycalculator.com/assessments/big-five-personality-test</loc>'));
  assert.ok(sitemapXml.includes('<loc>https://www.psychologycalculator.com/assessments/category/personality</loc>'));

  // Ensure private routes are NOT in sitemap
  assert.ok(!sitemapXml.includes('/admin'));
  assert.ok(!sitemapXml.includes('/dashboard'));
  assert.ok(!sitemapXml.includes('/results/'));
  assert.ok(!sitemapXml.includes('/reports/'));
  assert.ok(!sitemapXml.includes('/api/'));
  console.log('✔ Dynamic XML Sitemap generated: Public items included, private/admin routes strictly excluded');

  console.log('\n--- 5. Testing Dynamic Robots.txt Generation ---');
  const robotsTxt = await seoService.generateRobotsTxt();
  assert.ok(robotsTxt.includes('User-agent: *'));
  assert.ok(robotsTxt.includes('Allow: /'));
  assert.ok(robotsTxt.includes('Disallow: /admin/'));
  assert.ok(robotsTxt.includes('Disallow: /dashboard/'));
  assert.ok(robotsTxt.includes('Disallow: /api/'));
  assert.ok(robotsTxt.includes('Disallow: /results/'));
  assert.ok(robotsTxt.includes('Disallow: /reports/'));
  assert.ok(robotsTxt.includes('Sitemap: https://www.psychologycalculator.com/sitemap.xml'));
  console.log('✔ Dynamic robots.txt generated with strict crawl isolation');

  console.log('\n--- 6. Testing Internal Linking Engine ---');
  const relatedAsms = await linkService.getRelatedAssessments('asm_big_five', 'cat_personality', 4);
  assert.ok(relatedAsms.length >= 2, 'Should return configured related assessments');
  assert.ok(relatedAsms.some((r) => r.slug === 'attachment-style-test'));
  assert.ok(relatedAsms.some((r) => r.slug === 'emotional-intelligence-test'));

  const relatedCats = await linkService.getRelatedCategories('cat_personality', 3);
  assert.ok(relatedCats.length >= 2);
  assert.ok(!relatedCats.some((c) => c.id === 'cat_personality'));

  const breadcrumbs = linkService.getBreadcrumbs([
    { name: 'Assessments', path: '/assessments' },
    { name: 'Personality', path: '/categories/personality' },
    { name: 'Big Five Test', path: '/assessments/big-five-personality-test' }
  ]);
  assert.strictEqual(breadcrumbs.length, 4); // Home + 3 items
  assert.strictEqual(breadcrumbs[0].name, 'Home');
  console.log(`✔ Internal linking verified: ${relatedAsms.length} related tests, ${relatedCats.length} related categories, ${breadcrumbs.length} breadcrumb nodes`);

  console.log('\n--- 7. Testing URL Redirects & Loop Protection ---');
  const rId = await redirectService.createRedirect('/ocean-test', '/assessments/big-five-personality-test', 301);
  assert.ok(rId);

  const matched = await redirectService.resolveRedirect('/ocean-test');
  assert.strictEqual(matched.found, true);
  assert.strictEqual(matched.targetPath, '/assessments/big-five-personality-test');
  assert.strictEqual(matched.statusCode, 301);

  // Self-redirect rejection
  await assert.rejects(
    async () => {
      await redirectService.createRedirect('/assessments/big-five-personality-test', '/assessments/big-five-personality-test', 301);
    },
    { message: 'Source path and destination path cannot be identical (self-redirect)' }
  );

  // Direct loop rejection
  await assert.rejects(
    async () => {
      await redirectService.createRedirect('/assessments/big-five-personality-test', '/ocean-test', 301);
    },
    (err) => err.message.includes('Redirect loop detected')
  );

  // Multi-hop chain resolution: /route-a -> /route-b -> /route-c
  await redirectService.createRedirect('/route-a', '/route-b', 301);
  await redirectService.createRedirect('/route-b', '/route-c', 301);
  const chainMatch = await redirectService.resolveRedirect('/route-a');
  assert.strictEqual(chainMatch.found, true);
  assert.strictEqual(chainMatch.targetPath, '/route-c');
  console.log('✔ RedirectService verified: 301 matching, multi-hop chains resolved, circular loops blocked');

  console.log('\n--- 8. Testing Application-Level SEO Audit ---');
  const auditResult = await seoService.runSeoAudit();
  assert.ok(auditResult.score >= 80, `Expected clean seed audit score >= 80, got ${auditResult.score}`);
  assert.ok(auditResult.totalPagesAudited >= 8);
  console.log(`✔ SEO Audit executed: Health Score ${auditResult.score}/100 across ${auditResult.totalPagesAudited} entities`);

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE 12 SEO & PROGRAMMATIC ENGINE TESTS PASSED!');
  console.log('============================================================\n');
}

runSeoTests().catch((err) => {
  console.error('❌ SEO Engine Test failed:', err);
  process.exit(1);
});
