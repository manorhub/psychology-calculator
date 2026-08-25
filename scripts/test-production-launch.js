import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { getSecurityHeaders, sanitizeString, validatePasswordStrength, RateLimiter } from '../src/lib/security.ts';
import { SettingsService } from '../src/services/settings/settings.service.ts';
import { SystemHealthService } from '../src/services/system/system-health.service.ts';
import { ErrorMonitoringService } from '../src/services/system/error-monitoring.service.ts';
import { AssessmentRuntimeService } from '../src/services/assessment-runtime.service.ts';
import { AIService } from '../src/services/ai/ai.service.ts';
import { PdfService } from '../src/services/pdf/pdf.service.ts';

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

function createMockR2() {
  const store = new Map();
  return {
    async put(key, value, options) {
      store.set(key, { value, options, uploaded: new Date() });
      return { key, size: value.byteLength || value.length || 0, etag: 'mock-etag' };
    },
    async get(key) {
      const item = store.get(key);
      if (!item) return null;
      return {
        key,
        size: item.value.byteLength || item.value.length || 0,
        arrayBuffer: async () => item.value,
        httpMetadata: item.options?.httpMetadata || {}
      };
    },
    async delete(key) {
      store.delete(key);
    },
    async head(key) {
      const item = store.get(key);
      if (!item) return null;
      return { key, size: item.value.byteLength || item.value.length || 0 };
    }
  };
}

