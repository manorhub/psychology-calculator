import { execSync } from 'node:child_process';

console.log('=== Complete Multilingual Database Audit (Remote D1) ===\n');

function runRemote(sql) {
  const sanitized = sql.replace(/"/g, '""');
  const res = execSync(`npx wrangler d1 execute psychology_db --remote --command="${sanitized}"`, {
    encoding: 'utf8'
  });
  const jsonStart = res.indexOf('[');
  if (jsonStart === -1) return [];
  const parsed = JSON.parse(res.slice(jsonStart));
  return parsed[0]?.results || [];
}

try {
  // 1. Categories
  const categories = runRemote('SELECT id, slug, name FROM assessment_categories');
  const catTrans = runRemote('SELECT category_id, locale, name FROM assessment_category_translations');
  console.log(`Total Categories: ${categories.length}`);
  console.log(`Total Category Translations: ${catTrans.length}`);

  const catMap = {};
  for (const c of categories) {
    catMap[c.id] = { name: c.name, slug: c.slug, locales: {} };
  }
  for (const t of catTrans) {
    if (catMap[t.category_id]) {
      catMap[t.category_id].locales[t.locale] = t.name;
    }
  }

  console.log('\n--- Categories Translation Matrix ---');
  for (const [id, data] of Object.entries(catMap)) {
    const locs = Object.keys(data.locales).join(', ') || 'NONE';
    console.log(`[${id}] (${data.slug}) "${data.name}": ${locs}`);
  }

  // 2. Published Assessments
  const assessments = runRemote("SELECT id, slug, name, status, category_id FROM assessments WHERE status = 'published'");
  const asmTrans = runRemote('SELECT assessment_id, locale, name FROM assessment_translations');
  console.log(`\nTotal Published Assessments: ${assessments.length}`);
  console.log(`Total Assessment Translations: ${asmTrans.length}`);

  const asmMap = {};
  for (const a of assessments) {
    asmMap[a.id] = { name: a.name, slug: a.slug, category_id: a.category_id, locales: {} };
  }
  for (const t of asmTrans) {
    if (asmMap[t.assessment_id]) {
      asmMap[t.assessment_id].locales[t.locale] = t.name;
    }
  }

  console.log('\n--- Published Assessments Translation Matrix ---');
  let translatedCount = 0;
  let missingCount = 0;
  for (const [id, data] of Object.entries(asmMap)) {
    const locs = Object.keys(data.locales).join(', ') || 'NONE';
    const isFull = ['es', 'fr', 'de', 'pt', 'hi'].every(l => data.locales[l]);
    if (isFull) translatedCount++;
    else missingCount++;
    console.log(`[${id}] (${data.slug}) "${data.name}": ${locs}`);
  }
  console.log(`\nAssessments with full 5-locale translations: ${translatedCount} / ${assessments.length}`);
  console.log(`Assessments missing translations: ${missingCount} / ${assessments.length}`);

} catch (err) {
  console.error('Audit script error:', err);
}
