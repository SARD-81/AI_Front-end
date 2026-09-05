import {beforeEach, describe, expect, it, vi} from 'vitest';

const backendFetchMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/backend-fetch', () => ({backendFetch: backendFetchMock}));

import {ApiError} from '@/lib/server/backend-types';
import {POST} from '@/app/api/app/auth/password-reset/request-otp/route';

function request(email: string) {
  return new Request('http://localhost/api/app/auth/password-reset/request-otp', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email})
  });
}

describe('password-reset request anti-enumeration', () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
  });

  it('returns the same BFF success contract regardless of backend success text', async () => {
    backendFetchMock
      .mockResolvedValueOnce({message: 'backend success variant A'})
      .mockResolvedValueOnce({message: 'backend success variant B'});

    const first = await POST(request('person@sbu.ac.ir'));
    const second = await POST(request('person@sbu.ac.ir'));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await first.json()).toEqual({ok: true});
    expect(await second.json()).toEqual({ok: true});
  });

  it('still exposes rate limiting without leaking account existence', async () => {
    backendFetchMock.mockRejectedValue(
      new ApiError('specific backend throttle', 429, 'rate_limited', undefined, null)
    );

    const response = await POST(request('person@sbu.ac.ir'));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      message: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.',
      code: 'rate_limited',
      retry_after: null
    });
  });
});
