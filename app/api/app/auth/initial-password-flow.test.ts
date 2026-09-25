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

import { ApiError } from '@/lib/server/backend-types';
import { POST as setInitialPassword } from '@/app/api/app/auth/set-initial-password/route';

function jsonRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/app/auth/set-initial-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify({
      email: 'professor@sbu.ac.ir',
      temporary_password: 'test-temporary-value',
      new_password: 'test-new-value',
      new_password_confirm: 'test-new-value',
      ...body
    })
  });
}

describe('migrated initial-password contract', () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    setAuthCookiesMock.mockReset();
    clearAuthCookiesMock.mockReset();
    clearAuthCookiesMock.mockResolvedValue(undefined);
  });

  it('returns phone login without a session when that is the only destination', async () => {
    backendFetchMock.mockResolvedValue({
      status: 'password_updated',
      phone_login_required: true
    });

    const response = await setInitialPassword(jsonRequest({}));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'password_updated',
      phone_login_required: true,
      phone_setup_required: false
    });
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
    expect(clearAuthCookiesMock).toHaveBeenCalledTimes(1);
  });

  it('returns phone setup without a session when the account has no phone', async () => {
    backendFetchMock.mockResolvedValue({
      status: 'password_updated',
      phone_setup_required: true
    });

    const response = await setInitialPassword(jsonRequest({}));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'password_updated',
      phone_login_required: false,
      phone_setup_required: true
    });
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('forwards a migrated account email from another domain without inventing a university restriction', async () => {
    backendFetchMock.mockResolvedValue({
      status: 'password_updated',
      phone_login_required: true
    });

    const response = await setInitialPassword(
      jsonRequest({ email: 'migrated@example.org' })
    );

    expect(response.status).toBe(200);
    expect(backendFetchMock).toHaveBeenCalledWith(
      '/set-initial-password/',
      expect.objectContaining({
        body: expect.stringContaining('migrated@example.org')
      })
    );
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'empty object', body: {} },
    {
      label: 'both destinations',
      body: {
        status: 'password_updated',
        phone_login_required: true,
        phone_setup_required: true
      }
    },
    {
      label: 'jwt access',
      body: {
        status: 'password_updated',
        phone_login_required: true,
        access: 'test-access',
        refresh: 'test-refresh'
      }
    },
    { label: 'missing status', body: { phone_login_required: true } }
  ])('rejects a $label response without a session', async ({ body }) => {
    backendFetchMock.mockResolvedValue(body);
    const response = await setInitialPassword(jsonRequest({}));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      code: 'AUTH_CONTRACT_INVALID'
    });
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
    expect(clearAuthCookiesMock).toHaveBeenCalled();
  });

  it('forwards a rejected password update without setting a session', async () => {
    backendFetchMock.mockRejectedValue(
      new ApiError('رمز موقت نادرست است.', 400, 'invalid_credentials')
    );

    const response = await setInitialPassword(
      jsonRequest({ temporary_password: 'wrong' })
    );
    expect(response.status).toBe(400);
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });
});
