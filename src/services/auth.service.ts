import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import type { User, AuthContext, AuthResult, Permission, GoogleUserInfo } from '@/types/auth';
import type { UserRow, ProfileRow, VerificationTokenRow, PasswordResetTokenRow, OAuthAccountRow } from '@/types/database';
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashToken
} from '@/lib/crypto';
import {
  normalizeEmail,
  validatePasswordStrength,
  RateLimiter
} from '@/lib/security';
import {
  createSession,
  destroySession,
  destroyAllUserSessions
} from '@/lib/auth/session';
import { EmailService } from './email.service';
import { AuditService } from './audit.service';
import { fetchFirst } from '@/lib/db/query';
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  NotFoundError
} from '@/lib/errors';

export class AuthService extends BaseService {
  private readonly db: D1Database | null;
  private readonly emailService: EmailService;
  private readonly auditService: AuditService;
  private readonly rateLimiter: RateLimiter;

  constructor(
    db: D1Database | null,
    emailService?: EmailService,
    auditService?: AuditService,
    rateLimiter?: RateLimiter
  ) {
    super('AuthService');
    this.db = db;
    this.emailService = emailService || new EmailService(db);
    this.auditService = auditService || new AuditService(db);
    this.rateLimiter = rateLimiter || new RateLimiter(db);
  }

