import type { UserRole, UserStatus } from './database';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    timezone: string;
    locale: string;
    preferences: Record<string, unknown>;
  };
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Session {
  id: string;
  userId: string;
  user: User;
  expiresAt: Date;
}

export type Permission =
  | 'admin:access'
  | 'assessments:read'
  | 'assessments:write'
  | 'users:manage'
  | 'settings:manage'
  | 'reports:read_all';

export interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPermission: (permission: Permission) => boolean;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  sessionToken?: string;
  requiresEmailVerification?: boolean;
  message?: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}
