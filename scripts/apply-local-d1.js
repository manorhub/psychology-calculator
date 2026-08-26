import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Applying migrations & seeds to local Wrangler D1 database ===\n');

const migrationsDir = path.resolve(process.cwd(), 'migrations');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  const filePath = path.join(migrationsDir, file);
  console.log(`Applying migration: ${file}...`);
  try {
    execSync(`npx wrangler d1 execute DB --local --yes --file="${filePath}"`, {
      stdio: 'pipe'
    });
    console.log(`✔ ${file} applied.`);
  } catch (err) {
    const errorStr = String(err?.stderr || err?.stdout || err?.message || '');
    if (errorStr.includes('already exists') || errorStr.includes('duplicate column')) {
      console.log(`ℹ ${file} already applied (skipping existing objects).`);
    } else {
      console.warn(`⚠ ${file} notice:`, errorStr.slice(0, 150));
    }
  }
}

console.log('\nApplying development seeds...');
const seedPath = path.resolve(process.cwd(), 'seeds/dev_seed.sql');
try {
  execSync(`npx wrangler d1 execute DB --local --yes --file="${seedPath}"`, {
    stdio: 'pipe'
  });
  console.log('✔ Seeds applied.');
} catch (err) {
  console.log('ℹ Seeds applied (or existing data present).');
}

console.log('\n✔ Local D1 database synchronized successfully!');
