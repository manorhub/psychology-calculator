import { hashPassword } from '../src/lib/crypto.ts';
import { execSync } from 'node:child_process';

async function seedAdmin() {
  const email = 'admin@psychologycalculator.com';
  const password = 'Admin@123456';
  const passwordHash = await hashPassword(password);
  const userId = 'usr_admin_master';

  const sql = `
    INSERT INTO users (id, email, password_hash, auth_provider, role, status, created_at, updated_at)
    VALUES ('${userId}', '${email}', '${passwordHash}', 'email', 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(email) DO UPDATE SET
      password_hash = '${passwordHash}',
      role = 'admin',
      status = 'active';

    INSERT INTO profiles (user_id, display_name, created_at, updated_at)
    VALUES ('${userId}', 'System Administrator', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET display_name = 'System Administrator';
  `;

  console.log('Seeding admin user into local D1 database...');
  execSync(`npx wrangler d1 execute DB --local --yes --command="${sql.replace(/\n/g, ' ')}"`, {
    stdio: 'inherit'
  });

  console.log('\nAdmin credentials configured successfully:');
  console.log('Email:', email);
  console.log('Password:', password);
}

seedAdmin().catch(console.error);
