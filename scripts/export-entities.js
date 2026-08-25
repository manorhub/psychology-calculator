import { execSync } from 'node:child_process';
import fs from 'node:fs';

console.log('=== Fetching all categories & assessments from remote D1 ===\n');

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

const categories = runRemote('SELECT id, slug, name, description FROM assessment_categories');
const assessments = runRemote('SELECT id, slug, name, short_description, category_id FROM assessments WHERE status = "published"');

console.log(`Fetched ${categories.length} categories, ${assessments.length} published assessments.`);

fs.writeFileSync('scripts/db-entities.json', JSON.stringify({ categories, assessments }, null, 2), 'utf8');
console.log('Saved to scripts/db-entities.json');
