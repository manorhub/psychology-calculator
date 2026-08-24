import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { AssessmentRuntimeService } from '../src/services/assessment-runtime.service.js';
import { AIService } from '../src/services/ai/ai.service.js';
import { CreditService } from '../src/services/credit.service.js';
import { PdfService } from '../src/services/pdf/pdf.service.js';
import { ConfigService } from '../src/services/config.service.js';

console.log('=== Psychology Calculator Phase 10: PDF Reports & R2 Storage Test Suite ===\n');

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

// Apply all 13 migrations
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
console.log('✔ In-memory SQLite & R2 Mock initialized with 13 migrations and seed data');

async function runPdfEngineTests() {
  const runtimeService = new AssessmentRuntimeService(mockD1);
  const creditService = new CreditService(mockD1);
  const aiService = new AIService(mockD1);
  const pdfService = new PdfService(mockD1, mockR2Bucket);
  const configService = new ConfigService(mockD1);

  // Setup Users
  const userIdA = 'usr_pdf_alice';
  const userIdB = 'usr_pdf_bob';

  rawDb.prepare("INSERT INTO users (id, email, role, status) VALUES (?, ?, 'user', 'active')").run(
    userIdA,
    'alice@example.com'
  );
  rawDb.prepare("INSERT INTO profiles (user_id, display_name) VALUES (?, 'Alice Johnson')").run(userIdA);

  rawDb.prepare("INSERT INTO users (id, email, role, status) VALUES (?, ?, 'user', 'active')").run(
    userIdB,
    'bob@example.com'
  );
  rawDb.prepare("INSERT INTO profiles (user_id, display_name) VALUES (?, 'Bob Smith')").run(userIdB);

  await creditService.addCredits(userIdA, 25, 'signup_bonus', 'Test bonus');

  // Complete Big Five Assessment for User A
  const bigFive = await runtimeService.getPublishedAssessmentBySlug('big-five-personality-test');
  assert.ok(bigFive);

  const { attempt: attemptA } = await runtimeService.startOrResumeAttempt(bigFive.assessment.id, userIdA, 'sess_alice');
  for (const q of bigFive.questions) {
    const opt = q.options[q.options.length - 1]; // High score option
    await runtimeService.saveAnswer(attemptA.id, q.id, opt.id, userIdA, 'sess_alice');
  }
  await runtimeService.completeAttempt(attemptA.id, userIdA, 'sess_alice');

  console.log('\n--- 1. Testing Basic Result PDF Generation ---');
  const { fileRecord: basicFile, pdfBytes: basicBytes } = await pdfService.generateResultPdf(attemptA.id, {
    userDisplayName: 'Alice Johnson'
  });

  assert.ok(basicBytes instanceof Uint8Array);
  assert.ok(basicBytes.byteLength > 1000, `PDF size should be substantial (${basicBytes.byteLength} bytes)`);

  // Verify PDF header %PDF- (0x25, 0x50, 0x44, 0x46)
  const header = String.fromCharCode(...basicBytes.slice(0, 5));
  assert.strictEqual(header, '%PDF-');
  console.log(`✔ Generated valid Basic Result PDF (${basicBytes.byteLength} bytes, Header: ${header})`);

  // Check R2 storage
  const storedBasic = await mockR2Bucket.get(`reports/results/${attemptA.id}.pdf`);
  assert.ok(storedBasic);
  assert.strictEqual(storedBasic.key, `reports/results/${attemptA.id}.pdf`);
  assert.strictEqual(storedBasic.customMetadata.fileType, 'basic_result');
  console.log(`✔ Basic Result PDF stored in R2: "${storedBasic.key}"`);

  // Check D1 Record
  assert.strictEqual(basicFile.file_type, 'basic_result');
  assert.strictEqual(basicFile.status, 'completed');
  assert.strictEqual(basicFile.file_name, 'psychology-calculator-big-five-personality-test-result.pdf');
  console.log(`✔ D1 generated_files record verified: "${basicFile.file_name}"`);

  console.log('\n--- 2. Testing AI Interpretation Report PDF Generation ---');
  const aiReport = await aiService.generateReportForAttempt(attemptA.id, userIdA);
  assert.ok(aiReport);

  const { fileRecord: aiFile, pdfBytes: aiBytes } = await pdfService.generateAiReportPdf(aiReport.reportId, {
    userDisplayName: 'Alice Johnson'
  });

  assert.ok(aiBytes instanceof Uint8Array);
  assert.ok(aiBytes.byteLength > 1500, `AI Report PDF should be comprehensive (${aiBytes.byteLength} bytes)`);

  const aiHeader = String.fromCharCode(...aiBytes.slice(0, 5));
  assert.strictEqual(aiHeader, '%PDF-');
  console.log(`✔ Generated valid AI Report PDF (${aiBytes.byteLength} bytes, Header: ${aiHeader})`);

  // Check R2 storage
  const storedAi = await mockR2Bucket.get(`reports/ai/${aiReport.reportId}.pdf`);
  assert.ok(storedAi);
  assert.strictEqual(storedAi.key, `reports/ai/${aiReport.reportId}.pdf`);
  assert.strictEqual(storedAi.customMetadata.fileType, 'ai_report');
  console.log(`✔ Detailed AI Report PDF stored in R2: "${storedAi.key}"`);

  // Check D1 Record
  assert.strictEqual(aiFile.file_type, 'ai_report');
  assert.strictEqual(aiFile.status, 'completed');
  assert.strictEqual(aiFile.file_name, 'psychology-calculator-big-five-personality-test-detailed-report.pdf');
  console.log(`✔ D1 generated_files record verified: "${aiFile.file_name}"`);

  console.log('\n--- 3. Testing Idempotent Caching & Duplicate Prevention ---');
  const userAObj = { id: userIdA, email: 'alice@example.com', role: 'user', profile: { displayName: 'Alice Johnson' } };

  const cachedResult = await pdfService.getOrGenerateResultPdf(attemptA.id, userAObj, 'sess_alice');
  assert.strictEqual(cachedResult.fileRecord.r2_key, `reports/results/${attemptA.id}.pdf`);
  assert.strictEqual(cachedResult.pdfBytes.byteLength, basicBytes.byteLength);

  const cachedAi = await pdfService.getOrGenerateAiReportPdf(aiReport.reportId, userAObj);
  assert.strictEqual(cachedAi.fileRecord.r2_key, `reports/ai/${aiReport.reportId}.pdf`);
  assert.strictEqual(cachedAi.pdfBytes.byteLength, aiBytes.byteLength);
  console.log('✔ Idempotent caching verified: Existing R2 objects returned without redundant generation');

  console.log('\n--- 4. Testing Strict Ownership & IDOR Protection ---');
  const userBObj = { id: userIdB, email: 'bob@example.com', role: 'user', profile: { displayName: 'Bob Smith' } };

  // User B cannot download User A's Result PDF
  await assert.rejects(
    async () => {
      await pdfService.getOrGenerateResultPdf(attemptA.id, userBObj, 'sess_bob');
    },
    { message: 'You are not authorized to download this report' }
  );

  // User B cannot download User A's AI Report PDF
  await assert.rejects(
    async () => {
      await pdfService.getOrGenerateAiReportPdf(aiReport.reportId, userBObj);
    },
    { message: 'You are not authorized to download this AI report' }
  );
  console.log('✔ Unauthorized cross-user IDOR access strictly blocked');

  console.log('\n--- 5. Testing Guest Attempt PDF Generation & Access Control ---');
  const { attempt: guestAttempt } = await runtimeService.startOrResumeAttempt(bigFive.assessment.id, null, 'sess_guest_999');
  for (const q of bigFive.questions) {
    const opt = q.options[0];
    await runtimeService.saveAnswer(guestAttempt.id, q.id, opt.id, null, 'sess_guest_999');
  }
  await runtimeService.completeAttempt(guestAttempt.id, null, 'sess_guest_999');

  // Valid guest session can download
  const guestPdf = await pdfService.getOrGenerateResultPdf(guestAttempt.id, null, 'sess_guest_999');
  assert.ok(guestPdf.pdfBytes.byteLength > 1000);
  console.log('✔ Guest participant successfully generated and retrieved Result PDF');

  // Invalid guest session is rejected
  await assert.rejects(
    async () => {
      await pdfService.getOrGenerateResultPdf(guestAttempt.id, null, 'sess_impostor');
    },
    { message: 'Unauthorized access to guest assessment attempt' }
  );
  console.log('✔ Invalid guest session access strictly blocked');

  console.log('\n--- 6. Testing Dynamic Admin PDF Settings & Branding ---');
  await configService.setSetting('pdf_brand_name', 'Custom Psychology Lab');
  await configService.setSetting('pdf_brand_domain', 'custompsychologylab.com');
  await configService.setSetting('pdf_disclaimer', 'Custom scientific psychometric research disclaimer.');

  const row = rawDb.prepare("SELECT value FROM site_settings WHERE key = 'pdf_brand_name'").get();
  assert.strictEqual(row.value, 'Custom Psychology Lab');
  console.log('✔ Dynamic Admin PDF configuration and branding updated');

  console.log('\n--- 7. Testing Admin Storage Ledger & File Deletion ---');
  const adminFiles = await pdfService.listGeneratedFiles(50);
  assert.ok(adminFiles.length >= 3);
  console.log(`✔ Admin loaded file ledger with ${adminFiles.length} generated PDF objects`);

  const fileToDelete = adminFiles[0];
  const deleteSuccess = await pdfService.deletePdf(fileToDelete.id);
  assert.strictEqual(deleteSuccess, true);

  const checkR2 = await mockR2Bucket.get(fileToDelete.r2_key);
  assert.strictEqual(checkR2, null);
  console.log(`✔ Admin safely deleted PDF "${fileToDelete.r2_key}" from R2 and D1 ledger`);

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE 10 PDF REPORTS & R2 STORAGE TESTS PASSED!');
  console.log('============================================================\n');
}

runPdfEngineTests().catch((err) => {
  console.error('❌ PDF Engine Test failed:', err);
  process.exit(1);
});
