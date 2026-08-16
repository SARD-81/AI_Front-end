import 'server-only';
import {cookies} from 'next/headers';

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

// Explicit lifetimes so the session survives browser restarts and the
// cookies don't silently outlive the tokens they carry.
const ACCESS_COOKIE_MAX_AGE = 60 * 60; // 60 minutes (backend access token TTL)
const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours (backend refresh token TTL)

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
    maxAge: ACCESS_COOKIE_MAX_AGE
  });
  if (tokens.refresh) {
    store.set(REFRESH_COOKIE, tokens.refresh, {
      ...cookieOptions,
      maxAge: REFRESH_COOKIE_MAX_AGE
    });
  }
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
