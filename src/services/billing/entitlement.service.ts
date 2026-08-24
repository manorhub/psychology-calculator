import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { SubscriptionService } from './subscription.service';
import { CreditService } from '../credit.service';
import { fetchFirst } from '@/lib/db/query';

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPlan?: string;
  currentBalance?: number;
}

export class EntitlementService extends BaseService {
  private readonly db: D1Database | null;
  private readonly subscriptionService: SubscriptionService;
  private readonly creditService: CreditService;

  constructor(db: D1Database | null) {
    super('EntitlementService');
    this.db = db;
    this.subscriptionService = new SubscriptionService(db);
    this.creditService = new CreditService(db);
  }

  /**
   * Evaluates if a user is entitled to a specific dynamic feature key
   */
  public async hasFeature(userId: string | null | undefined, featureKey: string): Promise<boolean> {
    if (!userId) return false;

    // Check if user is Admin / Super Admin (automatic entitlement)
    if (this.db) {
      const user = await fetchFirst<{ role: string }>(this.db, 'SELECT role FROM users WHERE id = ?', [userId]);
      if (user && (user.role === 'admin' || (user.role as string) === 'super_admin')) {
        return true;
      }
    }

    const summary = await this.subscriptionService.getUserSubscriptionSummary(userId);
    return Boolean(summary.entitlements[featureKey]);
  }

  /**
   * Evaluates if a user can take a specific assessment
   */
  public async canTakeAssessment(
    userId: string | null | undefined,
    accessType: 'free' | 'free_guest' | 'premium' | 'registered' | 'authenticated' = 'free'
  ): Promise<EntitlementCheckResult> {
    if (accessType === 'free' || accessType === 'free_guest') {
      return { allowed: true };
    }

    if (!userId) {
      return {
        allowed: false,
        reason: 'You must create a free account to access this assessment'
      };
    }

    if (accessType === 'registered' || accessType === 'authenticated') {
      return { allowed: true };
    }

    // Premium assessment check
    const hasPremium = await this.hasFeature(userId, 'premium_assessments');
    if (hasPremium) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'This assessment requires a Psychology Calculator Pro subscription',
      requiredPlan: 'pro-monthly'
    };
  }

  /**
   * Evaluates if a user can generate a detailed AI narrative report
   */
  public async canGenerateAIReport(userId: string | null | undefined, creditCost = 5): Promise<EntitlementCheckResult> {
    if (!userId) {
      return {
        allowed: false,
        reason: 'Authentication required to synthesize AI reports'
      };
    }

    // Check direct plan entitlement
    const hasEntitlement = await this.hasFeature(userId, 'premium_ai_reports');
    if (hasEntitlement) {
      return { allowed: true };
    }

    // Check credit balance as fallback
    const balance = await this.creditService.getUserBalance(userId);
    if (balance.balance >= creditCost) {
      return { allowed: true, currentBalance: balance.balance };
    }

    return {
      allowed: false,
      reason: `Generating in-depth AI reports requires Pro subscription or ${creditCost} AI credits (current balance: ${balance.balance})`,
      currentBalance: balance.balance,
      requiredPlan: 'pro-monthly'
    };
  }

  /**
   * Evaluates if a user can download a PDF report
   */
  public async canDownloadPdf(
    userId: string | null | undefined,
    pdfType: 'basic_result' | 'ai_report'
  ): Promise<EntitlementCheckResult> {
    if (pdfType === 'basic_result') {
      return { allowed: true };
    }

    if (!userId) {
      return {
        allowed: false,
        reason: 'Authentication required to export comprehensive AI PDF documents'
      };
    }

    const hasEntitlement = await this.hasFeature(userId, 'premium_pdf_exports');
    if (hasEntitlement) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Detailed AI PDF export is an exclusive Pro feature',
      requiredPlan: 'pro-monthly'
    };
  }

  /**
   * Retrieves full feature matrix for UI displays & user profile
   */
  public async getEntitlementsSummary(userId: string | null | undefined): Promise<Record<string, boolean>> {
    if (!userId) {
      return {
        basic_assessments: true,
        basic_results: true,
        premium_assessments: false,
        premium_ai_reports: false,
        premium_pdf_exports: false,
        priority_support: false
      };
    }

    const summary = await this.subscriptionService.getUserSubscriptionSummary(userId);
    return summary.entitlements;
  }
}
