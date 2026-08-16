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

import {POST} from '@/app/api/app/auth/login/route';

function loginRequest(email = 'professor@sbu.ac.ir') {
  return new Request('http://localhost/api/app/auth/login', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({email, password: 'Temporary123!'})
  });
}

describe('login BFF route', () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    setAuthCookiesMock.mockReset();
    clearAuthCookiesMock.mockReset();
    setAuthCookiesMock.mockResolvedValue(undefined);
    clearAuthCookiesMock.mockResolvedValue(undefined);
  });

  it('preserves canonical professor identity and flags without exposing tokens', async () => {
    backendFetchMock.mockResolvedValue({
      access: 'secret-access-token',
      refresh: 'secret-refresh-token',
      identifier: '11229',
      student_id: null,
      personnel_id: '11229',
      full_name: 'Professor Example',
      role: 'professor',
      is_profile_completed: true,
      must_change_password: false,
      is_locked: false
    });

    const response = await POST(loginRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      user: {
        identifier: '11229',
        personnelId: '11229',
        fullName: 'Professor Example',
        role: 'professor',
        isProfileCompleted: true,
        mustChangePassword: false,
        isLocked: false
      },
      isProfileCompleted: true,
      mustChangePassword: false,
      isLocked: false
    });
    expect(body.user.studentId).toBeUndefined();
    expect(body).not.toHaveProperty('access');
    expect(body).not.toHaveProperty('refresh');
    expect(body.user).not.toHaveProperty('access');
    expect(body.user).not.toHaveProperty('refresh');
    expect(JSON.stringify(body)).not.toContain('secret-access-token');
    expect(JSON.stringify(body)).not.toContain('secret-refresh-token');
    expect(setAuthCookiesMock).toHaveBeenCalledWith({
      access: 'secret-access-token',
      refresh: 'secret-refresh-token'
    });
  });

  it.each([
    {
      label: 'student',
      email: 'student@mail.sbu.ac.ir',
      backend: {
        identifier: '401234567',
        student_id: '401234567',
        personnel_id: null,
        role: 'student'
      },
      expectedRole: 'student'
    },
    {
      label: 'staff',
      email: 'staff@sbu.ac.ir',
      backend: {
        identifier: '77881',
        student_id: null,
        personnel_id: '77881',
        role: 'staff'
      },
      expectedRole: 'staff'
    }
  ])('keeps the canonical $label role', async ({email, backend, expectedRole}) => {
    backendFetchMock.mockResolvedValue({
      access: 'access-token',
      refresh: 'refresh-token',
      full_name: 'Example User',
      is_profile_completed: true,
      must_change_password: false,
      is_locked: false,
      ...backend
    });

    const response = await POST(loginRequest(email));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.role).toBe(expectedRole);
    expect(body.user.identifier).toBe(backend.identifier);
  });

  it('propagates must_change_password and does not create a normal browser session', async () => {
    backendFetchMock.mockResolvedValue({
      access: 'temporary-access',
      refresh: 'temporary-refresh',
      identifier: '11229',
      role: 'professor',
      is_profile_completed: true,
      must_change_password: true,
      is_locked: false
    });

    const response = await POST(loginRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mustChangePassword).toBe(true);
    expect(body.user.mustChangePassword).toBe(true);
    expect(clearAuthCookiesMock).toHaveBeenCalledTimes(1);
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('rejects a canonical locked account without persisting authentication cookies', async () => {
    backendFetchMock.mockResolvedValue({
      access: 'locked-access',
      refresh: 'locked-refresh',
      identifier: '77881',
      role: 'staff',
      is_profile_completed: true,
      must_change_password: false,
      is_locked: true
    });

    const response = await POST(loginRequest('staff@sbu.ac.ir'));
    const body = await response.json();

    expect(response.status).toBe(423);
    expect(body).toEqual({message: 'Account is locked.', code: 'ACCOUNT_LOCKED'});
    expect(clearAuthCookiesMock).toHaveBeenCalledTimes(1);
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });
});
