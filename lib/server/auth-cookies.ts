import 'server-only';
import {cookies} from 'next/headers';

const ACCESS_COOKIE = 'sbu_access';
const REFRESH_COOKIE = 'sbu_refresh';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/'
};

// Explicit lifetimes so the session survives browser restarts and the
// cookies don't silently outlive the tokens they carry.
const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day
const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getAuthCookies(): Promise<{access?: string; refresh?: string}> {
  const store = await cookies();
  return {
    access: store.get(ACCESS_COOKIE)?.value,
    refresh: store.get(REFRESH_COOKIE)?.value
  };
}

export async function setAuthCookies(tokens: {access: string; refresh?: string}): Promise<void> {
  const store = await cookies();
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