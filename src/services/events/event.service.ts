import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { EmailService } from '../email.service';
import { NotificationService } from '../notifications/notification.service';
import type { EmailEventKey } from '@/types/database';

export interface EventUserContext {
  id?: string;
  email: string;
  name?: string;
}

export type ApplicationEvent =
  | 'USER_SIGNUP'
  | 'USER_REGISTERED'
  | 'EMAIL_VERIFICATION'
  | 'EMAIL_VERIFIED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_CHANGED'
  | 'ACCOUNT_DELETION_REQUESTED'
  | 'ACCOUNT_DELETED'
  | 'ASSESSMENT_COMPLETED'
  | 'RESULT_AVAILABLE'
  | 'AI_REPORT_READY'
  | 'AI_REPORT_FAILED'
  | 'CREDITS_PURCHASED'
  | 'CREDITS_PURCHASE_FAILED'
  | 'CREDITS_LOW_BALANCE'
  | 'CREDITS_RECEIPT'
  | 'SUBSCRIPTION_STARTED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'SECURITY_ALERT'
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
    payload: Record<string, any> = {},
    idempotencyKey?: string | null
  ): Promise<{ emailDispatched: boolean; notificationCreated: boolean }> {
    const userId = user.id;
    const recipientEmail = user.email;
    const userName = user.name || 'Explorer';

    const mergedVariables: Record<string, any> = {
      user_name: userName,
      user_email: recipientEmail,
      ...payload
    };

    let emailDispatched = false;
    let notificationCreated = false;

    switch (event) {
      // 1. Account & Security Events (Mandatory)
      case 'USER_SIGNUP':
      case 'USER_REGISTERED': {
        if (payload.verification_url || payload.verify_url) {
          emailDispatched = await this.emailService.sendEmail({
            event: 'user.email_verification',
            recipient: recipientEmail,
            variables: { ...mergedVariables, verification_url: payload.verification_url || payload.verify_url },
            userId,
            idempotencyKey,
            bypassPreferences: true
          });
        } else {
          emailDispatched = await this.emailService.sendEmail({
            event: 'user.signup',
            recipient: recipientEmail,
            variables: mergedVariables,
            userId,
            idempotencyKey,
            bypassPreferences: true
          });
        }
        break;
      }

      case 'EMAIL_VERIFIED': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'user.account_ready',
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey,
          bypassPreferences: true
        });
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'system',
            'Account Verified ✓',
            'Your Psychology Calculator account is fully active and ready.',
            '/dashboard'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'PASSWORD_RESET_REQUESTED': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'user.password_reset',
          recipient: recipientEmail,
          variables: { ...mergedVariables, reset_url: payload.reset_url },
          userId,
          idempotencyKey,
          bypassPreferences: true
        });
        break;
      }

      case 'PASSWORD_CHANGED': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'user.password_changed',
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey,
          bypassPreferences: true
        });
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'system',
            'Password Updated',
            'The password for your account was recently updated.',
            '/dashboard/settings/profile'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'ACCOUNT_DELETION_REQUESTED': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'account.deletion_requested',
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey,
          bypassPreferences: true
        });
        break;
      }

      case 'ACCOUNT_DELETED': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'account.deleted',
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey,
          bypassPreferences: true
        });
        break;
      }

      case 'SECURITY_ALERT': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'security.alert',
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey,
          bypassPreferences: true
        });
        break;
      }

      // 2. Assessment Events
      case 'ASSESSMENT_COMPLETED': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'assessment.completed',
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey
        });
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'assessment_completed',
            `Completed: ${payload.assessment_name || 'Assessment'}`,
            `Your score breakdown and primary archetype are ready to explore.`,
            payload.result_url || '/dashboard/history'
          );
          notificationCreated = true;
        }
        break;
      }

      // 3. AI Report Events
      case 'AI_REPORT_READY': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'report.ready',
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey
        });
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'ai_report_ready',
            `Report Ready: ${payload.assessment_name || 'Assessment'}`,
            'Your deep psychometric interpretation and recommendations are ready to review.',
            payload.report_url || '/dashboard/reports'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'AI_REPORT_FAILED': {
        const refundMsg = payload.credits_refunded
          ? `Your ${payload.credits_refunded} spent credits have been returned to your account balance.`
          : 'No credits were deducted from your balance.';

        emailDispatched = await this.emailService.sendEmail({
          event: 'report.failed',
          recipient: recipientEmail,
          variables: { ...mergedVariables, credit_refund_message: refundMsg },
          userId,
          idempotencyKey
        });
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'ai_report_failed',
            'Report Generation Issue',
            `We were unable to synthesize your report. ${refundMsg}`,
            '/dashboard/reports'
          );
          notificationCreated = true;
        }
        break;
      }

      // 4. Credits & Billing Events
      case 'CREDITS_PURCHASED':
      case 'PAYMENT_SUCCESS': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'credits.purchase_success',
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey
        });
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'subscription_updated',
            `Credits Added: ${payload.credits_purchased || 'Credits Added'}`,
            `Your balance is now ${payload.credits_balance || 'updated'} credits.`,
            '/dashboard'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'CREDITS_PURCHASE_FAILED':
      case 'PAYMENT_FAILED': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'credits.purchase_failed',
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey
        });
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'payment_failed',
            'Credit Purchase Issue',
            'Your recent payment attempt could not be completed. You were not charged.',
            '/account/credits'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'CREDITS_LOW_BALANCE': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'credits.low_balance',
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey
        });
        break;
      }

      case 'CREDITS_RECEIPT': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'credits.receipt',
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey
        });
        break;
      }

      case 'SUBSCRIPTION_STARTED': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'subscription_started' as EmailEventKey,
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey
        });
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'subscription_updated',
            `Plan Activated: ${payload.plan_name || 'Psychology Calculator Pro'}`,
            'You have unlocked unlimited assessments and detailed AI reports.',
            '/dashboard'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'SUBSCRIPTION_CANCELLED': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'subscription_cancelled' as EmailEventKey,
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey
        });
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'subscription_updated',
            'Subscription Cancellation Scheduled',
            'Your features will remain active until the end of your billing cycle.',
            '/dashboard/settings/billing'
          );
          notificationCreated = true;
        }
        break;
      }

      case 'SUBSCRIPTION_EXPIRED': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'subscription_expired' as EmailEventKey,
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey
        });
        if (userId) {
          await this.notificationService.createNotification(
            userId,
            'subscription_updated',
            'Subscription Expired',
            'Your account has reverted to the standard tier.',
            '/pricing'
          );
          notificationCreated = true;
        }
        break;
      }

      // 5. System & Inquiries
      case 'CONTACT_FORM_RECEIVED': {
        emailDispatched = await this.emailService.sendEmail({
          event: 'contact_form_received' as EmailEventKey,
          recipient: recipientEmail,
          variables: mergedVariables,
          userId,
          idempotencyKey
        });
        break;
      }

      default: {
        this.logger.warn('Unknown application event dispatched', { event });
        break;
      }
    }

    this.logger.info('Application event processed', { event, recipientEmail, emailDispatched, notificationCreated });
    return { emailDispatched, notificationCreated };
  }
}
