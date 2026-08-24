import type { User } from '@/types/auth';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

export interface GuardLocals {
  user?: User | null;
  [key: string]: unknown;
}

/**
 * Asserts that the request is authenticated by a valid user.
 * Throws UnauthorizedError if not logged in, or ForbiddenError if account is suspended/deleted.
 */
export function requireUser(locals: GuardLocals | App.Locals): User {
  const user = locals.user as User | null | undefined;

  if (!user) {
    throw new UnauthorizedError('Authentication required. Please sign in.');
  }

  if (user.status === 'suspended') {
    throw new ForbiddenError('Your account has been suspended. Please contact support.');
  }

  if (user.status === 'deleted') {
    throw new UnauthorizedError('Invalid user session.');
  }

  return user;
}

/**
 * Asserts that the request is authenticated by an active administrator.
 * Throws UnauthorizedError if not logged in, or ForbiddenError if not an admin.
 */
export function requireAdmin(locals: GuardLocals | App.Locals): User {
  const user = requireUser(locals);

  if (user.role !== 'admin') {
    throw new ForbiddenError('Access Denied: Administrator privileges required.');
  }

  return user;
}
