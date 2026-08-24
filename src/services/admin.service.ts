import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import type {
  UserRow,
  ProfileRow,
  AuditLogRow,
  FeatureFlagRow,
  SiteSettingRow,
  UserRole,
  UserStatus
} from '@/types/database';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import { AuditService } from './audit.service';
import { CreditService } from './credit.service';
import { destroyAllUserSessions } from '@/lib/auth/session';
import { NotFoundError, ValidationError } from '@/lib/errors';

export interface DashboardStats {
  totalUsers: number;
  totalAssessments: number;
  completedAttempts: number;
  premiumUsers: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  credits: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserDetail {
  user: UserRow;
  profile: ProfileRow | null;
  attemptCount: number;
  reportCount: number;
  creditBalance: number;
  activeSubscription: {
    planName: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
}

export class AdminService extends BaseService {
  private readonly db: D1Database | null;
  private readonly auditService: AuditService;

  constructor(db: D1Database | null, auditService?: AuditService) {
    super('AdminService');
    this.db = db;
    this.auditService = auditService || new AuditService(db);
  }

  /**
   * Retrieves high-level dashboard metrics
   */
  public async getDashboardStats(): Promise<DashboardStats> {
    if (!this.db) {
      return { totalUsers: 0, totalAssessments: 0, completedAttempts: 0, premiumUsers: 0 };
    }

    const [usersCount, assessmentsCount, attemptsCount, premiumCount] = await Promise.all([
      fetchFirst<{ count: number }>(this.db, "SELECT COUNT(*) as count FROM users WHERE status != 'deleted'"),
      fetchFirst<{ count: number }>(this.db, 'SELECT COUNT(*) as count FROM assessments'),
      fetchFirst<{ count: number }>(this.db, "SELECT COUNT(*) as count FROM assessment_attempts WHERE status = 'completed'"),
      fetchFirst<{ count: number }>(this.db, "SELECT COUNT(DISTINCT user_id) as count FROM subscriptions WHERE status = 'active'")
    ]);

    return {
      totalUsers: usersCount?.count ?? 0,
      totalAssessments: assessmentsCount?.count ?? 0,
      completedAttempts: attemptsCount?.count ?? 0,
      premiumUsers: premiumCount?.count ?? 0
    };
  }

  /**
   * Retrieves recent system and admin activity from audit_logs
   */
  public async getRecentActivity(limit = 10): Promise<(AuditLogRow & { actor_name?: string })[]> {
    if (!this.db) return [];

    return executeQuery<AuditLogRow & { actor_name?: string }>(
      this.db,
      `SELECT a.*, p.display_name as actor_name
       FROM audit_logs a
       LEFT JOIN profiles p ON a.actor_id = p.user_id
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Retrieves paginated, searchable, and filtered users list
   */
  public async getUsers(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    role?: string;
  } = {}): Promise<PaginatedResult<AdminUserListItem>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const offset = (page - 1) * limit;

    if (!this.db) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    let whereClause = "WHERE u.status != 'deleted'";
    const params: unknown[] = [];

    if (options.status) {
      whereClause += ' AND u.status = ?';
      params.push(options.status);
    }
    if (options.role) {
      whereClause += ' AND u.role = ?';
      params.push(options.role);
    }
    if (options.search && options.search.trim()) {
      whereClause += ' AND (u.email LIKE ? OR p.display_name LIKE ?)';
      const searchTerm = `%${options.search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    const countRow = await fetchFirst<{ total: number }>(
      this.db,
      `SELECT COUNT(*) as total
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       ${whereClause}`,
      params
    );

    const total = countRow?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    const items = await executeQuery<AdminUserListItem>(
      this.db,
      `SELECT
         u.id, u.email, u.role, u.status, u.created_at as createdAt, u.last_login_at as lastLoginAt,
         (u.email_verified_at IS NOT NULL) as emailVerified,
         COALESCE(cb.balance, 0) as credits,
         p.display_name as displayName
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN credit_balances cb ON u.id = cb.user_id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Retrieves detailed user information
   */
  public async getUserDetail(userId: string): Promise<AdminUserDetail | null> {
    if (!this.db) return null;

    const user = await fetchFirst<UserRow>(this.db, 'SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return null;

    const [profile, attempts, reports, subscription, creditRow] = await Promise.all([
      fetchFirst<ProfileRow>(this.db, 'SELECT * FROM profiles WHERE user_id = ?', [userId]),
      fetchFirst<{ count: number }>(this.db, 'SELECT COUNT(*) as count FROM assessment_attempts WHERE user_id = ?', [userId]),
      fetchFirst<{ count: number }>(this.db, 'SELECT COUNT(*) as count FROM reports WHERE user_id = ?', [userId]),
      fetchFirst<{ plan_name: string; status: string; current_period_end: string | null }>(
        this.db,
        `SELECT p.name as plan_name, s.status, s.current_period_end
         FROM subscriptions s
         INNER JOIN subscription_plans p ON s.plan_id = p.id
         WHERE s.user_id = ? AND s.status = 'active'
         LIMIT 1`,
        [userId]
      ),
      fetchFirst<{ balance: number }>(this.db, 'SELECT balance FROM credit_balances WHERE user_id = ?', [userId])
    ]);

    return {
      user,
      profile: profile || null,
      attemptCount: attempts?.count ?? 0,
      reportCount: reports?.count ?? 0,
      creditBalance: creditRow?.balance ?? 0,
      activeSubscription: subscription
        ? {
            planName: subscription.plan_name,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end
          }
        : null
    };
  }

  /**
   * Adjusts user credits manually as an administrator
   */
  public async adjustUserCredits(
    userId: string,
    amount: number,
    reason: string,
    actorId: string
  ): Promise<number> {
    if (!this.db) throw new Error('Database not available');
    const user = await fetchFirst<UserRow>(this.db, 'SELECT id, email FROM users WHERE id = ?', [userId]);
    if (!user) throw new NotFoundError('User not found');

    const creditService = new CreditService(this.db);
    const newBalance = await creditService.addCredits(
      userId,
      amount,
      'admin_adjustment',
      reason || 'Admin manual credit adjustment'
    );

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_credits_adjusted',
      entityType: 'user',
      entityId: userId,
      details: {
        userEmail: user.email,
        amount,
        reason,
        newBalance
      }
    });

    return newBalance;
  }

  /**
   * Updates user account status (e.g. suspend or reactivate)
   */
  public async updateUserStatus(userId: string, status: UserStatus, actorId: string): Promise<void> {
    if (!this.db) throw new Error('Database not available');

    const user = await fetchFirst<UserRow>(this.db, 'SELECT id, email, status FROM users WHERE id = ?', [userId]);
    if (!user) throw new NotFoundError('User not found');

    if (user.id === actorId && status === 'suspended') {
      throw new ValidationError('Administrators cannot suspend their own account.');
    }

    await this.db
      .prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(status, userId)
      .run();

    // If suspended, invalidate all active sessions immediately
    if (status === 'suspended') {
      await destroyAllUserSessions(this.db, userId);
    }

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: status === 'suspended' ? 'admin_user_suspended' : 'admin_user_reactivated',
      entityType: 'user',
      entityId: userId,
      details: { previousStatus: user.status, newStatus: status, email: user.email }
    });
  }

  /**
   * Updates user role (e.g. elevate to admin or demote to user)
   */
  public async updateUserRole(userId: string, role: UserRole, actorId: string): Promise<void> {
    if (!this.db) throw new Error('Database not available');

    const user = await fetchFirst<UserRow>(this.db, 'SELECT id, email, role FROM users WHERE id = ?', [userId]);
    if (!user) throw new NotFoundError('User not found');

    if (user.id === actorId && role !== 'admin') {
      throw new ValidationError('Administrators cannot remove their own admin role.');
    }

    await this.db
      .prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(role, userId)
      .run();

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_user_role_updated',
      entityType: 'user',
      entityId: userId,
      details: { previousRole: user.role, newRole: role, email: user.email }
    });
  }

  /**
   * Manually sets or toggles user email verification status by administrator
   */
  public async setUserVerification(userId: string, isVerified: boolean, actorId: string): Promise<void> {
    if (!this.db) throw new Error('Database not available');

    const user = await fetchFirst<UserRow>(this.db, 'SELECT id, email, status, email_verified_at FROM users WHERE id = ?', [userId]);
    if (!user) throw new NotFoundError('User not found');

    if (isVerified) {
      await this.db
        .prepare(`UPDATE users SET 
          email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
          status = CASE WHEN status = 'pending_verification' THEN 'active' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`)
        .bind(userId)
        .run();
    } else {
      await this.db
        .prepare(`UPDATE users SET 
          email_verified_at = NULL,
          status = CASE WHEN status = 'active' THEN 'pending_verification' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`)
        .bind(userId)
        .run();
    }

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: isVerified ? 'user_manual_verified' : 'user_manual_unverified',
      entityType: 'user',
      entityId: userId,
      details: { targetEmail: user.email, isVerified }
    });
  }

  /**
   * Retrieves all dynamic site settings as a key-value map
   */
  public async getAllSettings(): Promise<Record<string, string>> {
    if (!this.db) return {};

    const rows = await executeQuery<SiteSettingRow>(this.db, 'SELECT key, value FROM site_settings');
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  }

  /**
   * Updates a dynamic setting
   */
  public async updateSetting(key: string, value: string, actorId: string): Promise<void> {
    if (!this.db) throw new Error('Database not available');

    await this.db
      .prepare(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
      )
      .bind(key, value)
      .run();

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_setting_updated',
      entityType: 'setting',
      entityId: key,
      details: { key, isSecret: key.includes('password') || key.includes('secret') }
    });
  }

  /**
   * Updates multiple settings at once
   */
  public async updateSettings(settings: Record<string, string>, actorId: string): Promise<void> {
    if (!this.db) throw new Error('Database not available');

    for (const [key, value] of Object.entries(settings)) {
      // Avoid overwriting sensitive fields with mask placeholder
      if (value === '********') continue;
      await this.updateSetting(key, value, actorId);
    }
  }

  /**
   * Retrieves all feature flags
   */
  public async getFeatureFlags(): Promise<FeatureFlagRow[]> {
    if (!this.db) return [];
    return executeQuery<FeatureFlagRow>(this.db, 'SELECT * FROM feature_flags ORDER BY key ASC');
  }

  /**
   * Toggles a feature flag
   */
  public async toggleFeatureFlag(key: string, isEnabled: boolean, actorId: string): Promise<void> {
    if (!this.db) throw new Error('Database not available');

    await this.db
      .prepare(
        `INSERT INTO feature_flags (key, name, is_enabled, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET is_enabled = excluded.is_enabled, updated_at = CURRENT_TIMESTAMP`
      )
      .bind(key, key, isEnabled ? 1 : 0)
      .run();

    await this.auditService.record({
      actorId,
      actorRole: 'admin',
      action: 'admin_feature_flag_toggled',
      entityType: 'feature_flag',
      entityId: key,
      details: { key, isEnabled }
    });
  }

  /**
   * Retrieves paginated audit logs
   */
  public async getAuditLogs(options: {
    page?: number;
    limit?: number;
    action?: string;
    search?: string;
  } = {}): Promise<PaginatedResult<AuditLogRow & { actor_name?: string }>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    if (!this.db) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];

    if (options.action) {
      whereClause += ' AND a.action = ?';
      params.push(options.action);
    }
    if (options.search && options.search.trim()) {
      whereClause += ' AND (a.action LIKE ? OR a.entity_type LIKE ? OR a.entity_id LIKE ?)';
      const term = `%${options.search.trim()}%`;
      params.push(term, term, term);
    }

    const countRow = await fetchFirst<{ total: number }>(
      this.db,
      `SELECT COUNT(*) as total FROM audit_logs a ${whereClause}`,
      params
    );

    const total = countRow?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    const items = await executeQuery<AuditLogRow & { actor_name?: string }>(
      this.db,
      `SELECT a.*, p.display_name as actor_name
       FROM audit_logs a
       LEFT JOIN profiles p ON a.actor_id = p.user_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages
    };
  }
}
