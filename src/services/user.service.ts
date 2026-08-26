import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import type { UserRow, ProfileRow, UserRole, UserStatus } from '@/types/database';
import { fetchFirst } from '@/lib/db/query';

export class UserService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('UserService');
    this.db = db;
  }

  public async getUserById(id: string): Promise<UserRow | null> {
    if (!this.db) return null;
    return fetchFirst<UserRow>(this.db, 'SELECT * FROM users WHERE id = ?', [id]);
  }

  public async getUserByEmail(email: string): Promise<UserRow | null> {
    if (!this.db) return null;
    return fetchFirst<UserRow>(this.db, 'SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  }

  public async createUser(data: {
    id?: string;
    email: string;
    passwordHash?: string | null;
    authProvider?: string;
    authProviderId?: string | null;
    role?: UserRole;
    status?: UserStatus;
    displayName?: string;
  }): Promise<UserRow> {
    if (!this.db) throw new Error('Database not available');
    const id = data.id || crypto.randomUUID();
    const email = data.email.toLowerCase().trim();

    await this.db
      .prepare(
        'INSERT INTO users (id, email, password_hash, auth_provider, auth_provider_id, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .bind(
        id,
        email,
        data.passwordHash || null,
        data.authProvider || 'email',
        data.authProviderId || null,
        data.role || 'user',
        data.status || 'active'
      )
      .run();

    // Create initial profile
    await this.db
      .prepare(
        "INSERT INTO profiles (user_id, display_name, timezone, locale, created_at, updated_at) VALUES (?, ?, 'UTC', 'en', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
      )
      .bind(id, data.displayName || email.split('@')[0])
      .run();

    // Create initial credit balance
    await this.db
      .prepare('INSERT INTO credit_balances (user_id, balance, updated_at) VALUES (?, 0, CURRENT_TIMESTAMP)')
      .bind(id)
      .run();

    const created = await this.getUserById(id);
    if (!created) throw new Error('Failed to retrieve created user');
    return created;
  }

  public async getProfile(userId: string): Promise<ProfileRow | null> {
    if (!this.db) return null;
    return fetchFirst<ProfileRow>(this.db, 'SELECT * FROM profiles WHERE user_id = ?', [userId]);
  }

  public async updateProfile(userId: string, data: Partial<Omit<ProfileRow, 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
    if (!this.db) throw new Error('Database not available');
    await this.db
      .prepare(
        `UPDATE profiles
         SET display_name = COALESCE(?, display_name),
             avatar_url = COALESCE(?, avatar_url),
             timezone = COALESCE(?, timezone),
             locale = COALESCE(?, locale),
             preferences = COALESCE(?, preferences),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`
      )
      .bind(data.display_name || null, data.avatar_url || null, data.timezone || null, data.locale || null, data.preferences || null, userId)
      .run();
  }
}
