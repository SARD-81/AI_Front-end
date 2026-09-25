import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const cookieSetMock = vi.hoisted(() => vi.fn());
const cookieDeleteMock = vi.hoisted(() => vi.fn());
const cookieGetMock = vi.hoisted(() => vi.fn());
const cookiesMock = vi.hoisted(() =>
  vi.fn(async () => ({
    set: cookieSetMock,
    delete: cookieDeleteMock,
    get: cookieGetMock
  }))
);

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({cookies: cookiesMock}));

import {setAuthCookies} from '@/lib/server/auth-cookies';

describe('auth cookie policy', () => {
  beforeEach(() => {
    cookieSetMock.mockReset();
    cookieDeleteMock.mockReset();
    cookieGetMock.mockReset();
    cookiesMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('ignores AUTH_COOKIE_SECURE=false in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_COOKIE_SECURE', 'false');

    await setAuthCookies({access: 'access-token', refresh: 'refresh-token'});

    expect(cookieSetMock).toHaveBeenCalledTimes(2);
    expect(cookieSetMock).toHaveBeenNthCalledWith(
      1,
      'sbu_access',
      'access-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60
      })
    );
  });

  it('keeps non-Secure cookies available for local HTTP development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('AUTH_COOKIE_SECURE', 'false');

    await setAuthCookies({access: 'access-token'});

    expect(cookieSetMock).toHaveBeenCalledWith(
      'sbu_access',
      'access-token',
      expect.objectContaining({secure: false, httpOnly: true, sameSite: 'lax'})
    );
  });

  it('keeps Secure HttpOnly cookies by default in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_COOKIE_SECURE', '');

    await setAuthCookies({access: 'access-token'});

    expect(cookieSetMock).toHaveBeenCalledWith(
      'sbu_access',
      'access-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/'
      })
    );
  });

  it('uses Secure cookies when AUTH_COOKIE_SECURE=true', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('AUTH_COOKIE_SECURE', 'true');

    await setAuthCookies({access: 'access-token'});

    expect(cookieSetMock).toHaveBeenCalledWith(
      'sbu_access',
      'access-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/'
      })
    );
  });
});
