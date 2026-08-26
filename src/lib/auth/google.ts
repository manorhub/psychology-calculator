import type { GoogleUserInfo } from '@/types/auth';
import { generateSecureToken } from '@/lib/crypto';
import { logger } from '@/lib/logger';

export interface GoogleOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri: string;
}

export class GoogleOAuthClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(config: GoogleOAuthConfig) {
    this.clientId = config.clientId || process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = config.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = config.redirectUri;
  }

  public isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Generates Google OAuth 2.0 authorization URL with a random CSRF state token
   */
  public generateAuthUrl(): { url: string; state: string } {
    const state = generateSecureToken(16);
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      state,
      prompt: 'select_account'
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state
    };
  }

  /**
   * Exchanges authorization code for Google user profile
   */
  public async exchangeCode(code: string): Promise<GoogleUserInfo> {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth is not configured. Missing client credentials.');
    }

    try {
      // 1. Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        logger.error('Google token exchange failed', { status: tokenResponse.status, errorText });
        throw new Error(`Failed to exchange Google authorization code: ${errorText}`);
      }

      const tokenData = (await tokenResponse.json()) as { access_token: string; id_token: string };

      // 2. Fetch UserInfo from OpenID Connect endpoint
      const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      if (!userInfoResponse.ok) {
        const errBody = await userInfoResponse.text();
        logger.error('Failed to fetch Google user profile', { status: userInfoResponse.status, errBody });
        throw new Error(`Failed to fetch Google user profile: ${errBody}`);
      }

      const raw = (await userInfoResponse.json()) as any;
      const id = raw.sub || raw.id || '';
      const email = raw.email || '';
      const name = raw.name || raw.given_name || (email ? email.split('@')[0] : 'User');
      const verified = raw.email_verified === true || raw.verified_email === true;

      if (!id || !email) {
        throw new Error('Incomplete Google profile returned (missing ID or email)');
      }

      const userInfo: GoogleUserInfo = {
        id,
        email,
        verified_email: verified,
        name,
        given_name: raw.given_name || '',
        family_name: raw.family_name || '',
        picture: raw.picture || '',
        locale: raw.locale || 'en'
      };

      return userInfo;
    } catch (error) {
      logger.error('Google OAuth exchange error', undefined, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