  /**
   * Registers a new user with email and password
   */
  public async register(params: {
    name: string;
    email: string;
    password: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    guestSessionId?: string | null;
  }): Promise<AuthResult> {
    if (!this.db) throw new Error('Database is not available');

    const email = normalizeEmail(params.email);
    const ipKey = params.ipAddress || 'anonymous';

    // 1. Rate limit check (5 registrations per hour per IP)
    const rateCheck = await this.rateLimiter.checkLimit(ipKey, 'register', 5, 3600);
    if (!rateCheck.allowed) {
      throw new ValidationError(`Too many registration attempts. Please try again in ${rateCheck.resetInSeconds} seconds.`);
    }

    // 2. Validate input format
    if (!params.name || params.name.trim().length < 2) {
      throw new ValidationError('Name must be at least 2 characters long.');
    }
    const passwordStrength = validatePasswordStrength(params.password);
    if (!passwordStrength.isValid) {
      throw new ValidationError(passwordStrength.message || 'Password does not meet security requirements.');
    }

    // 3. Check for existing user
    const existingUser = await fetchFirst<UserRow>(this.db, 'SELECT id, status FROM users WHERE email = ?', [email]);
    if (existingUser) {
      this.logger.warn(`Registration attempted for existing email: ${email}`);
      throw new ConflictError('An account with this email address already exists. Please sign in instead.');
    }

    // 4. Hash password and insert user + profile
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(params.password);
    const bonusCredits = await this.getSignupBonusCredits();

    await this.db
      .prepare(
        "INSERT INTO users (id, email, password_hash, auth_provider, role, status, created_at, updated_at) VALUES (?, ?, ?, 'email', 'user', 'pending_verification', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
      )
      .bind(userId, email, passwordHash)
      .run();

    await this.db
      .prepare(
        "INSERT INTO profiles (user_id, display_name, timezone, locale, created_at, updated_at) VALUES (?, ?, 'UTC', 'en', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
      )
      .bind(userId, params.name.trim())
      .run();

    await this.db
      .prepare('INSERT INTO credit_balances (user_id, balance, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .bind(userId, bonusCredits)
      .run();

    await this.db
      .prepare('INSERT OR IGNORE INTO credit_wallets (id, user_id, balance, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)')
      .bind(`wlt_${userId}`, userId, bonusCredits)
      .run();

    if (bonusCredits > 0) {
      await this.db
        .prepare(
          "INSERT INTO credit_transactions (id, user_id, amount, transaction_type, source, reference_id, metadata, created_at) VALUES (?, ?, ?, 'signup_bonus', 'system', 'welcome_bonus', ?, CURRENT_TIMESTAMP)"
        )
        .bind(
          `tx_${crypto.randomUUID()}`,
          userId,
          bonusCredits,
          JSON.stringify({ reason: 'New user welcome bonus credits' })
        )
        .run();
    }

    // 5. Generate Email Verification Token
    const rawVerificationToken = generateSecureToken(32);
    const tokenHash = await hashToken(rawVerificationToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24 hours

    await this.db
      .prepare(
        "INSERT INTO verification_tokens (id, user_id, token_hash, type, expires_at, created_at) VALUES (?, ?, ?, 'email_verification', ?, CURRENT_TIMESTAMP)"
      )
      .bind(crypto.randomUUID(), userId, tokenHash, expiresAt)
      .run();

    // 6. Link anonymous guest assessment attempt if available
    if (params.guestSessionId) {
      await this.linkGuestAttempt(userId, params.guestSessionId);
    }

    // 7. Dispatch verification email & log audit
    await this.emailService.sendVerificationEmail(email, params.name.trim(), rawVerificationToken);

    await this.auditService.record({
      actorId: userId,
      actorRole: 'user',
      action: 'registration',
      entityType: 'user',
      entityId: userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    return {
      success: true,
      requiresEmailVerification: true,
      message: 'Registration successful! Please check your email to verify your account.'
    };
  }

  /**
   * Authenticates user with email and password
   */
  public async login(params: {
    email: string;
    password: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    guestSessionId?: string | null;
  }): Promise<AuthResult> {
    if (!this.db) throw new Error('Database is not available');

    const email = normalizeEmail(params.email);
    const rateLimitKey = `${params.ipAddress || 'unknown'}:${email}`;

    // 1. Rate limit check (5 attempts per 15 minutes)
    const rateCheck = await this.rateLimiter.checkLimit(rateLimitKey, 'login', 5, 900);
    if (!rateCheck.allowed) {
      throw new ValidationError(`Too many failed login attempts. Please try again in ${rateCheck.resetInSeconds} seconds.`);
    }

    // 2. Lookup user & profile
    const userRow = await fetchFirst<UserRow>(
      this.db,
      'SELECT id, email, password_hash, role, status, email_verified_at, created_at, last_login_at FROM users WHERE email = ?',
      [email]
    );

    if (!userRow || !userRow.password_hash) {
      this.logger.warn(`Failed login for email: ${email} (account not found or OAuth only)`);
      throw new UnauthorizedError('Invalid email or password.');
    }

    // 3. Verify password hash
    const isPasswordValid = await verifyPassword(params.password, userRow.password_hash);
    if (!isPasswordValid) {
      this.logger.warn(`Failed login password verification for user: ${userRow.id}`);
      throw new UnauthorizedError('Invalid email or password.');
    }

    // 4. Check account status
    if (userRow.status === 'suspended') {
      throw new ForbiddenError('Your account has been suspended. Please contact support.');
    }
    if (userRow.status === 'deleted') {
      throw new UnauthorizedError('Invalid email or password.');
    }
    if (userRow.status === 'pending_verification' && !userRow.email_verified_at) {
      return {
        success: false,
        requiresEmailVerification: true,
        message: 'Your email address is not verified yet. Please check your inbox or request a new verification link.'
      };
    }

    // 5. Reset rate limiter on successful login
    await this.rateLimiter.resetLimit(rateLimitKey, 'login');

    // 6. Update last_login_at
    await this.db
      .prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(userRow.id)
      .run();

    // 7. Create server session
    const { rawToken } = await createSession(this.db, userRow.id, params.ipAddress, params.userAgent);

    // 8. Fetch profile for user object
    const profileRow = await fetchFirst<ProfileRow>(this.db, 'SELECT * FROM profiles WHERE user_id = ?', [userRow.id]);

    const user: User = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
      status: userRow.status,
      emailVerified: userRow.email_verified_at !== null,
      profile: {
        displayName: profileRow?.display_name || null,
        avatarUrl: profileRow?.avatar_url || null,
        timezone: profileRow?.timezone || 'UTC',
        locale: profileRow?.locale || 'en',
        preferences: profileRow?.preferences ? JSON.parse(profileRow.preferences) : {}
      },
      createdAt: userRow.created_at,
      lastLoginAt: new Date().toISOString()
    };

    // 9. Link anonymous guest assessment attempt if available
    if (params.guestSessionId) {
      await this.linkGuestAttempt(user.id, params.guestSessionId);
    }

    // 10. Record audit log
    await this.auditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    return {
      success: true,
      user,
      sessionToken: rawToken
    };
  }

  /**
   * Logs out user by destroying the current session
   */
  public async logout(sessionToken: string, userId?: string, ipAddress?: string | null): Promise<void> {
    if (this.db && sessionToken) {
      await destroySession(this.db, sessionToken);
      if (userId) {
        await this.auditService.record({
          actorId: userId,
          actorRole: 'user',
          action: 'logout',
          entityType: 'session',
          ipAddress
        });
      }
    }
  }

  /**
   * Verifies an email verification token
   */
  public async verifyEmail(rawToken: string): Promise<boolean> {
    if (!this.db || !rawToken) return false;

    const tokenHash = await hashToken(rawToken);
    const now = new Date().toISOString();

    const tokenRow = await fetchFirst<VerificationTokenRow>(
      this.db,
      'SELECT * FROM verification_tokens WHERE token_hash = ? AND expires_at > ?',
      [tokenHash, now]
    );

    if (!tokenRow) {
      return false;
    }

    // Activate user and set email_verified_at
    await this.db
      .prepare(
        "UPDATE users SET status = 'active', email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .bind(tokenRow.user_id)
      .run();

    // Delete single-use verification token
    await this.db.prepare('DELETE FROM verification_tokens WHERE id = ?').bind(tokenRow.id).run();

    // Fetch user for welcome email
    const user = await fetchFirst<UserRow>(this.db, 'SELECT email FROM users WHERE id = ?', [tokenRow.user_id]);
    const profile = await fetchFirst<ProfileRow>(this.db, 'SELECT display_name FROM profiles WHERE user_id = ?', [tokenRow.user_id]);

    if (user) {
      await this.emailService.sendWelcomeEmail(user.email, profile?.display_name || '');
    }

    await this.auditService.record({
      actorId: tokenRow.user_id,
      action: 'email_verification',
      entityType: 'user',
      entityId: tokenRow.user_id
    });

    return true;
  }

  /**
   * Resends verification email
   */
  public async resendVerification(email: string, ipAddress?: string | null): Promise<void> {
    if (!this.db) return;

    const normalized = normalizeEmail(email);
    const ipKey = ipAddress || 'unknown';

    // Rate limit (3 per 15 min)
    const rateCheck = await this.rateLimiter.checkLimit(ipKey, 'resend_verification', 3, 900);
    if (!rateCheck.allowed) {
      throw new ValidationError(`Too many requests. Please wait ${rateCheck.resetInSeconds} seconds.`);
    }

    const user = await fetchFirst<UserRow>(this.db, 'SELECT id, email, status, email_verified_at FROM users WHERE email = ?', [normalized]);
    if (!user || user.email_verified_at) {
      // Generic return to avoid email enumeration
      return;
    }

    // Invalidate old tokens
    await this.db.prepare('DELETE FROM verification_tokens WHERE user_id = ?').bind(user.id).run();

    // Create new token
    const rawToken = generateSecureToken(32);
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    await this.db
      .prepare("INSERT INTO verification_tokens (id, user_id, token_hash, type, expires_at, created_at) VALUES (?, ?, ?, 'email_verification', ?, CURRENT_TIMESTAMP)")
      .bind(crypto.randomUUID(), user.id, tokenHash, expiresAt)
      .run();

    const profile = await fetchFirst<ProfileRow>(this.db, 'SELECT display_name FROM profiles WHERE user_id = ?', [user.id]);
    await this.emailService.sendVerificationEmail(user.email, profile?.display_name || '', rawToken);
  }

  /**
   * Requests a password reset link
   */
  public async requestPasswordReset(email: string, ipAddress?: string | null): Promise<void> {
    if (!this.db) return;

    const normalized = normalizeEmail(email);
    const rateKey = `${ipAddress || 'unknown'}:${normalized}`;

    // Rate limit (3 per hour)
    const rateCheck = await this.rateLimiter.checkLimit(rateKey, 'password_reset', 3, 3600);
    if (!rateCheck.allowed) {
      throw new ValidationError(`Too many password reset requests. Please wait ${rateCheck.resetInSeconds} seconds.`);
    }

    const user = await fetchFirst<UserRow>(this.db, 'SELECT id, email, status FROM users WHERE email = ?', [normalized]);
    if (!user || user.status === 'deleted' || user.status === 'suspended') {
      // Return generic success to prevent email enumeration
      return;
    }

    // Invalidate old unused reset tokens
    await this.db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL').bind(user.id).run();

    // Create 1-hour reset token
    const rawToken = generateSecureToken(32);
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

    await this.db
      .prepare('INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .bind(crypto.randomUUID(), user.id, tokenHash, expiresAt)
      .run();

    const profile = await fetchFirst<ProfileRow>(this.db, 'SELECT display_name FROM profiles WHERE user_id = ?', [user.id]);
    await this.emailService.sendPasswordResetEmail(user.email, profile?.display_name || '', rawToken);

    await this.auditService.record({
      actorId: user.id,
      action: 'password_reset_requested',
      entityType: 'user',
      entityId: user.id,
      ipAddress
    });
  }

  /**
   * Resets user password using reset token
   */
  public async resetPassword(rawToken: string, newPassword: string, ipAddress?: string | null): Promise<boolean> {
    if (!this.db || !rawToken) return false;

    const passwordStrength = validatePasswordStrength(newPassword);
    if (!passwordStrength.isValid) {
      throw new ValidationError(passwordStrength.message || 'Password does not meet requirements.');
    }

    const tokenHash = await hashToken(rawToken);
    const now = new Date().toISOString();

    const tokenRow = await fetchFirst<PasswordResetTokenRow>(
      this.db,
      'SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?',
      [tokenHash, now]
    );

    if (!tokenRow) {
      throw new ValidationError('Password reset link is invalid or has expired. Please request a new one.');
    }

    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await this.db
      .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(newPasswordHash, tokenRow.user_id)
      .run();

    // Mark token used
    await this.db
      .prepare('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(tokenRow.id)
      .run();

    // Invalidate all active sessions for security
    await destroyAllUserSessions(this.db, tokenRow.user_id);

    await this.auditService.record({
      actorId: tokenRow.user_id,
      action: 'password_reset_completed',
      entityType: 'user',
      entityId: tokenRow.user_id,
      ipAddress
    });

    return true;
  }

  /**
   * Changes password for authenticated user
   */
  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionToken?: string,
    ipAddress?: string | null
  ): Promise<void> {
    if (!this.db) throw new Error('Database not available');

    const user = await fetchFirst<UserRow>(this.db, 'SELECT id, password_hash FROM users WHERE id = ?', [userId]);
    if (!user || !user.password_hash) {
      throw new UnauthorizedError('User account not found or has no password set.');
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      throw new ValidationError('Current password is incorrect.');
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      throw new ValidationError(strength.message || 'New password does not meet requirements.');
    }

    const newHash = await hashPassword(newPassword);
    await this.db
      .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(newHash, userId)
      .run();

    // Invalidate other sessions, retaining current session if provided
    if (currentSessionToken) {
      const currentTokenHash = await hashToken(currentSessionToken);
      await this.db
        .prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?')
        .bind(userId, currentTokenHash)
        .run();
    } else {
      await destroyAllUserSessions(this.db, userId);
    }

    await this.auditService.record({
      actorId: userId,
      action: 'password_changed',
      entityType: 'user',
      entityId: userId,
      ipAddress
    });
  }

  /**
   * Deletes (soft deletes) user account
   */
  public async deleteAccount(userId: string, passwordConfirmation: string, ipAddress?: string | null): Promise<void> {
    if (!this.db) throw new Error('Database not available');

    const user = await fetchFirst<UserRow>(this.db, 'SELECT id, email, password_hash FROM users WHERE id = ?', [userId]);
    if (!user) throw new NotFoundError('User not found');

    if (user.password_hash) {
      const isValid = await verifyPassword(passwordConfirmation, user.password_hash);
      if (!isValid) {
        throw new ValidationError('Password confirmation is incorrect.');
      }
    }

    // Soft delete: clear personal data and set status = deleted
    const scrambledEmail = `deleted_${userId}_${Date.now()}@deleted.invalid`;
    await this.db
      .prepare(
        "UPDATE users SET email = ?, password_hash = NULL, status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .bind(scrambledEmail, userId)
      .run();

    await this.db
      .prepare(
        "UPDATE profiles SET display_name = 'Deleted User', avatar_url = NULL, preferences = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
      )
      .bind(userId)
      .run();

    // Invalidate all sessions and tokens
    await destroyAllUserSessions(this.db, userId);
    await this.db.prepare('DELETE FROM verification_tokens WHERE user_id = ?').bind(userId).run();
    await this.db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(userId).run();

    await this.auditService.record({
      actorId: userId,
      action: 'account_deleted',
      entityType: 'user',
      entityId: userId,
      ipAddress
    });
  }

  /**
   * Handles Google OAuth sign-in and account linking
   */
  public async handleGoogleUser(
    googleUser: GoogleUserInfo,
    ipAddress?: string | null,
    userAgent?: string | null,
    guestSessionId?: string | null
  ): Promise<AuthResult> {
    if (!this.db) throw new Error('Database not available');

    const email = normalizeEmail(googleUser.email);
    const googleUserId = googleUser.id || (googleUser as any).sub;

    if (!googleUserId) {
      throw new ValidationError('Invalid Google user profile: Missing Google user identifier.');
    }

    // 1. Check if OAuth account link already exists
    const existingOAuth = await fetchFirst<OAuthAccountRow>(
      this.db,
      "SELECT * FROM oauth_accounts WHERE provider = 'google' AND provider_user_id = ?",
      [googleUserId]
    );

    let targetUserId: string;

    if (existingOAuth) {
      targetUserId = existingOAuth.user_id;
    } else {
      // 2. Check if a user with this email already exists
      const existingUser = await fetchFirst<UserRow>(this.db, 'SELECT id, status FROM users WHERE email = ?', [email]);

      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        // 3. Create new user + profile
        targetUserId = crypto.randomUUID();
        await this.db
          .prepare(
            "INSERT INTO users (id, email, auth_provider, auth_provider_id, role, status, email_verified_at, created_at, updated_at) VALUES (?, ?, 'google', ?, 'user', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
          )
          .bind(targetUserId, email, googleUserId)
          .run();

        await this.db
          .prepare(
            "INSERT INTO profiles (user_id, display_name, avatar_url, timezone, locale, created_at, updated_at) VALUES (?, ?, ?, 'UTC', 'en', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
          )
          .bind(targetUserId, googleUser.name || email.split('@')[0], googleUser.picture || null)
          .run();

        const bonusCredits = await this.getSignupBonusCredits();

        await this.db
          .prepare('INSERT OR IGNORE INTO credit_balances (user_id, balance, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
          .bind(targetUserId, bonusCredits)
          .run();

        await this.db
          .prepare('INSERT OR IGNORE INTO credit_wallets (id, user_id, balance, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)')
          .bind(`wlt_${targetUserId}`, targetUserId, bonusCredits)
          .run();

        if (bonusCredits > 0) {
          await this.db
            .prepare(
              "INSERT INTO credit_transactions (id, user_id, amount, transaction_type, source, reference_id, metadata, created_at) VALUES (?, ?, ?, 'signup_bonus', 'system', 'welcome_bonus', ?, CURRENT_TIMESTAMP)"
            )
            .bind(
              `tx_${crypto.randomUUID()}`,
              targetUserId,
              bonusCredits,
              JSON.stringify({ reason: 'New user welcome bonus credits' })
            )
            .run();
        }
      }

      // Link OAuth account
      await this.db
        .prepare(
          "INSERT OR IGNORE INTO oauth_accounts (id, user_id, provider, provider_user_id, email, created_at, updated_at) VALUES (?, ?, 'google', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        )
        .bind(crypto.randomUUID(), targetUserId, googleUserId, email)
        .run();
    }

    // Verify user is active
    const userRow = await fetchFirst<UserRow>(this.db, 'SELECT * FROM users WHERE id = ?', [targetUserId]);
    if (!userRow || userRow.status === 'suspended' || userRow.status === 'deleted') {
      throw new ForbiddenError('Account is suspended or deleted.');
    }

    // Update last_login_at & set verified
    await this.db
      .prepare('UPDATE users SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP), last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(targetUserId)
      .run();

    // Create session
    const { rawToken } = await createSession(this.db, targetUserId, ipAddress, userAgent);
    const profileRow = await fetchFirst<ProfileRow>(this.db, 'SELECT * FROM profiles WHERE user_id = ?', [targetUserId]);

    const user: User = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
      status: userRow.status,
      emailVerified: true,
      profile: {
        displayName: profileRow?.display_name || googleUser.name,
        avatarUrl: profileRow?.avatar_url || googleUser.picture || null,
        timezone: profileRow?.timezone || 'UTC',
        locale: profileRow?.locale || 'en',
        preferences: profileRow?.preferences ? JSON.parse(profileRow.preferences) : {}
      },
      createdAt: userRow.created_at,
      lastLoginAt: new Date().toISOString()
    };

    if (guestSessionId) {
      await this.linkGuestAttempt(targetUserId, guestSessionId);
    }

    await this.auditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'google_login',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
      userAgent
    });

    return {
      success: true,
      user,
      sessionToken: rawToken
    };
  }

  /**
   * Links anonymous guest attempt to a newly authenticated user
   */
  public async linkGuestAttempt(userId: string, sessionId: string): Promise<void> {
    if (!this.db || !sessionId) return;
    try {
      await this.db
        .prepare('UPDATE assessment_attempts SET user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ? AND user_id IS NULL')
        .bind(userId, sessionId)
        .run();
    } catch {
      // Ignore
    }
  }

  /**
   * Resolves authentication context from request cookies or user
   */
  public resolveAuthContext(user: User | null): AuthContext {
    const isAuthenticated = user !== null;
    const isAdmin = user?.role === 'admin';

    const hasPermission = (permission: Permission): boolean => {
      if (!isAuthenticated) return false;
      if (isAdmin) return true;

      switch (permission) {
        case 'assessments:read':
          return true;
        case 'admin:access':
        case 'assessments:write':
        case 'users:manage':
        case 'settings:manage':
        case 'reports:read_all':
          return false;
        default:
          return false;
      }
    };

    return {
      user,
      isAuthenticated,
      isAdmin,
      hasPermission
    };
  }

  /**
   * Retrieves the configured signup bonus credits for new users from site_settings (defaults to 10)
   */
  public async getSignupBonusCredits(): Promise<number> {
    if (!this.db) return 10;
    try {
      const row = await fetchFirst<{ value: string }>(
        this.db,
        "SELECT value FROM site_settings WHERE key = 'signup_bonus_credits' OR key = 'new_user_initial_credits' LIMIT 1"
      );
      if (!row || row.value === undefined || row.value === null) return 10;
      const parsed = parseInt(row.value, 10);
      return isNaN(parsed) ? 10 : Math.max(0, parsed);
    } catch {
      return 10;
    }
  }
}
