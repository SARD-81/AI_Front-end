import 'server-only';
import {cookies} from 'next/headers';
import {AUTH_COOKIE_FALLBACK, cookieMaxAgeFromToken} from '@/lib/server/jwt-expiry';

const ACCESS_COOKIE = 'sbu_access';
const REFRESH_COOKIE = 'sbu_refresh';

type AuthCookieEnvironment = {
  AUTH_COOKIE_SECURE?: string;
  NODE_ENV?: string;
};

export function resolveAuthCookieSecure(
  env: AuthCookieEnvironment = process.env
): boolean {
  const override = env.AUTH_COOKIE_SECURE?.trim().toLowerCase();

  if (override === 'true') return true;
  if (override === 'false') return false;

  return env.NODE_ENV === 'production';
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: resolveAuthCookieSecure(),
    path: '/'
  };
}

export async function getAuthCookies(): Promise<{access?: string; refresh?: string}> {
  const store = await cookies();
  return {
    access: store.get(ACCESS_COOKIE)?.value,
    refresh: store.get(REFRESH_COOKIE)?.value
  };
}

export async function setAuthCookies(tokens: {access: string; refresh?: string}): Promise<void> {
  const store = await cookies();
  const cookieOptions = getCookieOptions();

  store.set(ACCESS_COOKIE, tokens.access, {
    ...cookieOptions,
    maxAge: cookieMaxAgeFromToken(tokens.access, AUTH_COOKIE_FALLBACK.access)
  });
  if (tokens.refresh) {
    store.set(REFRESH_COOKIE, tokens.refresh, {
      ...cookieOptions,
      maxAge: cookieMaxAgeFromToken(tokens.refresh, AUTH_COOKIE_FALLBACK.refresh)
    });
  }
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
