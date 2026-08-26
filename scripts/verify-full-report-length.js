import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { AIService } from '../src/services/ai/ai.service.js';
import { AssessmentRuntimeService } from '../src/services/assessment-runtime.service.js';
import { PdfService } from '../src/services/pdf/pdf.service.js';
import { PDFDocument } from 'pdf-lib';

async function main() {
  const db = new DatabaseSync(':memory:');
  const migrationsDir = path.resolve('migrations');
  for (const f of fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()) {
    db.exec(fs.readFileSync(path.join(migrationsDir, f), 'utf-8'));
  }
  db.exec(fs.readFileSync('seeds/dev_seed.sql', 'utf-8'));

  const mockD1 = {
    prepare(q) {
      const stmt = db.prepare(q);
      return {
        bind(...p) {
          return {
            async first() { return stmt.get(...p) || null; },
            async all() { return { results: stmt.all(...p) || [], success: true }; },
            async run() { const i = stmt.run(...p); return { success: true, meta: { changes: i.changes } }; }
          };
        },
        async first() { return stmt.get() || null; },
        async all() { return { results: stmt.all() || [], success: true }; },
        async run() { const i = stmt.run(); return { success: true, meta: { changes: i.changes } }; }
      };
    }
  };

  const r2Store = new Map();
  const mockR2 = {
    async put(k, v, opt) {
      const data = v instanceof Uint8Array ? v : new Uint8Array(v);
      r2Store.set(k, { body: data, arrayBuffer: async () => data.buffer, key: k, customMetadata: opt?.customMetadata });
    },
    async get(k) { return r2Store.get(k) || null; }
  };

  const runtime = new AssessmentRuntimeService(mockD1);
  const ai = new AIService(mockD1, {});
  const pdfService = new PdfService(mockD1, mockR2);

  db.exec("INSERT OR IGNORE INTO users (id, email, role, status) VALUES ('usr_tester', 'tester@domain.com', 'user', 'active')");
  db.exec("INSERT OR IGNORE INTO credit_balances (user_id, balance) VALUES ('usr_tester', 50)");

  const asm = await runtime.getPublishedAssessmentBySlug('big-five-personality-test');
  const { attempt } = await runtime.startOrResumeAttempt(asm.assessment.id, 'usr_tester', null);
  for (const q of asm.questions) {
    await runtime.saveAnswer(attempt.id, q.id, q.options[0].id, 'usr_tester', null);
  }
  await runtime.completeAttempt(attempt.id, 'usr_tester', null);

  const report = await ai.generateReportForAttempt(attempt.id, 'usr_tester', null);
  const pdf = await pdfService.generateAiReportPdf(report.reportId);

  const loadedDoc = await PDFDocument.load(pdf.pdfBytes);
  const pageCount = loadedDoc.getPageCount();

  // Count total words in JSON report content
  const totalJsonText = JSON.stringify(report.content);
  const wordCount = totalJsonText.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).length;

  console.log('\n==================================================');
  console.log('🎉 FULL-LENGTH AI DOSSIER VERIFICATION RESULTS');
  console.log('==================================================');
  console.log(`• Assessment:             ${report.assessmentName}`);
  console.log(`• Primary Archetype:      ${report.primaryArchetype}`);
  console.log(`• Headline:               ${report.content.headline}`);
  console.log(`• Total Structured Words: ~${wordCount} words`);
  console.log(`• Dimension Analyses:     ${report.content.dimension_analyses?.length || 0} dimensions`);
  console.log(`• Strengths:              ${report.content.strengths?.length || 0} assets`);
  console.log(`• Growth Blindspots:      ${report.content.growth_blindspots?.length || 0} blindspots`);
  console.log(`• Action Plan Practices:  ${report.content.action_plan?.length || 0} practices`);
  console.log(`• PDF Page Count:         ${pageCount} pages`);
  console.log(`• PDF File Size:          ${pdf.pdfBytes.byteLength} bytes`);
  console.log('==================================================\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
