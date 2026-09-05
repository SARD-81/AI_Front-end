import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const getTrustedClientIpMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/client-ip', () => ({
  getTrustedClientIp: getTrustedClientIpMock
}));

import {ApiError} from '@/lib/server/backend-types';
import {backendFetch} from '@/lib/server/backend-fetch';

describe('backendFetch hardening contract', () => {
  beforeEach(() => {
    vi.stubEnv('BACKEND_ORIGIN', 'http://backend.test');
    getTrustedClientIpMock.mockReset();
    getTrustedClientIpMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('preserves a Django 429 code and Retry-After metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            message: 'throttled',
            code: 'otp_rate_limited',
            retry_after: 23
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '23'
            }
          }
        )
      )
    );

    try {
      await backendFetch('/register/request-otp/', {base: 'auth'});
      throw new Error('Expected backendFetch to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 429,
        code: 'otp_rate_limited',
        retryAfter: 23
      });
    }
  });

  it('normalizes an edge 429 to rate_limited with nullable retry metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', {status: 429}))
    );

    try {
      await backendFetch('/register/request-otp/', {base: 'auth'});
      throw new Error('Expected backendFetch to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 429,
        code: 'rate_limited',
        retryAfter: null
      });
    }
  });

  it('overwrites caller forwarding headers with the trusted proxy client IP', async () => {
    getTrustedClientIpMock.mockResolvedValue('203.0.113.7');
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const outgoing = new Headers(init?.headers);
      expect(outgoing.get('x-real-ip')).toBe('203.0.113.7');
      expect(outgoing.get('x-forwarded-for')).toBe('203.0.113.7');
      return new Response(JSON.stringify({ok: true}), {
        status: 200,
        headers: {'Content-Type': 'application/json'}
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await backendFetch('/health/', {
      base: 'api',
      headers: {
        'X-Real-IP': '198.51.100.10',
        'X-Forwarded-For': '198.51.100.10, 192.0.2.1'
      }
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
