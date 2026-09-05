import {describe, expect, it} from 'vitest';
import {ApiError} from '@/lib/server/backend-types';
import {routeErrorResponse} from '@/lib/server/route-error';

describe('routeErrorResponse rate-limit contract', () => {
  it('forwards Django code, retry_after and Retry-After header', async () => {
    const response = routeErrorResponse(
      new ApiError(
        'backend throttle text',
        429,
        'otp_rate_limited',
        {retry_after: 31},
        31
      )
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('31');
    expect(await response.json()).toEqual({
      message: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.',
      code: 'otp_rate_limited',
      retry_after: 31
    });
  });

  it('keeps edge retry_after explicitly nullable', async () => {
    const response = routeErrorResponse(
      new ApiError('edge throttle text', 429, 'rate_limited', undefined, null)
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeNull();
    expect(await response.json()).toEqual({
      message: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.',
      code: 'rate_limited',
      retry_after: null
    });
  });
});
