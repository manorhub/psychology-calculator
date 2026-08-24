import type { AstroCookies } from 'astro';
import { TECHNICAL_CONFIG } from '@/config/technical';

export const SESSION_COOKIE_NAME = TECHNICAL_CONFIG.security.sessionCookieName;
const SESSION_MAX_AGE = TECHNICAL_CONFIG.security.sessionMaxAgeSeconds;

export function setSessionCookie(cookies: AstroCookies, token: string, isProduction = false): void {
  cookies.set(SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE_NAME, {
    path: '/'
  });
}

export function getSessionCookie(cookies: AstroCookies): string | undefined {
  return cookies.get(SESSION_COOKIE_NAME)?.value;
}
