import { spawn } from 'child_process';

function putSecret(name, value) {
  return new Promise((resolve, reject) => {
    console.log(`Setting secret: ${name}...`);
    const child = spawn('npx', ['wrangler', 'secret', 'put', name], {
      shell: true,
      stdio: ['pipe', 'inherit', 'inherit']
    });

    child.stdin.write(value.trim() + '\n');
    child.stdin.end();

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Secret ${name} set successfully!`);
        resolve();
      } else {
        reject(new Error(`Failed to set secret ${name}, exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';

  if (clientId === 'YOUR_GOOGLE_CLIENT_ID' || clientSecret === 'YOUR_GOOGLE_CLIENT_SECRET') {
    console.log('Please provide GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET via environment variables.');
    return;
  }

  await putSecret('GOOGLE_CLIENT_ID', clientId);
  await putSecret('GOOGLE_CLIENT_SECRET', clientSecret);
  console.log('🎉 All Google OAuth secrets configured on Cloudflare!');
}

main().catch(console.error);
