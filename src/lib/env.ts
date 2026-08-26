import { z } from 'zod';
import type { Env } from '@/types/env';

const serverEnvSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:4321'),
  SITE_NAME: z.string().default('MindMetrics'),
  AUTH_SECRET: z.string().optional()
});

export type ValidatedEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates and safely retrieves environment variables from Astro / Cloudflare runtime
 */
export function getValidatedEnv(runtimeEnv?: Env): ValidatedEnv {
  const raw = {
    APP_ENV: runtimeEnv?.APP_ENV || process.env.APP_ENV || 'development',
    APP_URL: runtimeEnv?.APP_URL || process.env.APP_URL || 'http://localhost:4321',
    SITE_NAME: runtimeEnv?.SITE_NAME || process.env.SITE_NAME || 'MindMetrics',
    AUTH_SECRET: runtimeEnv?.AUTH_SECRET || process.env.AUTH_SECRET
  };

  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    console.warn('Environment validation warning:', result.error.format());
    return {
      APP_ENV: 'development',
      APP_URL: 'http://localhost:4321',
      SITE_NAME: 'MindMetrics'
    };
  }

  return result.data;
}
