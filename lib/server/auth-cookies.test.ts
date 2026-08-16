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

  it('uses non-Secure HttpOnly cookies for a production HTTP demo override', async () => {
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
        secure: false,
        path: '/',
        maxAge: 60 * 60
      })
    );
    expect(cookieSetMock).toHaveBeenNthCalledWith(
      2,
      'sbu_refresh',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: 60 * 60 * 12
      })
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
