import {afterEach, describe, expect, it, vi} from 'vitest';
import {ApiError, apiFetch} from '@/lib/api/client';

describe('apiFetch rate-limit contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves Django 429 code and numeric retry_after', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            message: 'throttled',
            code: 'otp_rate_limited',
            retry_after: 17
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '17'
            }
          }
        )
      )
    );

    try {
      await apiFetch('/test');
      throw new Error('Expected apiFetch to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 429,
        code: 'otp_rate_limited',
        retryAfter: 17
      });
    }
  });

  it('normalizes an edge 429 to generic rate_limited with null retryAfter', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({message: 'edge throttled', retry_after: null}),
          {status: 429, headers: {'Content-Type': 'application/json'}}
        )
      )
    );

    try {
      await apiFetch('/test');
      throw new Error('Expected apiFetch to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 429,
        code: 'rate_limited',
        retryAfter: null
      });
    }
  });
});
