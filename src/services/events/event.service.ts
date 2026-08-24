import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { EmailService } from '../email.service';
import { NotificationService } from '../notifications/notification.service';

export interface EventUserContext {
  id?: string;
  email: string;
  name?: string;
}

export type ApplicationEvent =
  | 'USER_REGISTERED'
  | 'EMAIL_VERIFIED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_CHANGED'
  | 'ACCOUNT_DELETED'
  | 'ASSESSMENT_COMPLETED'
  | 'RESULT_AVAILABLE'
  | 'AI_REPORT_READY'
  | 'AI_REPORT_FAILED'
  | 'SUBSCRIPTION_STARTED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'CONTACT_FORM_RECEIVED';

export class EventService extends BaseService {
  private readonly emailService: EmailService;
  private readonly notificationService: NotificationService;

  constructor(db?: D1Database | null, emailService?: EmailService, notificationService?: NotificationService) {
    super('EventService');
    this.emailService = emailService || new EmailService(db);
    this.notificationService = notificationService || new NotificationService(db);
  }

  /**
   * Centralized event dispatcher that checks user preferences and triggers email and in-app notifications
   */
  public async dispatch(
    event: ApplicationEvent,
    user: EventUserContext,
    payload: Record<string, string> = {}
  ): Promise<{ emailDispatched: boolean; notificationCreated: boolean }> {
    const userId = user.id;
    const recipientEmail = user.email;
    const userName = user.name || 'Explorer';

    const mergedVariables: Record<string, string> = {
      user_name: userName,
      user_email: recipientEmail,
      ...payload
    };

    // Load user notification preferences if user exists
    let prefs = userId ? await this.notificationService.getPreferences(userId) : null;

    let emailDispatched = false;
    let notificationCreated = false;

    switch (event) {
      // 1. Account Security (Mandatory — cannot be disabled by user)
      case 'USER_REGISTERED': {
        if (payload.verify_url) {
          emailDispatched = await this.emailService.sendTemplate(
            'email_verification',
            recipientEmail,
            mergedVariables,
            userId
          );
        } else {
          emailDispatched = await this.emailService.sendTemplate('welcome', recipientEmail, mergedVariables, userId);
        }
        break;
      }

      case 'EMAIL_VERIFIED': {
        emailDispatched = await this.emailService.sendTemplate('welcome', recipientEmail, mergedVariables, userId);
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'system',
            'Account Verified ✓',
            'Your Psychology Calculator account is fully active.',
            '/dashboard'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'PASSWORD_RESET_REQUESTED': {
        emailDispatched = await this.emailService.sendTemplate(
          'password_reset',
          recipientEmail,
          mergedVariables,
          userId
        );
        break;
      }

      case 'PASSWORD_CHANGED': {
        emailDispatched = await this.emailService.sendTemplate(
          'password_changed',
          recipientEmail,
          mergedVariables,
          userId
        );
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'system',
            'Password Updated',
            'The password for your account was recently changed.',
            '/dashboard/settings/profile'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'ACCOUNT_DELETED': {
        emailDispatched = await this.emailService.sendTemplate(
          'account_deleted',
          recipientEmail,
          mergedVariables,
          userId
        );
        break;
      }

      // 2. Assessment Events
      case 'ASSESSMENT_COMPLETED': {
        if (!prefs || prefs.assessment_reminders === 1) {
          emailDispatched = await this.emailService.sendTemplate(
            'assessment_completed',
            recipientEmail,
            mergedVariables,
            userId
          );
        }
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'assessment_completed',
            `Completed: ${payload.assessment_name || 'Assessment'}`,
            `Your score breakdown and primary archetype are ready.`,
            payload.result_url || '/dashboard/history'
          );
          notificationCreated = true;
        }
        break;
      }

      // 3. AI Report Events
      case 'AI_REPORT_READY': {
        if (!prefs || prefs.ai_report_alerts === 1) {
          emailDispatched = await this.emailService.sendTemplate(
            'ai_report_ready',
            recipientEmail,
            mergedVariables,
            userId
          );
        }
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'ai_report_ready',
            `AI Report Ready: ${payload.assessment_name || 'Assessment'}`,
            'Your deep psychometric interpretation and recommendations are ready to review.',
            payload.report_url || '/dashboard/reports'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'AI_REPORT_FAILED': {
        if (!prefs || prefs.ai_report_alerts === 1) {
          emailDispatched = await this.emailService.sendTemplate(
            'ai_report_failed',
            recipientEmail,
            mergedVariables,
            userId
          );
        }
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'ai_report_failed',
            'AI Report Generation Issue',
            'We encountered a processing issue generating your report. Credits were refunded.',
            '/dashboard/reports'
          );
          notificationCreated = true;
        }
        break;
      }

      // 4. Billing Events
      case 'SUBSCRIPTION_STARTED': {
        if (!prefs || prefs.billing_alerts === 1) {
          emailDispatched = await this.emailService.sendTemplate(
            'subscription_started',
            recipientEmail,
            mergedVariables,
            userId
          );
        }
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'subscription_updated',
            `Pro Plan Activated: ${payload.plan_name || 'Psychology Calculator Pro'}`,
            'You have unlocked unlimited assessments and detailed AI reports.',
            '/dashboard'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'SUBSCRIPTION_CANCELLED': {
        if (!prefs || prefs.billing_alerts === 1) {
          emailDispatched = await this.emailService.sendTemplate(
            'subscription_cancelled',
            recipientEmail,
            mergedVariables,
            userId
          );
        }
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'subscription_updated',
            'Subscription Cancellation Scheduled',
            'Your Pro features will remain active until the end of your billing period.',
            '/dashboard/settings/billing'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'SUBSCRIPTION_EXPIRED': {
        if (!prefs || prefs.billing_alerts === 1) {
          emailDispatched = await this.emailService.sendTemplate(
            'subscription_expired',
            recipientEmail,
            mergedVariables,
            userId
          );
        }
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'subscription_updated',
            'Subscription Expired',
            'Your account has reverted to the Free Explorer tier.',
            '/pricing'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'PAYMENT_FAILED': {
        emailDispatched = await this.emailService.sendTemplate(
          'payment_failed',
          recipientEmail,
          mergedVariables,
          userId
        );
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'payment_failed',
            'Payment Processing Failed',
            'Please update your payment method to avoid service interruption.',
            payload.billing_url || '/dashboard/settings/billing'
          );
          notificationCreated = true;
        }
        break;
      }

      // 5. System & Contact
      case 'CONTACT_FORM_RECEIVED': {
        emailDispatched = await this.emailService.sendTemplate(
          'contact_form_received',
          recipientEmail,
          mergedVariables,
          userId
        );
        break;
      }

      default: {
        this.logger.warn('Unknown application event dispatched', { event });
        break;
      }
    }

    this.logger.info('Event processed', { event, recipientEmail, emailDispatched, notificationCreated });
    return { emailDispatched, notificationCreated };
  }
}