async function runTests() {
  console.log('\n=== Psychology Calculator Phase 17: Production Launch & Hardening Test Suite ===\n');

  // 1. Initialize SQLite Database & Apply all 20 Migrations
  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec('PRAGMA foreign_keys = ON;');

  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf8');
      rawDb.exec(sql);
    }
  }

  const devSeedPath = path.resolve(process.cwd(), 'seeds/dev_seed.sql');
  if (fs.existsSync(devSeedPath)) {
    rawDb.exec(fs.readFileSync(devSeedPath, 'utf8'));
  }

  const mockD1 = createMockD1(rawDb);
  const mockR2 = createMockR2();

  console.log('--- 1. Testing Production Security Headers & XSS Protections ---');
  const headers = getSecurityHeaders();
  assert.strictEqual(headers['X-Content-Type-Options'], 'nosniff');
  assert.strictEqual(headers['X-Frame-Options'], 'DENY');
  assert.ok(headers['Strict-Transport-Security'].includes('max-age=31536000'));
  assert.ok(headers['Content-Security-Policy'].includes("default-src 'self'"));
  
  const sanitized = sanitizeString('<script>alert("xss")</script>');
  assert.ok(!sanitized.includes('<script>'), 'HTML tags should be entity-escaped');
  
  const strongPass = validatePasswordStrength('SecureP@ssw0rd123');
  assert.strictEqual(strongPass.isValid, true);
  const weakPass = validatePasswordStrength('weak');
  assert.strictEqual(weakPass.isValid, false);
  console.log('✔ Security headers, CSP policy, and input sanitizers verified');

  console.log('\n--- 2. Testing Public /api/health Operational Status & Diagnostics ---');
  const healthService = new SystemHealthService(mockD1);
  const health = await healthService.getOverallHealth(mockR2);
  assert.ok(health.status === 'healthy' || health.status === 'degraded');
  assert.strictEqual(health.checks.length, 5);
  // Check that no secret credentials appear in the health diagnostic response
  const healthJson = JSON.stringify(health);
  assert.ok(!healthJson.includes('secret') && !healthJson.includes('password'), 'Secrets must never leak in health diagnostic outputs');
  console.log('✔ Operational health endpoint returns clean, credential-safe subsystem status');

  console.log('\n--- 3. Testing Strict Secret Isolation Audit Across DAL & Payloads ---');
  const settingsService = new SettingsService(mockD1);
  
  // Set real secrets
  await settingsService.set('smtp_password', 'super-secret-smtp-password-999');
  await settingsService.set('lemon_squeezy_api_key', 'ls-secret-api-key-888');

  // A. Public settings payload must NEVER contain secret keys
  const publicSettings = await settingsService.getPublicSettings();
  assert.strictEqual(publicSettings.smtp_password, undefined);
  assert.strictEqual(publicSettings.lemon_squeezy_api_key, undefined);

  // B. Masked UI group retrieval
  const emailSettings = await settingsService.getGroup('email');
  assert.strictEqual(emailSettings.smtp_password, '••••••••');

  // C. Sanitized JSON export
  const exportPayload = await settingsService.exportSanitizedConfig();
  assert.strictEqual(exportPayload.settings.smtp_password, undefined);
  assert.strictEqual(exportPayload.settings.lemon_squeezy_api_key, undefined);
  console.log('✔ Secret isolation audit passed: 0% secret leakage across public APIs and backups');

  console.log('\n--- 4. Testing Rate Limiting & Anti-Brute Force Protection ---');
  const rateLimiter = new RateLimiter(mockD1);
  const ip = '192.168.1.50';
  
  // 5 allowed attempts
  for (let i = 1; i <= 5; i++) {
    const res = await rateLimiter.checkLimit(ip, 'auth_login', 5, 60);
    assert.strictEqual(res.allowed, true, `Attempt ${i} should be allowed`);
  }
  
  // 6th attempt should be blocked
  const blockedRes = await rateLimiter.checkLimit(ip, 'auth_login', 5, 60);
  assert.strictEqual(blockedRes.allowed, false, '6th attempt must be rate-limited');
  assert.strictEqual(blockedRes.remaining, 0);

  // Reset limit
  await rateLimiter.resetLimit(ip, 'auth_login');
  const resetRes = await rateLimiter.checkLimit(ip, 'auth_login', 5, 60);
  assert.strictEqual(resetRes.allowed, true, 'Limit should be cleared after reset');
  console.log('✔ Rate limiting correctly enforces attempt quotas and blocks brute-force abuse');

  console.log('\n--- 5. Testing Centralized Error Telemetry & Safe User Messages ---');
  const errorService = new ErrorMonitoringService(mockD1);
  
  // Capture error with sensitive context
  const errorId = await errorService.captureError({
    service: 'AiEngineService',
    errorType: 'AI_FAILURE',
    error: new Error('Upstream model timeout: key=ai_secret_token_12345'),
    context: {
      userId: 'usr_launch_test',
      apiKey: 'sk-prod-secret-999',
      rawPassword: 'user-raw-password',
      model: 'gemini-1.5-flash'
    },
    path: '/api/v1/ai/generate'
  });

  assert.ok(errorId, 'Error ID should be returned');

  // Verify recorded error log has masked context
  const errorLogs = await errorService.getRecentErrors(10, 'AiEngineService');
  assert.ok(errorLogs.length >= 1);
  const logged = errorLogs[0];
  assert.strictEqual(logged.service, 'AiEngineService');
  assert.strictEqual(logged.error_type, 'AI_FAILURE');
  
  const parsedContext = JSON.parse(logged.context);
  assert.strictEqual(parsedContext.apiKey, '••••••••');
  assert.strictEqual(parsedContext.rawPassword, '••••••••');
  assert.strictEqual(parsedContext.model, 'gemini-1.5-flash');

  // Verify user-friendly error message
  const safeMsg = ErrorMonitoringService.getSafeErrorMessage('AI_FAILURE');
  assert.ok(!safeMsg.includes('timeout') && !safeMsg.includes('secret'));
  console.log('✔ Centralized error telemetry safely redacts secrets and provides user-friendly notices');

  console.log('\n--- 6. Testing Full System Configuration Backup & Recovery ---');
  const fullBackup = await settingsService.exportFullSystemBackup();
  assert.strictEqual(fullBackup.backupType, 'FULL_SYSTEM');
  assert.ok(fullBackup.entities.assessments.length >= 8);
  assert.ok(fullBackup.entities.categories.length >= 6);
  assert.ok(fullBackup.entities.faqs.length >= 4);
  assert.ok(fullBackup.entities.prompts.length >= 1);
  assert.ok(fullBackup.entities.plans.length >= 3);
  console.log(`✔ Full system backup generated: ${fullBackup.entities.assessments.length} assessments, ${fullBackup.entities.plans.length} plans, ${fullBackup.entities.faqs.length} FAQs`);

  console.log('\n--- 7. Testing Database Performance Indexes Verification ---');
  const indexes = rawDb.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'").all();
  assert.ok(indexes.length >= 15, `Expected at least 15 performance indexes, found ${indexes.length}`);
  const indexNames = indexes.map((i) => i.name);
  assert.ok(indexNames.includes('idx_system_error_logs_service_created'));
  assert.ok(indexNames.includes('idx_users_status_created'));
  assert.ok(indexNames.includes('idx_assessment_attempts_user_status'));
  assert.ok(indexNames.includes('idx_result_snapshots_share_token'));
  assert.ok(indexNames.includes('idx_subscriptions_user_status'));
  console.log(`✔ Verified ${indexes.length} production database query optimization indexes`);

  console.log('\n--- 8. Testing End-to-End User Launch Journey Simulation ---');
  // A. Create User & Attempt
  const userId = 'usr_launch_tester';
  rawDb.prepare("INSERT INTO users (id, email, password_hash, status, role) VALUES (?, 'launch@example.com', 'hash', 'active', 'user')").run(userId);
  rawDb.prepare("INSERT INTO profiles (user_id, display_name) VALUES (?, 'Launch Tester')").run(userId);
  rawDb.prepare("INSERT INTO credit_balances (user_id, balance) VALUES (?, 10)").run(userId);

  const asmEngine = new AssessmentRuntimeService(mockD1);
  const aiService = new AIService(mockD1, {});
  const pdfService = new PdfService(mockD1, mockR2);

  // Take Big Five assessment
  const runtimeAsm = await asmEngine.getPublishedAssessmentBySlug('big-five-personality-test');
  assert.ok(runtimeAsm);
  const { attempt } = await asmEngine.startOrResumeAttempt(runtimeAsm.assessment.id, userId, 'session_launch_123');
  assert.ok(attempt.id);

  // Submit answers
  for (const q of runtimeAsm.questions) {
    const opt = q.options[0];
    await asmEngine.saveAnswer(attempt.id, q.id, opt.id, userId, 'session_launch_123');
  }

  // Complete attempt
  const completedAttempt = await asmEngine.completeAttempt(attempt.id, userId, 'session_launch_123');
  assert.ok(completedAttempt);

  // Generate AI narrative report
  const aiReport = await aiService.generateReportForAttempt(attempt.id, userId, null);
  assert.ok(aiReport.reportId);
  assert.ok(aiReport.content.summary);

  // Generate PDF report
  const pdfResult = await pdfService.generateResultPdf(attempt.id, userId);
  assert.ok(pdfResult.fileRecord.id);
  assert.strictEqual(pdfResult.fileRecord.mime_type, 'application/pdf');
  assert.ok(pdfResult.pdfBytes.byteLength > 0);

  console.log('✔ Complete User Journey (Assessment -> Scoring -> Result -> AI Report -> PDF) verified');

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE 17 PRODUCTION LAUNCH & HARDENING TESTS PASSED!');
  console.log('============================================================\n');
}

runTests().catch((err) => {
  console.error('Launch test suite failed:', err);
  process.exit(1);
});
