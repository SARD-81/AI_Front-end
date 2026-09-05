import {beforeEach, describe, expect, it, vi} from 'vitest';

const backendFetchMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/backend-fetch', () => ({backendFetch: backendFetchMock}));

import {POST} from '@/app/api/app/auth/register/complete/route';

describe('register complete flow contract', () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
  });

  it('returns an explicit code when the verified registration flow is missing', async () => {
    const response = await POST(
      new Request('http://localhost/api/app/auth/register/complete', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({email: 'student@mail.sbu.ac.ir'})
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      message: 'نشست تأیید ایمیل منقضی شده است. لطفاً کد تأیید را دوباره دریافت کنید.',
      code: 'registration_flow_expired'
    });
    expect(backendFetchMock).not.toHaveBeenCalled();
  });
});
