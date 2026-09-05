import {beforeEach, describe, expect, it, vi} from 'vitest';

const backendFetchMock = vi.hoisted(() => vi.fn());
const setAuthCookiesMock = vi.hoisted(() => vi.fn());
const clearAuthCookiesMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/backend-fetch', () => ({backendFetch: backendFetchMock}));
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

  it('returns the normal auth contract directly after the initial password is set', async () => {
    backendFetchMock.mockImplementation(async (path: string) => {
      if (path === '/login/') {
        return {
          access: 'test-access-before-change',
          refresh: 'test-refresh-before-change',
          identifier: '11229',
          personnel_id: '11229',
          full_name: 'Professor Example',
          role: 'professor',
          is_profile_completed: true,
          must_change_password: true,
          is_locked: false
        };
      }

      if (path === '/set-initial-password/') {
        return {
          access: 'test-access-after-change',
          refresh: 'test-refresh-after-change',
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
        password: 'test-temporary-value'
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
        temporary_password: 'test-temporary-value',
        new_password: 'test-new-value',
        new_password_confirm: 'test-new-value'
      })
    );
    const passwordBody = await passwordResponse.json();

    expect(passwordResponse.status).toBe(200);
    expect(passwordBody.mustChangePassword).toBe(false);
    expect(passwordBody.user.mustChangePassword).toBe(false);
    expect(passwordBody.user.role).toBe('professor');
    expect(setAuthCookiesMock).toHaveBeenCalledTimes(1);
    expect(setAuthCookiesMock).toHaveBeenLastCalledWith({
      access: 'test-access-after-change',
      refresh: 'test-refresh-after-change'
    });
    expect(backendFetchMock).toHaveBeenCalledTimes(2);
  });
});
