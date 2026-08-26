import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst, executeMutation } from '@/lib/db/query';
import type {
  NotificationRow,
  NotificationType,
  UserNotificationPreferencesRow
} from '@/types/database';
import { ValidationError, NotFoundError } from '@/lib/errors';

export class NotificationService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db?: D1Database | null) {
    super('NotificationService');
    this.db = db || null;
  }

  /**
   * Creates an in-app notification for a user
   */
  public async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string | null
  ): Promise<string> {
    if (!this.db) throw new ValidationError('Database not configured');

    const id = crypto.randomUUID();
    await executeMutation(
      this.db,
      `INSERT INTO notifications (id, user_id, type, title, message, link, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP)`,
      [id, userId, type, title.trim(), message.trim(), link || null]
    );

    this.logger.info('Notification created', { id, userId, type });
    return id;
  }

  /**
   * Retrieves paginated notifications for a user with unread count
   */
  public async getUserNotifications(
    userId: string,
    limit = 20,
    offset = 0,
    unreadOnly = false
  ): Promise<{ notifications: NotificationRow[]; total: number; unreadCount: number }> {
    if (!this.db) {
      return { notifications: [], total: 0, unreadCount: 0 };
    }

    let countSql = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?';
    let listSql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [userId];

    if (unreadOnly) {
      countSql += ' AND read_at IS NULL';
      listSql += ' AND read_at IS NULL';
    }

    listSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const [countResult, unreadResult, notifications] = await Promise.all([
      fetchFirst<{ count: number }>(this.db, countSql, params),
      fetchFirst<{ count: number }>(
        this.db,
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL',
        [userId]
      ),
      executeQuery<NotificationRow>(this.db, listSql, [...params, limit, offset])
    ]);

    return {
      notifications,
      total: countResult?.count || 0,
      unreadCount: unreadResult?.count || 0
    };
  }

  /**
   * Fast query for header bell unread count
   */
  public async getUnreadCount(userId: string): Promise<number> {
    if (!this.db) return 0;
    const result = await fetchFirst<{ count: number }>(
      this.db,
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );
    return result?.count || 0;
  }

  /**
   * Marks a single notification as read with ownership verification
   */
  public async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    if (!this.db) return false;

    const notif = await fetchFirst<NotificationRow>(
      this.db,
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    if (!notif) throw new NotFoundError('Notification not found or unauthorized');

    await executeMutation(
      this.db,
      'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    return true;
  }

  /**
   * Marks all notifications as read for a user
   */
  public async markAllAsRead(userId: string): Promise<boolean> {
    if (!this.db) return false;

    await executeMutation(
      this.db,
      'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );

    return true;
  }

  /**
   * Deletes a notification
   */
  public async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    if (!this.db) return false;

    await executeMutation(
      this.db,
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    return true;
  }

  /**
   * Retrieves user communication and notification preferences
   */
  public async getPreferences(userId: string): Promise<UserNotificationPreferencesRow> {
    const defaultPrefs: UserNotificationPreferencesRow = {
      user_id: userId,
      assessment_reminders: 1,
      ai_report_alerts: 1,
      billing_alerts: 1,
      product_updates: 1,
      marketing_emails: 0,
      updated_at: new Date().toISOString()
    };

    if (!this.db) return defaultPrefs;

    const row = await fetchFirst<UserNotificationPreferencesRow>(
      this.db,
      'SELECT * FROM user_notification_preferences WHERE user_id = ?',
      [userId]
    );

    return row || defaultPrefs;
  }

  /**
   * Updates user communication and notification preferences
   */
  public async updatePreferences(
    userId: string,
    prefs: Partial<Omit<UserNotificationPreferencesRow, 'user_id' | 'updated_at'>>
  ): Promise<void> {
    if (!this.db) throw new ValidationError('Database not configured');

    const current = await this.getPreferences(userId);
    const updated: UserNotificationPreferencesRow = {
      user_id: userId,
      assessment_reminders: prefs.assessment_reminders !== undefined ? prefs.assessment_reminders : current.assessment_reminders,
      ai_report_alerts: prefs.ai_report_alerts !== undefined ? prefs.ai_report_alerts : current.ai_report_alerts,
      billing_alerts: prefs.billing_alerts !== undefined ? prefs.billing_alerts : current.billing_alerts,
      product_updates: prefs.product_updates !== undefined ? prefs.product_updates : current.product_updates,
      marketing_emails: prefs.marketing_emails !== undefined ? prefs.marketing_emails : current.marketing_emails,
      updated_at: new Date().toISOString()
    };

    await executeMutation(
      this.db,
      `INSERT INTO user_notification_preferences (
        user_id, assessment_reminders, ai_report_alerts, billing_alerts, product_updates, marketing_emails, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        assessment_reminders = excluded.assessment_reminders,
        ai_report_alerts = excluded.ai_report_alerts,
        billing_alerts = excluded.billing_alerts,
        product_updates = excluded.product_updates,
        marketing_emails = excluded.marketing_emails,
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        updated.assessment_reminders,
        updated.ai_report_alerts,
        updated.billing_alerts,
        updated.product_updates,
        updated.marketing_emails
      ]
    );

    this.logger.info('Notification preferences updated', { userId });
  }
}
