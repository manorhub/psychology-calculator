import { execSync } from 'node:child_process';

console.log('=== Deep Inspection: Dimensions & Questions across all assessments ===\n');

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
  const dimensions = runRemote('SELECT d.id, d.assessment_id, d.name, a.slug as asm_slug FROM assessment_dimensions d JOIN assessments a ON d.assessment_id = a.id');
  const dimTrans = runRemote('SELECT dimension_id, locale FROM assessment_dimension_translations');
  console.log(`Total Dimensions: ${dimensions.length}`);
  console.log(`Total Dimension Translations: ${dimTrans.length}`);

  const questions = runRemote('SELECT q.id, q.assessment_id, q.question_text, a.slug as asm_slug FROM assessment_questions q JOIN assessments a ON q.assessment_id = a.id');
  const qTrans = runRemote('SELECT question_id, locale FROM assessment_question_translations');
  console.log(`Total Questions: ${questions.length}`);
  console.log(`Total Question Translations: ${qTrans.length}`);

} catch (err) {
  console.error('Inspection error:', err);
}
