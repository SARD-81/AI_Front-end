import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getTrustedClientIpMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/client-ip', () => ({
  getTrustedClientIp: getTrustedClientIpMock
}));

import { ApiError } from '@/lib/server/backend-types';
import { backendFetch, backendFetchResult } from '@/lib/server/backend-fetch';

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
      vi.fn(
        async () =>
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
      await backendFetch('/register/request-otp/', { base: 'auth' });
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
      vi.fn(async () => new Response('', { status: 429 }))
    );

    try {
      await backendFetch('/register/request-otp/', { base: 'auth' });
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
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        const outgoing = new Headers(init?.headers);
        expect(outgoing.get('x-real-ip')).toBe('203.0.113.7');
        expect(outgoing.get('x-forwarded-for')).toBe('203.0.113.7');
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    );
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

  it('returns a healthy JSON body without reading past the response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
      )
    );

    await expect(backendFetch('/health/', { base: 'api' })).resolves.toEqual({
      ok: true
    });
  });

  it('fails a slow backend with backend_timeout and aborts the request', async () => {
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(
              init.signal?.reason ?? new DOMException('timeout', 'TimeoutError')
            );
          });
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      backendFetch('/health/', { base: 'api', timeoutMs: 30 })
    ).rejects.toMatchObject({ status: 504, code: 'backend_timeout' });
  });

  it('reports a caller abort separately from the server timeout', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      backendFetch('/health/', {
        base: 'api',
        signal: controller.signal,
        timeoutMs: 5_000
      })
    ).rejects.toMatchObject({ status: 499, code: 'request_aborted' });
  });

  it('stops reading a chunked response that exceeds the byte ceiling', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('x'.repeat(40)));
        controller.enqueue(new TextEncoder().encode('y'.repeat(40)));
        controller.close();
      }
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(stream, { status: 200 }))
    );

    await expect(
      backendFetch('/health/', { base: 'api', maxResponseBytes: 50 })
    ).rejects.toMatchObject({
      status: 502,
      code: 'backend_response_too_large'
    });
  });

  it('keeps an empty 204 and a backend 400 instead of renaming them', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 }))
    );
    await expect(
      backendFetchResult('/health/', { base: 'api' })
    ).resolves.toEqual({
      status: 204,
      data: null
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: 'bad', code: 'invalid' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
      )
    );
    await expect(
      backendFetch('/login/', { base: 'auth' })
    ).rejects.toMatchObject({
      status: 400,
      code: 'invalid'
    });
  });

  it('classifies a timeout that starts after response headers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"partial":'));
            const fail = () =>
              controller.error(
                init?.signal?.reason ??
                  new DOMException('timeout', 'TimeoutError')
              );
            if (init?.signal?.aborted) fail();
            else init?.signal?.addEventListener('abort', fail, { once: true });
          }
        });
        return Promise.resolve(new Response(stream, { status: 200 }));
      })
    );

    await expect(
      backendFetch('/health/', { base: 'api', timeoutMs: 40 })
    ).rejects.toMatchObject({ status: 504, code: 'backend_timeout' });
  });

  it('classifies a caller abort after response headers as request_aborted', async () => {
    const user = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"partial":'));
            const fail = () =>
              controller.error(new DOMException('aborted', 'AbortError'));
            init?.signal?.addEventListener('abort', fail, { once: true });
            setTimeout(() => user.abort(), 20);
          }
        });
        return Promise.resolve(new Response(stream, { status: 200 }));
      })
    );

    await expect(
      backendFetch('/health/', {
        base: 'api',
        signal: user.signal,
        timeoutMs: 5_000
      })
    ).rejects.toMatchObject({ status: 499, code: 'request_aborted' });
  });

  it('does not label a backend stream error as a timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{'));
            controller.error(new Error('backend exploded'));
          }
        });
        return new Response(stream, { status: 200 });
      })
    );

    await expect(
      backendFetch('/health/', { base: 'api', timeoutMs: 5_000 })
    ).rejects.toThrow('backend exploded');
  });
});
