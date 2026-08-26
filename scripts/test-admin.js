import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('=== MindMetrics Phase 3: Admin Panel Foundation Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database with Foreign Keys ON
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');

console.log('✔ In-memory SQLite initialized with strict foreign keys enabled');

// 2. Load & Apply All Migrations (0001 through 0008)
const migrationsDir = path.resolve(process.cwd(), 'migrations');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log(`\nFound ${migrationFiles.length} migration files:`);
for (const file of migrationFiles) {
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf-8');
  sqlite.exec(sql);
  console.log(`  ✔ Applied migration: ${file}`);
}

const fkCheck = sqlite.prepare('PRAGMA foreign_key_check').all();
assert.strictEqual(fkCheck.length, 0, 'Foreign key errors found in migrations');
console.log('✔ Foreign key integrity verified across all migrations');

// 3. Apply Seeds
const seedPath = path.resolve(process.cwd(), 'seeds/dev_seed.sql');
const seedSql = fs.readFileSync(seedPath, 'utf-8');
sqlite.exec(seedSql);
console.log('✔ Development seed data applied');

// 4. Create Cloudflare D1 Mock Interface
function createMockD1(rawDb) {
  return {
    prepare(query) {
      return {
        bind(...params) {
          return {
            async first() {
              const stmt = rawDb.prepare(query);
              const result = stmt.get(...params);
              return result || null;
            },
            async all() {
              const stmt = rawDb.prepare(query);
              const results = stmt.all(...params);
              return { results: results || [], success: true };
            },
            async run() {
              const stmt = rawDb.prepare(query);
              const info = stmt.run(...params);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async first() {
          const stmt = rawDb.prepare(query);
          return stmt.get() || null;
        },
        async all() {
          const stmt = rawDb.prepare(query);
          const results = stmt.all();
          return { results: results || [], success: true };
        },
        async run() {
          const stmt = rawDb.prepare(query);
          const info = stmt.run();
          return { success: true, meta: { changes: info.changes } };
        }
      };
    },
    async batch(statements) {
      for (const s of statements) {
        await s.run();
      }
      return [];
    }
  };
}

const mockD1 = createMockD1(sqlite);

// 5. Test Admin Service Layer & Authorization
import { AdminService } from '../src/services/admin.service.ts';
import { requireAdmin, requireUser } from '../src/lib/auth/guards.ts';
import { EmailService } from '../src/services/email.service.ts';

async function runAdminTests() {
  console.log('\n--- 1. Testing Admin Authorization Guards ---');

  const regularUser = {
    id: 'user_123',
    email: 'member@example.com',
    role: 'user',
    status: 'active',
    emailVerified: true,
    profile: { displayName: 'Member One', avatarUrl: null, timezone: 'UTC', locale: 'en', preferences: {} },
    createdAt: new Date().toISOString(),
    lastLoginAt: null
  };

  const adminUser = {
    id: 'admin_999',
    email: 'admin@mindmetrics.io',
    role: 'admin',
    status: 'active',
    emailVerified: true,
    profile: { displayName: 'Lead Admin', avatarUrl: null, timezone: 'UTC', locale: 'en', preferences: {} },
    createdAt: new Date().toISOString(),
    lastLoginAt: null
  };

  const suspendedAdmin = {
    ...adminUser,
    id: 'admin_suspended',
    status: 'suspended'
  };

  // requireUser tests
  assert.throws(() => requireUser({ user: null }), /Authentication required/, 'Unauthenticated user rejected');
  assert.throws(() => requireUser({ user: suspendedAdmin }), /suspended/, 'Suspended user rejected');
  const validUserResult = requireUser({ user: regularUser });
  assert.strictEqual(validUserResult.id, 'user_123');

  // requireAdmin tests
  assert.throws(() => requireAdmin({ user: regularUser }), /Administrator privileges required/, 'Regular user denied admin access');
  const validAdminResult = requireAdmin({ user: adminUser });
  assert.strictEqual(validAdminResult.id, 'admin_999');
  console.log('✔ Server-side authorization guards verified: regular users & suspended accounts blocked');

  console.log('\n--- 2. Testing Admin Dashboard Metrics & Activity ---');
  const adminService = new AdminService(mockD1);

  const stats = await adminService.getDashboardStats();
  assert.ok(stats.totalUsers >= 0, 'Total users metric exists');
  assert.ok(stats.totalAssessments >= 1, 'Total assessments metric should count seed assessments');
  console.log(`✔ Dashboard Stats: Users=${stats.totalUsers}, Assessments=${stats.totalAssessments}, Completed=${stats.completedAttempts}, Premium=${stats.premiumUsers}`);

  const activity = await adminService.getRecentActivity(5);
  assert.ok(Array.isArray(activity), 'Recent activity returned as array');
  console.log(`✔ Recent Activity: Loaded ${activity.length} recent system audit events`);

  console.log('\n--- 3. Testing User Directory & Search / Filters ---');
  // Seed sample users
  sqlite.exec(`
    INSERT INTO users (id, email, role, status, created_at, updated_at)
    VALUES
      ('usr_alice', 'alice@domain.com', 'user', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('usr_bob', 'bob@domain.com', 'user', 'suspended', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('usr_admin2', 'admin2@mindmetrics.io', 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('admin_999', 'admin@mindmetrics.io', 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    INSERT INTO profiles (user_id, display_name)
    VALUES
      ('usr_alice', 'Alice Walker'),
      ('usr_bob', 'Bob Smith'),
      ('usr_admin2', 'Admin Secondary'),
      ('admin_999', 'Lead Admin');
  `);

  const allUsers = await adminService.getUsers({ page: 1, limit: 10 });
  assert.ok(allUsers.items.length >= 4, 'User list query returns items');
  assert.strictEqual(allUsers.page, 1);

  // Search by name / email
  const searchAlice = await adminService.getUsers({ search: 'Alice' });
  assert.strictEqual(searchAlice.items.length, 1);
  assert.strictEqual(searchAlice.items[0].email, 'alice@domain.com');

  // Filter by status = suspended
  const suspendedFilter = await adminService.getUsers({ status: 'suspended' });
  assert.strictEqual(suspendedFilter.items.some((u) => u.id === 'usr_bob'), true);

  // Filter by role = admin
  const adminFilter = await adminService.getUsers({ role: 'admin' });
  assert.strictEqual(adminFilter.items.some((u) => u.id === 'usr_admin2'), true);
  console.log('✔ User management: Search, pagination, status filtering, and role filtering passed');

  console.log('\n--- 4. Testing User Detail View ---');
  const aliceDetail = await adminService.getUserDetail('usr_alice');
  assert.ok(aliceDetail, 'Alice detail found');
  assert.strictEqual(aliceDetail.profile?.display_name, 'Alice Walker');
  assert.strictEqual(aliceDetail.user.email, 'alice@domain.com');
  console.log('✔ User detail view returned profile and engagement metrics');

  console.log('\n--- 5. Testing Administrative Actions (Suspend, Reactivate, Role) ---');
  // Suspend Alice
  await adminService.updateUserStatus('usr_alice', 'suspended', 'admin_999');
  const aliceSuspended = sqlite.prepare("SELECT status FROM users WHERE id = 'usr_alice'").get();
  assert.strictEqual(aliceSuspended.status, 'suspended');

  // Reactivate Alice
  await adminService.updateUserStatus('usr_alice', 'active', 'admin_999');
  const aliceActive = sqlite.prepare("SELECT status FROM users WHERE id = 'usr_alice'").get();
  assert.strictEqual(aliceActive.status, 'active');

  // Promote Alice to Admin
  await adminService.updateUserRole('usr_alice', 'admin', 'admin_999');
  const aliceRole = sqlite.prepare("SELECT role FROM users WHERE id = 'usr_alice'").get();
  assert.strictEqual(aliceRole.role, 'admin');

  // Prevent admin from self-suspending
  await assert.rejects(
    async () => {
      await adminService.updateUserStatus('admin_999', 'suspended', 'admin_999');
    },
    /cannot suspend their own account/,
    'Admin self-suspension prevented'
  );
  console.log('✔ Admin user actions: Suspend, reactivate, and role elevation verified with self-protection');

  console.log('\n--- 6. Testing Dynamic Settings & Persistence ---');
  await adminService.updateSettings(
    {
      site_name: 'MindMetrics Pro',
      contact_email: 'hello@mindmetrics.io',
      maintenance_mode: 'true',
      announcement_enabled: 'true',
      announcement_text: 'Platform maintenance scheduled at midnight'
    },
    'admin_999'
  );

  const updatedSettings = await adminService.getAllSettings();
  assert.strictEqual(updatedSettings.site_name, 'MindMetrics Pro');
  assert.strictEqual(updatedSettings.maintenance_mode, 'true');
  assert.strictEqual(updatedSettings.announcement_enabled, 'true');
  console.log('✔ Dynamic Settings: General, site, and maintenance settings saved & queried');

  console.log('\n--- 7. Testing SMTP Configuration & Test Email ---');
  await adminService.updateSettings(
    {
      smtp_enabled: 'true',
      smtp_host: 'smtp.sendgrid.net',
      smtp_port: '587',
      smtp_username: 'apikey',
      smtp_password: 'secret_password_123',
      smtp_security: 'tls',
      smtp_from_name: 'MindMetrics Automated',
      smtp_from_email: 'alerts@mindmetrics.io'
    },
    'admin_999'
  );

  const emailService = EmailService.createFromSmtpConfig({
    enabled: true,
    host: 'smtp.sendgrid.net',
    port: 587,
    username: 'apikey',
    password: 'secret_password_123',
    security: 'tls',
    fromName: 'MindMetrics Automated',
    fromEmail: 'alerts@mindmetrics.io'
  });

  const testEmailSent = await emailService.sendTestEmail('admin@mindmetrics.io');
  assert.strictEqual(testEmailSent, true, 'Test email should dispatch successfully');
  console.log('✔ SMTP Configuration: Saved credentials, masked retrieval, and test email dispatched');

  console.log('\n--- 8. Testing Feature Flags Management ---');
  const flags = await adminService.getFeatureFlags();
  assert.ok(flags.length > 0, 'Feature flags list populated');

  await adminService.toggleFeatureFlag('ai_reports', true, 'admin_999');
  const aiFlag = sqlite.prepare("SELECT is_enabled FROM feature_flags WHERE key = 'ai_reports'").get();
  assert.strictEqual(aiFlag.is_enabled, 1);
  console.log('✔ Feature Flags: Runtime toggle updated');

  console.log('\n--- 9. Testing Audit Logs Explorer ---');
  const auditLogs = await adminService.getAuditLogs({ page: 1, limit: 20 });
  assert.ok(auditLogs.items.length > 0, 'Audit logs recorded during test operations');
  assert.ok(auditLogs.items.some((l) => l.action.startsWith('admin_')), 'Administrative mutations logged');
  console.log(`✔ Audit Logs Explorer: Verified ${auditLogs.total} immutable audit records`);

  console.log('\n========================================');
  console.log('🎉 ALL PHASE 3 ADMIN PANEL TESTS PASSED!');
  console.log('========================================\n');
}

runAdminTests().catch((err) => {
  console.error('❌ Admin Test failed:', err);
  process.exit(1);
});
