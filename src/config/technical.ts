/**
 * Technical / Developer Static Configuration
 * These values are fixed by the codebase/infrastructure and NOT editable by Admin.
 */
export const TECHNICAL_CONFIG = {
  version: '0.1.0',
  apiPrefix: '/api/v1',
  maxUploadSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedUploadMimeTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp'
  ],
  security: {
    rateLimitRequestsPerMinute: 60,
    sessionCookieName: 'mm_session',
    sessionMaxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
  },
  cacheControl: {
    staticAssets: 'public, max-age=31536000, immutable',
    dynamicPages: 'public, max-age=0, must-revalidate',
    apiNoCache: 'no-store, no-cache, must-revalidate, proxy-revalidate'
  }
} as const;
