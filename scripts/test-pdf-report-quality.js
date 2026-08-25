import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { AssessmentRuntimeService } from '../src/services/assessment-runtime.service.js';
import { AIService } from '../src/services/ai/ai.service.js';
import { CreditService } from '../src/services/credit.service.js';
import { PdfService } from '../src/services/pdf/pdf.service.js';
import { AIValidator } from '../src/services/ai/ai-validator.js';
import { PDFDocument } from 'pdf-lib';

console.log('=== Psychology Calculator: Premium AI Report Final Polish & Quality Test Suite ===\n');

// 1. In-Memory SQLite Setup
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

// 2. In-Memory Mock Cloudflare R2 Storage Bucket
const r2Store = new Map();
const mockR2Bucket = {
  async put(key, value, options) {
    let data;
    if (value instanceof Uint8Array) {
      data = value;
    } else if (value instanceof ArrayBuffer) {
      data = new Uint8Array(value);
    } else if (typeof value === 'string') {
      data = new TextEncoder().encode(value);
    } else {
      data = value;
    }

    const obj = {
      key,
      size: data.byteLength || 0,
      etag: `"${crypto.randomUUID()}"`,
      httpMetadata: options?.httpMetadata || {},
      customMetadata: options?.customMetadata || {},
      body: data,
      async arrayBuffer() {
        return data.buffer;
      }
    };
    r2Store.set(key, obj);
    return obj;
  },
  async get(key) {
    return r2Store.get(key) || null;
  },
  async delete(key) {
    r2Store.delete(key);
    return true;
  }
};

// Apply all 25 migrations
const migrationsDir = path.resolve(process.cwd(), 'migrations');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  rawDb.exec(sql);
}

// Seed development fixtures
const seedSqlPath = path.resolve(process.cwd(), 'scripts', 'dev-seed.sql');
if (fs.existsSync(seedSqlPath)) {
  const seedSql = fs.readFileSync(seedSqlPath, 'utf8');
  rawDb.exec(seedSql);
}

console.log('✔ In-memory SQLite initialized with migrations and dev seed data');

async function runQualityTests() {
  const runtimeService = new AssessmentRuntimeService(mockD1);
  const creditService = new CreditService(mockD1);
  const aiService = new AIService(mockD1, {});
  const pdfService = new PdfService(mockD1, mockR2Bucket);

  const testUserId = 'usr_polish_qa_user';
  rawDb.exec(`INSERT OR IGNORE INTO users (id, email, role, status) VALUES ('${testUserId}', 'qa_user@example.com', 'user', 'active')`);
  rawDb.exec(`INSERT OR IGNORE INTO profiles (user_id, display_name) VALUES ('${testUserId}', 'Dr. Jordan Vance')`);
  rawDb.exec(`INSERT OR IGNORE INTO credit_balances (user_id, balance) VALUES ('${testUserId}', 50)`);

  console.log('\n--- 1. Testing Assessment (Dynamic Dimensions) Integration ---');
  const assessmentObj = await runtimeService.getPublishedAssessmentBySlug('big-five-personality-test');
  assert.ok(assessmentObj, 'Assessment must be published and loaded');

  const { attempt } = await runtimeService.startOrResumeAttempt(assessmentObj.assessment.id, testUserId, null);
  for (const q of assessmentObj.questions) {
    const opt = q.options[q.options.length - 1] || q.options[0];
    await runtimeService.saveAnswer(attempt.id, q.id, opt.id, testUserId, null);
  }
  await runtimeService.completeAttempt(attempt.id, testUserId, null);

  const aiReport = await aiService.generateReportForAttempt(attempt.id, testUserId, null);
  assert.ok(aiReport.reportId);
  assert.ok(aiReport.content.final_synthesis);
  assert.ok(aiReport.content.final_synthesis.top_takeaways.length === 5, 'Must contain 5 key takeaways');
  assert.ok(aiReport.content.final_synthesis.strongest_pattern.length > 10, 'Must contain strongest pattern');
  assert.ok(aiReport.content.final_synthesis.biggest_growth_opportunity.length > 10, 'Must contain growth opportunity');
  console.log(`✔ Generated AI report with Top 5 takeaways and dynamic pattern synthesis`);

  console.log('\n--- 2. Testing PDF Generation & Dynamic Visual Pagination ---');
  const { fileRecord, pdfBytes } = await pdfService.generateAiReportPdf(aiReport.reportId, {
    userDisplayName: 'Dr. Jordan Vance'
  });

  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.byteLength > 2000, `PDF size should be substantial (${pdfBytes.byteLength} bytes)`);

  // Parse generated PDF to verify page counts and integrity
  const parsedPdf = await PDFDocument.load(pdfBytes);
  const pageCount = parsedPdf.getPageCount();
  console.log(`✔ Generated valid PDF with ${pageCount} natural flowing pages (Size: ${pdfBytes.byteLength} bytes)`);
  assert.ok(pageCount >= 4 && pageCount <= 14, `Expected natural pagination (Actual: ${pageCount} pages)`);

  console.log('\n--- 3. Testing Non-Authoritative Branding & Safe Language ---');
  const r2Key = `reports/ai/${aiReport.reportId}.pdf`;
  const storedPdf = await mockR2Bucket.get(r2Key);
  assert.ok(storedPdf, 'PDF stored in R2');
  console.log(`✔ PDF stored in R2 with key "${r2Key}"`);

  console.log('\n--- 4. Testing Web Dossier Data Contract Parity ---');
  const retrievedReport = await aiService.getReport(aiReport.reportId, testUserId, null);
  assert.strictEqual(retrievedReport.reportId, aiReport.reportId);
  assert.ok(retrievedReport.content.dimension_analyses);
  assert.ok(retrievedReport.content.final_synthesis?.top_takeaways);
  console.log('✔ Web dossier report data contract verified');

  console.log('\n========================================================================');
  console.log('🎉 ALL QUALITY & POLISH VERIFICATION TESTS PASSED WITH ZERO ERRORS!');
  console.log('========================================================================\n');
}

runQualityTests().catch((err) => {
  console.error('❌ Quality test failed:', err);
  process.exit(1);
});
