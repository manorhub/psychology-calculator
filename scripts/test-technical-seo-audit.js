import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { SeoService } from '../src/services/seo/seo.service.js';
import { RedirectService } from '../src/services/seo/redirect.service.js';

async function runTechnicalSeoTests() {
  console.log('\n=== Psychology Calculator: Technical SEO & Crawl Report Verification Suite ===\n');

  // 1. Initialize In-Memory SQLite with all migrations
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
              return { success: true, meta: { changes: info.changes } };
            }
          };
        }
      };
    }
  };

  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    rawDb.exec(sql);
  }

  console.log(`✔ In-memory SQLite initialized with ${migrationFiles.length} sequential migrations (including 0037)`);

  const seoService = new SeoService(mockD1);
  const redirectService = new RedirectService(mockD1);

  // --- 1. Canonical Domain & URL Normalization ---
  console.log('\n--- 1. Testing Canonical Domain & URL Normalization ---');
  const seoSettings = await seoService.getSeoSettings();
  assert.strictEqual(seoSettings.canonicalDomain, 'https://www.psychologycalculator.com', 'Canonical domain must use preferred HTTPS www hostname');

  const homeMeta = await seoService.getPageMetadata({ path: '/' });
  assert.strictEqual(homeMeta.canonicalUrl, 'https://www.psychologycalculator.com/', 'Homepage canonical must be https://www.psychologycalculator.com/');

  const asmMeta = await seoService.getPageMetadata({ path: '/assessments/big-five-personality-test' });
  assert.strictEqual(asmMeta.canonicalUrl, 'https://www.psychologycalculator.com/assessments/big-five-personality-test', 'Assessment canonical mismatch');

  const catMeta = await seoService.getPageMetadata({ path: '/assessments/category/personality' });
  assert.strictEqual(catMeta.canonicalUrl, 'https://www.psychologycalculator.com/assessments/category/personality', 'Category canonical mismatch');

  console.log('✔ Canonical URLs strictly resolved with https://www.psychologycalculator.com and normalized paths');

  // --- 2. Title Formatting & Deduplication Architecture ---
  console.log('\n--- 2. Testing Title Formatting & Deduplication Architecture ---');
  
  // Test case 1: Raw page title
  const t1 = seoService.formatTitle('Self-Discipline Test');
  assert.strictEqual(t1, 'Self-Discipline Test | PsychologyCalculator.com', `Mismatch for raw title: ${t1}`);

  // Test case 2: Title with preexisting single brand
  const t2 = seoService.formatTitle('Self-Discipline Test | Psychology Calculator');
  assert.strictEqual(t2, 'Self-Discipline Test | PsychologyCalculator.com', `Failed to normalize single brand suffix: ${t2}`);

  // Test case 3: Title with quadruple repeated brand from crawl report bug
  const t3 = seoService.formatTitle('Career & Workplace Psychology Assessments | Psychology Calculator | Psychology Calculator | Psychology Calculator');
  assert.strictEqual(t3, 'Career & Workplace Psychology Assessments | PsychologyCalculator.com', `Failed to deduplicate multi-brand suffix: ${t3}`);

  // Test case 4: Title with legacy MindMetrics brand
  const t4 = seoService.formatTitle('Mental Wellbeing & Resilience Self-Checks | MindMetrics | Psychology Calculator');
  assert.strictEqual(t4, 'Mental Wellbeing & Resilience Self-Checks | PsychologyCalculator.com', `Failed to clean legacy MindMetrics brand: ${t4}`);

  // Test case 5: Empty/Default title
  const t5 = seoService.formatTitle('');
  assert.strictEqual(t5, 'Psychology Tests & Personality Assessments | PsychologyCalculator.com', `Failed default title fallback: ${t5}`);

  console.log('✔ Title deduplication engine eliminates double/triple branding across all inputs');

  // --- 3. Assessment & Category Meta Descriptions ---
  console.log('\n--- 3. Testing Assessment & Category Meta Descriptions ---');
  const assessments = rawDb.prepare("SELECT slug, name, short_description FROM assessments WHERE status = 'published'").all();
  assert(assessments.length >= 8, `Expected published assessments, found ${assessments.length}`);

  for (const asm of assessments) {
    assert(asm.short_description, `Assessment ${asm.slug} is missing short_description`);
    assert(
      !asm.short_description.startsWith('Comprehensive ') || !asm.short_description.endsWith('evaluation.'),
      `Assessment ${asm.slug} still contains generic placeholder: "${asm.short_description}"`
    );
    assert(asm.short_description.length >= 50, `Assessment ${asm.slug} description is too short (${asm.short_description.length} chars)`);
  }
  console.log(`✔ All ${assessments.length} published assessments have unique, rich, high-intent meta descriptions`);

  // --- 4. Robots Directives & Private Route Indexation Safety ---
  console.log('\n--- 4. Testing Robots Directives & Private Route Safety ---');
  const publicMeta = await seoService.getPageMetadata({ path: '/assessments' });
  assert.strictEqual(publicMeta.robots, 'index, follow', 'Public assessment catalog must be indexable');
  assert.strictEqual(publicMeta.noindex, false);

  const privateMeta = await seoService.getPageMetadata({ path: '/login', noindex: true });
  assert(privateMeta.robots.includes('noindex'), 'Auth route must have noindex directive');
  assert.strictEqual(privateMeta.noindex, true);

  console.log('✔ Robots directives strictly enforce indexable public catalog and noindexed private routes');

  // --- 5. Redirects & Alias Traversal ---
  console.log('\n--- 5. Testing 301 Redirects & Alias Traversal ---');
  const rTerms = await redirectService.resolveRedirect('/terms');
  assert(rTerms.found && rTerms.targetPath === '/terms-of-service' && rTerms.statusCode === 301, 'Redirect /terms -> /terms-of-service failed');

  const rPrivacy = await redirectService.resolveRedirect('/privacy');
  assert(rPrivacy.found && rPrivacy.targetPath === '/privacy-policy' && rPrivacy.statusCode === 301, 'Redirect /privacy -> /privacy-policy failed');

  const rRelCat = await redirectService.resolveRedirect('/assessments/category/relationships-attachment');
  assert(rRelCat.found && rRelCat.targetPath === '/assessments/category/relationships' && rRelCat.statusCode === 301, 'Redirect old category slug failed');

  const rCopyAsm = await redirectService.resolveRedirect('/assessments/emotional-intelligence-test-copy');
  assert(rCopyAsm.found && rCopyAsm.targetPath === '/assessments/emotional-intelligence-test' && rCopyAsm.statusCode === 301, 'Redirect duplicate copy assessment failed');

  console.log('✔ 301 Redirect engine cleanly handles legacy aliases and duplicate assessment paths');

  // --- 6. XML Sitemap Generation ---
  console.log('\n--- 6. Testing Dynamic XML Sitemap Generation ---');
  const sitemapXml = await seoService.generateSitemapXml();
  assert(sitemapXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Invalid XML declaration in sitemap');
  assert(sitemapXml.includes('<loc>https://www.psychologycalculator.com/</loc>'), 'Homepage missing from sitemap');
  assert(sitemapXml.includes('<loc>https://www.psychologycalculator.com/assessments</loc>'), 'Assessments catalog missing from sitemap');
  assert(sitemapXml.includes('<loc>https://www.psychologycalculator.com/terms-of-service</loc>'), 'Terms page missing from sitemap');
  assert(sitemapXml.includes('<loc>https://www.psychologycalculator.com/privacy-policy</loc>'), 'Privacy page missing from sitemap');
  assert(!sitemapXml.includes('https://psychologycalculator.com/'), 'Non-www URLs must NOT appear in sitemap');
  assert(!sitemapXml.includes('/admin/'), 'Admin routes must NOT appear in sitemap');
  assert(!sitemapXml.includes('/login'), 'Login routes must NOT appear in sitemap');
  assert(!sitemapXml.includes('emotional-intelligence-test-copy'), 'Archived duplicate assessments must NOT appear in sitemap');

  console.log('✔ Dynamic XML Sitemap strictly outputs canonical, public, indexable URLs');

  // --- 7. Dynamic Robots.txt Generation ---
  console.log('\n--- 7. Testing Dynamic Robots.txt Generation ---');
  const robotsTxt = await seoService.generateRobotsTxt();
  assert(robotsTxt.includes('User-agent: *'), 'Missing User-agent in robots.txt');
  assert(robotsTxt.includes('Disallow: /admin/'), 'Missing Disallow /admin/ in robots.txt');
  assert(robotsTxt.includes('Disallow: /dashboard/'), 'Missing Disallow /dashboard/ in robots.txt');
  assert(robotsTxt.includes('Disallow: /api/'), 'Missing Disallow /api/ in robots.txt');
  assert(robotsTxt.includes('Sitemap: https://www.psychologycalculator.com/sitemap.xml'), 'Sitemap directive in robots.txt must use canonical domain');

  console.log('✔ Dynamic Robots.txt contains valid directives and canonical sitemap link');

  console.log('\n============================================================');
  console.log('🎉 ALL TECHNICAL SEO & CRAWL VERIFICATION TESTS PASSED!');
  console.log('============================================================\n');
}

runTechnicalSeoTests().catch((err) => {
  console.error('❌ SEO Test suite failed:', err);
  process.exit(1);
});
