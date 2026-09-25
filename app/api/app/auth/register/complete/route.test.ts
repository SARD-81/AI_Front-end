import { beforeEach, describe, expect, it, vi } from 'vitest';

const backendFetchMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/backend-fetch', () => ({
  backendFetch: backendFetchMock
}));

import { POST } from '@/app/api/app/auth/register/complete/route';

describe('register complete flow contract', () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
  });

  it('does not complete a public email registration', async () => {
    const response = await POST(
      new Request('http://localhost/api/app/auth/register/complete', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost'
        },
        body: JSON.stringify({ email: 'student@mail.sbu.ac.ir' })
      })
    );

    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({
      code: 'legacy_registration_disabled'
    });
    expect(backendFetchMock).not.toHaveBeenCalled();
  });
});
