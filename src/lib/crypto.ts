/**
 * Cloudflare Workers Compatible Cryptography Utilities
 * Uses standard Web Crypto API (crypto.subtle)
 */

const PBKDF2_ITERATIONS = 100_000;
const HASH_ALGORITHM = 'SHA-256';
const SALT_BYTES = 16;
const KEY_LENGTH_BYTES = 32;

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const length = hex.length / 2;
  const buffer = new ArrayBuffer(length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Hashes a plaintext password using PBKDF2 with a random salt.
 * Returns format: "pbkdf2:iterations:saltHex:hashHex"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM
    },
    passwordKey,
    KEY_LENGTH_BYTES * 8
  );

  const saltHex = bufferToHex(salt);
  const hashHex = bufferToHex(derivedBits);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Constant-time password verification against stored PBKDF2 hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.startsWith('pbkdf2:')) {
    return false;
  }

  const parts = storedHash.split(':');
  if (parts.length !== 4) {
    return false;
  }

  const [, iterationsStr, saltHex, originalHashHex] = parts;
  const iterations = parseInt(iterationsStr, 10);
  if (isNaN(iterations) || iterations < 1) {
    return false;
  }

  const salt = hexToBuffer(saltHex);
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: HASH_ALGORITHM
    },
    passwordKey,
    KEY_LENGTH_BYTES * 8
  );

  const calculatedHashHex = bufferToHex(derivedBits);

  // Constant-time string equality check
  if (calculatedHashHex.length !== originalHashHex.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < calculatedHashHex.length; i++) {
    result |= calculatedHashHex.charCodeAt(i) ^ originalHashHex.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generates a cryptographically random URL-safe token (e.g. for session tokens, email verification, password reset)
 */
export function generateSecureToken(bytes = 32): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(bytes));
  return bufferToHex(randomBytes);
}

/**
 * Hashes a token using SHA-256 for secure database storage (prevents database leak from compromising tokens)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

export function generateId(): string {
  return crypto.randomUUID();
}
