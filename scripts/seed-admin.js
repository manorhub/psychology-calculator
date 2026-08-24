import { hashPassword } from '../src/lib/crypto.ts';

async function main() {
  const password = process.argv[2] || 'Admin@123456';
  const email = process.argv[3] || 'admin@psychologycalculator.com';
  const hash = await hashPassword(password);
  console.log(`Generated PBKDF2 hash for ${email} (${password}):\n${hash}\n`);

  const sql = `INSERT OR REPLACE INTO users (id, email, password_hash, role, status, email_verified_at, created_at, updated_at)
VALUES ('admin_master_1', '${email}', '${hash}', 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO profiles (user_id, display_name, timezone, locale, created_at, updated_at)
VALUES ('admin_master_1', 'Super Admin', 'UTC', 'en', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO credit_balances (user_id, balance, updated_at)
VALUES ('admin_master_1', 9999, CURRENT_TIMESTAMP);
`;

  console.log('SQL to execute:\n' + sql);
}

main().catch(console.error);
