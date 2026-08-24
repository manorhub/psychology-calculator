import type { D1Database } from '@cloudflare/workers-types';
import type { SessionRow, UserRow } from '@/types/database';
import type { User, Session } from '@/types/auth';
import { generateSecureToken, hashToken } from '@/lib/crypto';
import { fetchFirst } from '@/lib/db/query';

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const SESSION_RENEWAL_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 15; // 15 days

export interface CreateSessionResult {
  session: SessionRow;
  rawToken: string;
}

/**
 * Creates a new secure server-side session in Cloudflare D1
 */
export async function createSession(
  db: D1Database,
  userId: string,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<CreateSessionResult> {
  const sessionId = crypto.randomUUID();
  const rawToken = generateSecureToken(32);
  const tokenHash = await hashToken(rawToken);

  const now = Date.now();
  const expiresAt = new Date(now + SESSION_DURATION_MS).toISOString();

  await db
    .prepare(
      'INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
    )
    .bind(sessionId, userId, tokenHash, ipAddress || null, userAgent || null, expiresAt)
    .run();

  const sessionRow: SessionRow = {
    id: sessionId,
    user_id: userId,
    token_hash: tokenHash,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return { session: sessionRow, rawToken };
}

/**
 * Validates a session token, returning the user and session if valid
 */
export async function validateSessionToken(
  db: D1Database,
  rawToken: string
): Promise<{ user: User; session: Session } | null> {
  if (!rawToken || rawToken.length < 16) {
    return null;
  }

  const tokenHash = await hashToken(rawToken);

  interface JoinedSessionResult extends SessionRow {
    email: string;
    role: UserRow['role'];
    user_status: UserRow['status'];
    email_verified_at: string | null;
    user_created_at: string;
    last_login_at: string | null;
    display_name: string | null;
    avatar_url: string | null;
    timezone: string | null;
    locale: string | null;
    preferences: string | null;
  }

  const row = await fetchFirst<JoinedSessionResult>(
    db,
    `SELECT
       s.*,
       u.email, u.role, u.status as user_status, u.email_verified_at, u.created_at as user_created_at, u.last_login_at,
       p.display_name, p.avatar_url, p.timezone, p.locale, p.preferences
     FROM sessions s
     INNER JOIN users u ON s.user_id = u.id
     LEFT JOIN profiles p ON u.id = p.user_id
     WHERE s.token_hash = ?`,
    [tokenHash]
  );

  if (!row) {
    return null;
  }

  const now = Date.now();
  const expiresAtMs = new Date(row.expires_at).getTime();

  // Check expiration
  if (now >= expiresAtMs) {
    await destroySession(db, rawToken);
    return null;
  }

  // Reject suspended or deleted users
  if (row.user_status === 'suspended' || row.user_status === 'deleted') {
    return null;
  }

  // Sliding window renewal: extend session if over half its lifespan has passed
  if (expiresAtMs - now < SESSION_RENEWAL_THRESHOLD_MS) {
    const newExpiresAt = new Date(now + SESSION_DURATION_MS).toISOString();
    await db
      .prepare('UPDATE sessions SET expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(newExpiresAt, row.id)
      .run();
    row.expires_at = newExpiresAt;
  }

  let parsedPreferences: Record<string, unknown> = {};
  if (row.preferences) {
    try {
      parsedPreferences = JSON.parse(row.preferences);
    } catch {
      parsedPreferences = {};
    }
  }

  const user: User = {
    id: row.user_id,
    email: row.email,
    role: row.role,
    status: row.user_status,
    emailVerified: row.email_verified_at !== null,
    profile: {
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      timezone: row.timezone || 'UTC',
      locale: row.locale || 'en',
      preferences: parsedPreferences
    },
    createdAt: row.user_created_at,
    lastLoginAt: row.last_login_at
  };

  const session: Session = {
    id: row.id,
    userId: row.user_id,
    user,
    expiresAt: new Date(row.expires_at)
  };

  return { user, session };
}

/**
 * Destroys a single session by token
 */
export async function destroySession(db: D1Database, rawToken: string): Promise<void> {
  const tokenHash = await hashToken(rawToken);
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

/**
 * Destroys all active sessions for a user (e.g. on password change or account deletion)
 */
export async function destroyAllUserSessions(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}
