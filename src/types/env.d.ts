/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type D1Database = import('@cloudflare/workers-types').D1Database;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

export interface Env {
  // Cloudflare D1 Database Binding
  DB?: D1Database;
  // Cloudflare R2 Storage Binding
  STORAGE?: R2Bucket;
  // Environment variables
  APP_ENV?: string;
  APP_URL?: string;
  SITE_NAME?: string;
  AUTH_SECRET?: string;
  [key: string]: unknown;
}

declare global {
  namespace App {
    interface Locals {
      runtime?: {
        env: Env;
        cf?: unknown;
        ctx?: {
          waitUntil: (promise: Promise<unknown>) => void;
          passThroughOnException: () => void;
        };
      };
      user?: import('@/types/auth').User | null;
      requestId: string;
    }
  }
}
