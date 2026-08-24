import { z } from 'zod';
import { ValidationError } from './errors';

/**
 * Validates data against a Zod schema or throws a typed ValidationError
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message
    }));
    throw new ValidationError('Validation failed for request data', issues);
  }
  return result.data;
}

/**
 * Common reusable validation schemas
 */
export const CommonSchemas = {
  id: z.string().min(1, 'ID cannot be empty'),
  email: z.string().email('Invalid email address'),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
};
