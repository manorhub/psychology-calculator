import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { getSecurityHeaders, sanitizeString, validatePasswordStrength, RateLimiter } from '../src/lib/security.ts';
import { SettingsService } from '../src/services/settings/settings.service.ts';
import { FeatureService } from '../src/services/features/feature.service.ts';
import { SystemHealthService } from '../src/services/system/system-health.service.ts';
import { ErrorMonitoringService } from '../src/services/system/error-monitoring.service.ts';
import { AssessmentEngineService } from '../src/services/assessment-engine.service.ts';
import { ScoringEngineService } from '../src/services/scoring-engine.service.ts';
import { ResultService } from '../src/services/result.service.ts';
import { AiEngineService } from '../src/services/ai/ai-engine.service.ts';
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
    '0019_admin_control_center_and_global_settings.sql',
    '0020_production_hardening_and_indexes.sql'
  ];

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
  const healthService = new SystemHealthService(mockD1, mockR2, {
    APP_ENV: 'production',
    SMTP_HOST: 'smtp.sendgrid.net',
    GEMINI_API_KEY: 'test-key'
  });
  const health = await healthService.runAllChecks();
  assert.ok(health.status === 'HEALTHY' || health.status === 'DEGRADED');
  assert.strictEqual(health.checks.d1.status, 'connected');
  assert.strictEqual(health.checks.r2.status, 'connected');
  // Check that no secret credentials appear in the health diagnostic response
  const healthJson = JSON.stringify(health);
  assert.ok(!healthJson.includes('test-key'), 'Secrets must never leak in health diagnostic outputs');
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
  assert.ok(indexNames.includes('idx_results_share_token'));
  assert.ok(indexNames.includes('idx_user_subscriptions_user_status'));
  console.log(`✔ Verified ${indexes.length} production database query optimization indexes`);

  console.log('\n--- 8. Testing End-to-End User Launch Journey Simulation ---');
  // A. Create User & Attempt
  const userId = 'usr_launch_tester';
  rawDb.prepare("INSERT INTO users (id, email, password_hash, status, role) VALUES (?, 'launch@example.com', 'hash', 'active', 'user')").run(userId);
  rawDb.prepare("INSERT INTO user_profiles (id, user_id, full_name) VALUES ('prof_launch', ?, 'Launch Tester')").run(userId);
  rawDb.prepare("INSERT INTO user_credit_wallets (id, user_id, balance) VALUES ('wal_launch', ?, 10)").run(userId);

  const asmEngine = new AssessmentEngineService(mockD1);
  const scoringEngine = new ScoringEngineService(mockD1);
  const resultService = new ResultService(mockD1);
  const aiEngine = new AiEngineService(mockD1);
  const pdfService = new PdfService(mockD1, mockR2);

  // Take Big Five assessment
  const attempt = await asmEngine.startAttempt('asm_big_five', { userId });
  assert.ok(attempt.id);

  // Submit answer
  await asmEngine.saveAnswer({
    attemptId: attempt.id,
    questionId: 'q_bf_1',
    optionId: 'opt_bf_1_5',
    userId
  });

  // Complete attempt
  const scoreResult = await scoringEngine.scoreAttempt(attempt.id, userId);
  assert.strictEqual(scoreResult.status, 'completed');

  // Generate result snapshot
  const resultSnapshot = await resultService.getOrCreateResultSnapshot(attempt.id, userId);
  assert.ok(resultSnapshot.archetype);

  // Generate AI narrative report
  const aiReport = await aiEngine.generateReport(attempt.id, userId);
  assert.ok(aiReport.id);
  assert.ok(aiReport.summary);

  // Generate PDF report
  const pdfResult = await pdfService.generateResultPdf(attempt.id, userId);
  assert.ok(pdfResult.fileId);
  assert.strictEqual(pdfResult.mimeType, 'application/pdf');

  console.log('✔ Complete User Journey (Assessment -> Scoring -> Result -> AI Report -> PDF) verified');

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE 17 PRODUCTION LAUNCH & HARDENING TESTS PASSED!');
  console.log('============================================================\n');
}

runTests().catch((err) => {
  console.error('Launch test suite failed:', err);
  process.exit(1);
});
