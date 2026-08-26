import type { User } from './auth';

/**
 * Standardized API Response Envelope
 * All API routes should return this format for consistency.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
  meta?: ApiMeta;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown> | Array<unknown>;
}

export interface ApiMeta {
  requestId?: string;
  timestamp: string;
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export interface AppLocals {
  requestId?: string;
  user?: User | null;
  runtime?: {
    env?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  timestamp: string;
  services: {
    d1: {
      status: 'connected' | 'disconnected' | 'mock';
      latencyMs?: number;
    };
    r2: {
      status: 'connected' | 'disconnected' | 'mock';
    };
  };
}
