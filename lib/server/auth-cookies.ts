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

export async function getAuthCookies(): Promise<{access?: string; refresh?: string}> {
  const store = await cookies();
  return {
    access: store.get(ACCESS_COOKIE)?.value,
    refresh: store.get(REFRESH_COOKIE)?.value
  };
}

export async function setAuthCookies(tokens: {access: string; refresh?: string}): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.access, cookieOptions);
  if (tokens.refresh) {
    store.set(REFRESH_COOKIE, tokens.refresh, cookieOptions);
  }
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
