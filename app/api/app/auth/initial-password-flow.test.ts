import {beforeEach, describe, expect, it, vi} from 'vitest';

const backendFetchMock = vi.hoisted(() => vi.fn());
const setAuthCookiesMock = vi.hoisted(() => vi.fn());
const clearAuthCookiesMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/backend-fetch', () => ({
  backendFetch: backendFetchMock
}));

vi.mock('@/lib/server/auth-cookies', () => ({
  setAuthCookies: setAuthCookiesMock,
  clearAuthCookies: clearAuthCookiesMock
}));

import {POST as login} from '@/app/api/app/auth/login/route';
import {POST as setInitialPassword} from '@/app/api/app/auth/set-initial-password/route';

function jsonRequest(path: string, body: Record<string, unknown>) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body)
  });
}

describe('forced initial-password flow', () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    setAuthCookiesMock.mockReset();
    clearAuthCookiesMock.mockReset();
    setAuthCookiesMock.mockResolvedValue(undefined);
    clearAuthCookiesMock.mockResolvedValue(undefined);
  });

  it('leaves the forced-password state after backend truth becomes false', async () => {
    let loginAttempt = 0;

    backendFetchMock.mockImplementation(async (path: string) => {
      if (path === '/set-initial-password/') {
        return {access: 'changed-access', refresh: 'changed-refresh'};
      }

      if (path === '/login/') {
        loginAttempt += 1;

        if (loginAttempt === 1) {
          return {
            access: 'temporary-access',
            refresh: 'temporary-refresh',
            identifier: '11229',
            personnel_id: '11229',
            full_name: 'Professor Example',
            role: 'professor',
            is_profile_completed: true,
            must_change_password: true,
            is_locked: false
          };
        }

        return {
          access: 'final-access',
          refresh: 'final-refresh',
          identifier: '11229',
          personnel_id: '11229',
          full_name: 'Professor Example',
          role: 'professor',
          is_profile_completed: true,
          must_change_password: false,
          is_locked: false
        };
      }

      throw new Error(`Unexpected backend path: ${path}`);
    });

    const firstLoginResponse = await login(
      jsonRequest('/api/app/auth/login', {
        email: 'professor@sbu.ac.ir',
        password: 'Temporary123!'
      })
    );
    const firstLoginBody = await firstLoginResponse.json();

    expect(firstLoginResponse.status).toBe(200);
    expect(firstLoginBody.mustChangePassword).toBe(true);
    expect(clearAuthCookiesMock).toHaveBeenCalledTimes(1);
    expect(setAuthCookiesMock).not.toHaveBeenCalled();

    const passwordResponse = await setInitialPassword(
      jsonRequest('/api/app/auth/set-initial-password', {
        email: 'professor@sbu.ac.ir',
        temporary_password: 'Temporary123!',
        new_password: 'Permanent123!',
        new_password_confirm: 'Permanent123!'
      })
    );

    expect(passwordResponse.status).toBe(200);
    expect(await passwordResponse.json()).toEqual({ok: true});
    expect(setAuthCookiesMock).toHaveBeenCalledWith({
      access: 'changed-access',
      refresh: 'changed-refresh'
    });

    const secondLoginResponse = await login(
      jsonRequest('/api/app/auth/login', {
        email: 'professor@sbu.ac.ir',
        password: 'Permanent123!'
      })
    );
    const secondLoginBody = await secondLoginResponse.json();

    expect(secondLoginResponse.status).toBe(200);
    expect(secondLoginBody.mustChangePassword).toBe(false);
    expect(secondLoginBody.user.mustChangePassword).toBe(false);
    expect(secondLoginBody.user.role).toBe('professor');
    expect(setAuthCookiesMock).toHaveBeenLastCalledWith({
      access: 'final-access',
      refresh: 'final-refresh'
    });
    expect(clearAuthCookiesMock).toHaveBeenCalledTimes(1);
  });
});
