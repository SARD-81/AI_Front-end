import { beforeEach, describe, expect, it, vi } from 'vitest';

const backendFetchMock = vi.hoisted(() => vi.fn());
const setAuthCookiesMock = vi.hoisted(() => vi.fn());
const clearAuthCookiesMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/backend-fetch', () => ({
  backendFetch: backendFetchMock
}));
vi.mock('@/lib/server/auth-cookies', () => ({
  setAuthCookies: setAuthCookiesMock,
  clearAuthCookies: clearAuthCookiesMock
}));

import { POST } from '@/app/api/app/auth/login/route';

function loginRequest(origin = 'http://localhost') {
  return new Request('http://localhost/api/app/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({
      email: 'professor@sbu.ac.ir',
      password: 'Temporary123!'
    })
  });
}

describe('login BFF route', () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    setAuthCookiesMock.mockReset();
    clearAuthCookiesMock.mockReset();
  });

  it('does not turn a public email login into a session', async () => {
    const response = await POST(loginRequest());
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({
      code: 'phone_login_required'
    });
    expect(backendFetchMock).not.toHaveBeenCalled();
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('does not call the backend when the login origin is not this app', async () => {
    const response = await POST(loginRequest('https://evil.example'));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'cross_site_request' });
    expect(backendFetchMock).not.toHaveBeenCalled();
  });
});
