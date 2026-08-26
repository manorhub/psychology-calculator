import type { ApiErrorResponse } from '@/types/api';

/**
 * Base Application Error
 */
export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly code: string;
  public readonly details?: Record<string, unknown> | Array<unknown>;

  constructor(message: string, details?: Record<string, unknown> | Array<unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  public toApiResponse(): ApiErrorResponse {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {})
    };
  }
}

export class BadRequestError extends AppError {
  public readonly statusCode = 400;
  public readonly code = 'BAD_REQUEST';

  constructor(message: string = 'Bad request') {
    super(message);
  }
}

export class ValidationError extends AppError {
  public readonly statusCode = 400;
  public readonly code = 'VALIDATION_ERROR';
}

export class NotFoundError extends AppError {
  public readonly statusCode = 404;
  public readonly code = 'NOT_FOUND';

  constructor(resource: string = 'Resource', id?: string) {
    super(id ? `${resource} with id '${id}' not found` : `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  public readonly statusCode = 401;
  public readonly code = 'UNAUTHORIZED';

  constructor(message: string = 'Authentication required') {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  public readonly statusCode = 403;
  public readonly code = 'FORBIDDEN';

  constructor(message: string = 'Access denied') {
    super(message);
  }
}

export class ConflictError extends AppError {
  public readonly statusCode = 409;
  public readonly code = 'CONFLICT';
}

export class InternalError extends AppError {
  public readonly statusCode = 500;
  public readonly code = 'INTERNAL_SERVER_ERROR';

  constructor(message: string = 'An unexpected error occurred') {
    super(message);
  }
}

export class ExternalServiceError extends AppError {
  public readonly statusCode = 502;
  public readonly code = 'EXTERNAL_SERVICE_ERROR';

  constructor(serviceName: string = 'External Service', message: string = 'External service request failed') {
    super(`${serviceName}: ${message}`);
  }
}

export class ServiceUnavailableError extends AppError {
  public readonly statusCode = 503;
  public readonly code = 'SERVICE_UNAVAILABLE';
}

/**
 * Formats any caught error into a safe ApiErrorResponse without leaking internal paths or secrets
 */
export function formatErrorResponse(err: unknown): { statusCode: number; body: ApiErrorResponse } {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      body: err.toApiResponse()
    };
  }

  // Generic fallback for unknown errors
  return {
    statusCode: 500,
    body: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please try again later.'
    }
  };
}
