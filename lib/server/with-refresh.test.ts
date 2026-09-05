import {beforeEach, describe, expect, it, vi} from 'vitest';

const getAuthCookiesMock = vi.hoisted(() => vi.fn());
const setAuthCookiesMock = vi.hoisted(() => vi.fn());
const clearAuthCookiesMock = vi.hoisted(() => vi.fn());
const backendFetchMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/auth-cookies', () => ({
  getAuthCookies: getAuthCookiesMock,
  setAuthCookies: setAuthCookiesMock,
  clearAuthCookies: clearAuthCookiesMock
}));
vi.mock('@/lib/server/backend-fetch', () => ({backendFetch: backendFetchMock}));

import {ApiError} from '@/lib/server/backend-types';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

describe('callWithAutoRefresh error preservation', () => {
  beforeEach(() => {
    getAuthCookiesMock.mockReset();
    setAuthCookiesMock.mockReset();
    clearAuthCookiesMock.mockReset();
    backendFetchMock.mockReset();
    setAuthCookiesMock.mockResolvedValue(undefined);
    clearAuthCookiesMock.mockResolvedValue(undefined);
  });

  it('preserves endpoint 429 after a successful refresh without logging out', async () => {
    getAuthCookiesMock.mockResolvedValue({access: 'stale-access', refresh: 'refresh-token'});
    backendFetchMock.mockResolvedValue({access: 'fresh-access', refresh: 'fresh-refresh'});
    const endpoint = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('expired access', 401, 'token_not_valid'))
      .mockRejectedValueOnce(
        new ApiError('throttled', 429, 'rate_limited', undefined, 12)
      );

    await expect(callWithAutoRefresh(endpoint)).rejects.toMatchObject({
      status: 429,
      code: 'rate_limited',
      retryAfter: 12
    });

    expect(endpoint).toHaveBeenNthCalledWith(1, 'stale-access');
    expect(endpoint).toHaveBeenNthCalledWith(2, 'fresh-access');
    expect(setAuthCookiesMock).toHaveBeenCalledWith({
      access: 'fresh-access',
      refresh: 'fresh-refresh'
    });
    expect(clearAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('preserves refresh-endpoint 429 and does not clear an otherwise recoverable session', async () => {
    getAuthCookiesMock.mockResolvedValue({access: 'stale-access', refresh: 'refresh-token'});
    backendFetchMock.mockRejectedValue(
      new ApiError('refresh throttled', 429, 'rate_limited', undefined, 8)
    );
    const endpoint = vi
      .fn()
      .mockRejectedValue(new ApiError('expired access', 401, 'token_not_valid'));

    await expect(callWithAutoRefresh(endpoint)).rejects.toMatchObject({
      status: 429,
      code: 'rate_limited',
      retryAfter: 8
    });
    expect(clearAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('clears cookies only when the refresh credentials are rejected', async () => {
    getAuthCookiesMock.mockResolvedValue({access: 'stale-access', refresh: 'invalid-refresh'});
    backendFetchMock.mockRejectedValue(
      new ApiError('refresh rejected', 401, 'token_not_valid')
    );
    const endpoint = vi
      .fn()
      .mockRejectedValue(new ApiError('expired access', 401, 'token_not_valid'));

    await expect(callWithAutoRefresh(endpoint)).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_EXPIRED'
    });
    expect(clearAuthCookiesMock).toHaveBeenCalledTimes(1);
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('clears cookies when the refreshed access token is still rejected', async () => {
    getAuthCookiesMock.mockResolvedValue({access: 'stale-access', refresh: 'refresh-token'});
    backendFetchMock.mockResolvedValue({access: 'fresh-access'});
    const endpoint = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('expired access', 401, 'token_not_valid'))
      .mockRejectedValueOnce(new ApiError('fresh access rejected', 401, 'token_not_valid'));

    await expect(callWithAutoRefresh(endpoint)).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_EXPIRED'
    });
    expect(clearAuthCookiesMock).toHaveBeenCalledTimes(1);
  });
});
