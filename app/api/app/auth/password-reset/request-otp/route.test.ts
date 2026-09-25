import { beforeEach, describe, expect, it, vi } from 'vitest';

const backendFetchMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/backend-fetch', () => ({
  backendFetch: backendFetchMock
}));

import { POST } from '@/app/api/app/auth/password-reset/request-otp/route';

function request(email: string) {
  return new Request(
    'http://localhost/api/app/auth/password-reset/request-otp',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost'
      },
      body: JSON.stringify({ email })
    }
  );
}

describe('email password reset is not a pilot recovery path', () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
  });

  it('does not call the backend or confirm that an email account exists', async () => {
    const first = await POST(request('person@sbu.ac.ir'));
    const second = await POST(request('other@sbu.ac.ir'));

    expect(first.status).toBe(410);
    expect(second.status).toBe(410);
    expect(await first.json()).toMatchObject({ code: 'phone_login_required' });
    expect(await second.json()).toMatchObject({ code: 'phone_login_required' });
    expect(backendFetchMock).not.toHaveBeenCalled();
  });
});
