import { BaseService } from '../base.service';
import { ExternalServiceError, ValidationError } from '@/lib/errors';

export interface CreateCheckoutOptions {
  variantId: string;
  userEmail: string;
  userName?: string;
  userId: string;
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
  customData?: Record<string, any>;
}

export interface LemonSqueezyConfig {
  apiKey?: string;
  storeId?: string;
  webhookSecret?: string;
  mode?: 'test' | 'live';
}

export class LemonSqueezyService extends BaseService {
  private readonly apiKey: string | null;
  private readonly storeId: string | null;
  private readonly webhookSecret: string | null;
  private readonly baseUrl = 'https://api.lemonsqueezy.com/v1';

  constructor(config?: LemonSqueezyConfig) {
    super('LemonSqueezyService');
    this.apiKey = config?.apiKey || null;
    this.storeId = config?.storeId || null;
    this.webhookSecret = config?.webhookSecret || null;
  }

  /**
   * Cryptographically verifies incoming Lemon Squeezy webhook HMAC-SHA256 signature
   */
  public async verifyWebhookSignature(
    rawBody: string | Uint8Array,
    signatureHeader: string | null,
    overrideSecret?: string
  ): Promise<boolean> {
    const secret = overrideSecret || this.webhookSecret;
    if (!secret || !signatureHeader) {
      this.logger.warn('Webhook signature verification failed: Missing secret or signature header');
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const secretBytes = encoder.encode(secret);
      const dataBytes = typeof rawBody === 'string' ? encoder.encode(rawBody) : rawBody;

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        secretBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      );

      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, dataBytes);
      const computedHex = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const cleanHeader = signatureHeader.toLowerCase().trim();
      return computedHex === cleanHeader;
    } catch (err) {
      this.logger.error('Error verifying HMAC webhook signature', undefined, err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  /**
   * Creates a Lemon Squeezy Hosted Checkout Session
   */
  public async createCheckout(options: CreateCheckoutOptions): Promise<{ checkoutUrl: string }> {
    const { variantId, userEmail, userName, userId, planId, successUrl, cancelUrl, customData } = options;

    if (!variantId) {
      throw new ValidationError('Lemon Squeezy variant ID is required for checkout');
    }

    // Handle test/simulated environment if API key is not configured or in test mode
    if (!this.apiKey || this.apiKey.includes('placeholder') || this.apiKey === 'test') {
      this.logger.info('Simulating Lemon Squeezy checkout session in test mode', { variantId, userId, planId });
      const simulatedUrl = `/pricing?simulated_checkout=true&variant=${encodeURIComponent(variantId)}&plan=${encodeURIComponent(planId)}&user=${encodeURIComponent(userId)}`;
      return { checkoutUrl: simulatedUrl };
    }

    const payload = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: userEmail,
            name: userName || userEmail.split('@')[0],
            custom: {
              user_id: userId,
              plan_id: planId,
              ...customData
            }
          },
          product_options: {
            redirect_url: successUrl || 'https://psychologycalculator.com/dashboard/subscription?status=success'
          }
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: this.storeId || '1'
            }
          },
          variant: {
            data: {
              type: 'variants',
              id: variantId
            }
          }
        }
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/checkouts`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Lemon Squeezy API createCheckout failed', { status: response.status, errorText });
        throw new ExternalServiceError(`Failed to initialize Lemon Squeezy checkout: ${response.statusText}`);
      }

      const json = (await response.json()) as any;
      const checkoutUrl = json?.data?.attributes?.url;

      if (!checkoutUrl) {
        throw new ExternalServiceError('Lemon Squeezy did not return a valid checkout URL');
      }

      return { checkoutUrl };
    } catch (err: any) {
      if (err instanceof ExternalServiceError) throw err;
      throw new ExternalServiceError(`Lemon Squeezy checkout connection error: ${err.message}`);
    }
  }

  /**
   * Retrieves subscription from Lemon Squeezy API
   */
  public async getSubscription(subscriptionId: string): Promise<any> {
    if (!this.apiKey || this.apiKey.includes('placeholder')) {
      return null;
    }

    const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${this.apiKey}`
      }
    });

    if (!res.ok) return null;
    return await res.json();
  }

  /**
   * Cancels a subscription in Lemon Squeezy (cancels at period end)
   */
  public async cancelSubscription(subscriptionId: string): Promise<boolean> {
    if (!this.apiKey || this.apiKey.includes('placeholder')) {
      this.logger.info('Simulated Lemon Squeezy subscription cancellation', { subscriptionId });
      return true;
    }

    try {
      const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${this.apiKey}`
        }
      });

      return res.ok || res.status === 204;
    } catch (err) {
      this.logger.error('Error cancelling subscription in Lemon Squeezy', { subscriptionId }, err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  /**
   * Retrieves Customer Portal URL
   */
  public async getCustomerPortalUrl(customerId: string): Promise<string | null> {
    if (!this.apiKey || this.apiKey.includes('placeholder')) {
      return null;
    }

    try {
      const res = await fetch(`${this.baseUrl}/customers/${customerId}`, {
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${this.apiKey}`
        }
      });

      if (!res.ok) return null;
      const data = (await res.json()) as any;
      return data?.data?.attributes?.urls?.customer_portal || null;
    } catch {
      return null;
    }
  }
}
