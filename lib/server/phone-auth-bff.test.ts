import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ApiError} from '@/lib/server/backend-types';

const backendFetchResultMock = vi.hoisted(() => vi.fn());
const setAuthCookiesMock = vi.hoisted(() => vi.fn());
const clearAuthCookiesMock = vi.hoisted(() => vi.fn());
const getAuthCookiesMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/backend-fetch', () => ({
  backendFetchResult: backendFetchResultMock
}));
vi.mock('@/lib/server/auth-cookies', () => ({
  setAuthCookies: setAuthCookiesMock,
  clearAuthCookies: clearAuthCookiesMock,
  getAuthCookies: getAuthCookiesMock
}));

import {
  handleActivationResend,
  handleActivationVerify,
  handlePhoneIdentify,
  handlePhoneLogin,
  handlePhoneRegister,
  handlePhoneResetComplete,
  handlePhoneResetRequest,
  handlePhoneResetVerify,
  handleRegistrationRequestOtp,
  handleRegistrationVerifyOtp
} from '@/lib/server/phone-auth-bff';

function post(path: string, body: unknown, headers?: HeadersInit) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {'content-type': 'application/json', ...headers},
    body: JSON.stringify(body)
  });
}

const sessionPayload = {
  access: 'access-token',
  refresh: 'refresh-token',
  identifier: null,
  student_id: null,
  full_name: 'علی رضایی',
  role: 'student',
  is_profile_completed: true,
  must_change_password: false,
  is_locked: false,
  phone_setup_required: false
};

describe('phone auth BFF contract', () => {
  beforeEach(() => {
    vi.stubEnv('PHONE_AUTH_ENABLED', 'true');
    backendFetchResultMock.mockReset();
    setAuthCookiesMock.mockReset();
    clearAuthCookiesMock.mockReset();
    getAuthCookiesMock.mockReset();
    setAuthCookiesMock.mockResolvedValue(undefined);
    clearAuthCookiesMock.mockResolvedValue(undefined);
  });

  it('stays disabled unless PHONE_AUTH_ENABLED=true', async () => {
    vi.stubEnv('PHONE_AUTH_ENABLED', 'false');
    const response = await handlePhoneIdentify(
      post('/api/app/auth/phone/identify', {phone_number: '09123456789'})
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({code: 'phone_auth_disabled'});
    expect(backendFetchResultMock).not.toHaveBeenCalled();
  });

  it('rejects a cross-site origin before calling the backend', async () => {
    const response = await handlePhoneIdentify(
      post('/api/app/auth/phone/identify', {phone_number: '09123456789'}, {
        origin: 'https://evil.example'
      })
    );
    expect(response.status).toBe(403);
    expect(backendFetchResultMock).not.toHaveBeenCalled();
  });

  it('identify returns only next and forwards the raw phone', async () => {
    backendFetchResultMock.mockResolvedValue({
      status: 200,
      data: {next: 'register'}
    });
    const response = await handlePhoneIdentify(
      post('/api/app/auth/phone/identify', {phone_number: '۰۹۱۲۳۴۵۶۷۸۹'})
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({next: 'register'});
    expect(JSON.parse(String(backendFetchResultMock.mock.calls[0][1].body))).toEqual({
      phone_number: '۰۹۱۲۳۴۵۶۷۸۹'
    });
  });

  it('rejects an internal space without calling the backend', async () => {
    const response = await handlePhoneIdentify(
      post('/api/app/auth/phone/identify', {phone_number: '0912 3456789'})
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({code: 'invalid_phone_number'});
    expect(backendFetchResultMock).not.toHaveBeenCalled();
  });

  it.each([
    ['password' as const],
    ['register' as const]
  ])('identify accepts next=%s', async (next) => {
    backendFetchResultMock.mockResolvedValue({status: 200, data: {next}});
    const response = await handlePhoneIdentify(
      post('/api/app/auth/phone/identify', {phone_number: '+989123456789'})
    );
    expect(await response.json()).toEqual({next});
  });

  it('login 200 stores the session and keeps null identity fields', async () => {
    backendFetchResultMock.mockResolvedValue({status: 200, data: sessionPayload});
    const response = await handlePhoneLogin(
      post('/api/app/auth/phone/login', {
        phone_number: '09123456789',
        password: 'secret',
        email: 'should-not-be-sent@sbu.ac.ir',
        identifier: '401'
      })
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.user.identifier).toBeUndefined();
    expect(body.user.studentId).toBeUndefined();
    expect(body.isProfileCompleted).toBe(true);
    expect(body.phoneSetupRequired).toBe(false);
    expect(body).not.toHaveProperty('access');
    expect(JSON.parse(String(backendFetchResultMock.mock.calls[0][1].body))).toEqual({
      phone_number: '09123456789',
      password: 'secret'
    });
    expect(setAuthCookiesMock).toHaveBeenCalledWith({
      access: 'access-token',
      refresh: 'refresh-token'
    });
  });

  it('login 202 does not set a session cookie', async () => {
    backendFetchResultMock.mockResolvedValue({
      status: 202,
      data: {
        status: 'phone_verification_required',
        activation_token: 'act-token',
        expires_in: 600
      }
    });
    const response = await handlePhoneLogin(
      post('/api/app/auth/phone/login', {
        phone_number: '09123456789',
        password: 'secret'
      })
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      code: 'phone_verification_required',
      activation_token: 'act-token',
      expires_in: 600
    });
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });

  it.each<[number, string, string, number | undefined]>([
    [401, 'invalid_credentials', 'ایمیل یا رمز عبور نادرست است.', undefined],
    [403, 'password_change_required', 'برای این حساب باید ابتدا رمز عبور تنظیم شود.', undefined],
    [429, 'login_rate_limited', 'محدود', 600],
    [503, 'sms_unavailable', 'ارسال پیامک در حال حاضر ممکن نیست.', undefined]
  ])('login preserves %s %s', async (status, code, detail, retryAfter) => {
    backendFetchResultMock.mockRejectedValue(
      new ApiError(detail, status, code, {code, detail, retry_after: retryAfter}, retryAfter ?? null)
    );
    const response = await handlePhoneLogin(
      post('/api/app/auth/phone/login', {
        phone_number: '09123456789',
        password: 'secret'
      })
    );
    const body = await response.json();
    expect(response.status).toBe(status);
    expect(body.code).toBe(code);
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
    if (code === 'sms_unavailable') {
      expect(body.code).not.toBe('invalid_credentials');
    }
  });

  it('phone login password_change_required creates no session cookie', async () => {
    backendFetchResultMock.mockRejectedValue(
      new ApiError(
        'برای این حساب باید ابتدا رمز عبور تنظیم شود. از مسیر set-initial-password استفاده کنید.',
        403,
        'password_change_required',
        {
          code: 'password_change_required',
          detail: 'برای این حساب باید ابتدا رمز عبور تنظیم شود. از مسیر set-initial-password استفاده کنید.'
        }
      )
    );
    const response = await handlePhoneLogin(
      post('/api/app/auth/phone/login', {
        phone_number: '09123456789',
        password: 'Temp-Pass-123'
      })
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({code: 'password_change_required'});
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
    expect(clearAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('activation verify 200 creates a session and 503 does not', async () => {
    backendFetchResultMock.mockResolvedValueOnce({status: 200, data: sessionPayload});
    const ok = await handleActivationVerify(
      post('/api/app/auth/phone/activation/verify-otp', {
        activation_token: 'act-token',
        code: '12345'
      })
    );
    expect(ok.status).toBe(200);
    expect(setAuthCookiesMock).toHaveBeenCalledTimes(1);

    backendFetchResultMock.mockRejectedValueOnce(
      new ApiError('ارسال پیامک در حال حاضر ممکن نیست.', 503, 'sms_unavailable')
    );
    const failed = await handleActivationVerify(
      post('/api/app/auth/phone/activation/verify-otp', {
        activation_token: 'act-token',
        code: '12345'
      })
    );
    expect(failed.status).toBe(503);
    expect((await failed.json()).code).toBe('sms_unavailable');
    expect(setAuthCookiesMock).toHaveBeenCalledTimes(1);
  });

  it('activation verify password_change_required creates no session cookie', async () => {
    backendFetchResultMock.mockRejectedValue(
      new ApiError(
        'برای این حساب باید ابتدا رمز عبور تنظیم شود. از مسیر set-initial-password استفاده کنید.',
        403,
        'password_change_required'
      )
    );
    const response = await handleActivationVerify(
      post('/api/app/auth/phone/activation/verify-otp', {
        activation_token: 'act-token',
        code: '12345'
      })
    );
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe('password_change_required');
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
    expect(clearAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('activation resend returns 202 and the server retry_after', async () => {
    backendFetchResultMock.mockResolvedValue({
      status: 202,
      data: {status: 'accepted', retry_after: 60}
    });
    const response = await handleActivationResend(
      post('/api/app/auth/phone/activation/resend-otp', {activation_token: 'act-token'})
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({status: 'accepted', retry_after: 60});
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('registration verify keeps the registration token out of the session', async () => {
    backendFetchResultMock.mockResolvedValue({
      status: 200,
      data: {registration_token: 'reg-token', expires_in: 600}
    });
    const response = await handleRegistrationVerifyOtp(
      post('/api/app/auth/phone/registration/verify-otp', {
        phone_number: '989123456789',
        code: '11111'
      })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      registration_token: 'reg-token',
      expires_in: 600
    });
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('register sends only contract fields and sets a session on 201', async () => {
    backendFetchResultMock.mockResolvedValue({status: 201, data: sessionPayload});
    const response = await handlePhoneRegister(
      post('/api/app/auth/phone/register', {
        registration_token: 'reg-token',
        first_name: 'علی',
        last_name: 'رضایی',
        password: 'N3w-Pass-456',
        role: 'staff',
        staff_category: 'other',
        email: '',
        student_id: '401',
        personnel_id: '12',
        is_staff: true,
        is_superuser: true,
        phone_number: '09123456789'
      })
    );
    expect(response.status).toBe(201);
    expect(JSON.parse(String(backendFetchResultMock.mock.calls[0][1].body))).toEqual({
      registration_token: 'reg-token',
      first_name: 'علی',
      last_name: 'رضایی',
      password: 'N3w-Pass-456',
      role: 'staff',
      staff_category: 'other'
    });
    expect(setAuthCookiesMock).toHaveBeenCalledTimes(1);
  });

  it('register omits staff_category for students and rejects it when required data is bad', async () => {
    backendFetchResultMock.mockResolvedValue({status: 201, data: sessionPayload});
    await handlePhoneRegister(
      post('/api/app/auth/phone/register', {
        registration_token: 'reg-token',
        first_name: 'علی',
        last_name: 'رضایی',
        password: 'N3w-Pass-456',
        role: 'student',
        staff_category: 'other'
      })
    );
    expect(JSON.parse(String(backendFetchResultMock.mock.calls[0][1].body))).not.toHaveProperty(
      'staff_category'
    );

    const rejected = await handlePhoneRegister(
      post('/api/app/auth/phone/register', {
        registration_token: 'reg-token',
        first_name: 'علی',
        last_name: 'رضایی',
        password: 'N3w-Pass-456',
        role: 'admin'
      })
    );
    expect(rejected.status).toBe(400);
    expect((await rejected.json()).code).toBe('invalid_registration');
  });

  it('surfaces validator lists and distinct reset errors', async () => {
    backendFetchResultMock.mockRejectedValueOnce(
      new ApiError('رمز کوتاه است', 400, 'invalid_password', {
        code: 'invalid_password',
        detail: ['حداقل طول رعایت نشده.', 'رمز رایج است.']
      })
    );
    const weak = await handlePhoneRegister(
      post('/api/app/auth/phone/register', {
        registration_token: 'reg-token',
        first_name: 'علی',
        last_name: 'رضایی',
        password: 'short',
        role: 'professor'
      })
    );
    expect(await weak.json()).toMatchObject({
      code: 'invalid_password',
      details: ['حداقل طول رعایت نشده.', 'رمز رایج است.']
    });

    backendFetchResultMock.mockRejectedValueOnce(
      new ApiError('بازیابی با این شماره ممکن نیست.', 400, 'phone_recovery_unavailable')
    );
    const unavailable = await handlePhoneResetRequest(
      post('/api/app/auth/phone/password-reset/request-otp', {phone_number: '09120000000'})
    );
    expect((await unavailable.json()).code).toBe('phone_recovery_unavailable');

    backendFetchResultMock.mockRejectedValueOnce(
      new ApiError('این شماره هنوز تایید نشده است.', 400, 'phone_not_verified')
    );
    const unverified = await handlePhoneResetRequest(
      post('/api/app/auth/phone/password-reset/request-otp', {phone_number: '09120000001'})
    );
    expect((await unverified.json()).code).toBe('phone_not_verified');
  });

  it('phone reset complete clears any session and does not issue one', async () => {
    backendFetchResultMock.mockResolvedValue({
      status: 200,
      data: {status: 'password_changed'}
    });
    const response = await handlePhoneResetComplete(
      post('/api/app/auth/phone/password-reset/complete', {
        reset_token: 'reset-token',
        new_password: 'N3w-Pass-456'
      })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({status: 'password_changed'});
    expect(clearAuthCookiesMock).toHaveBeenCalledTimes(1);
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('registration request and reset verify do not create a session', async () => {
    backendFetchResultMock.mockResolvedValueOnce({
      status: 202,
      data: {status: 'accepted', retry_after: 3600}
    });
    const requested = await handleRegistrationRequestOtp(
      post('/api/app/auth/phone/registration/request-otp', {phone_number: '09123456789'})
    );
    expect(requested.status).toBe(202);
    expect((await requested.json()).retry_after).toBe(3600);

    backendFetchResultMock.mockResolvedValueOnce({
      status: 200,
      data: {reset_token: 'reset-token', expires_in: 600}
    });
    const verified = await handlePhoneResetVerify(
      post('/api/app/auth/phone/password-reset/verify-otp', {
        phone_number: '09123456789',
        code: '22222'
      })
    );
    expect(await verified.json()).toEqual({reset_token: 'reset-token', expires_in: 600});
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });

  it('forwards DRF array codes and field errors', async () => {
    backendFetchResultMock.mockRejectedValue(
      new ApiError('رمز جدید و تکرار آن یکسان نیستند.', 400, 'invalid_setup_request', {
        code: ['invalid_setup_request'],
        detail: ['ایمیل یا رمز موقت نادرست است، یا این حساب نیازی به تنظیم رمز ندارد.'],
        new_password_confirm: ['رمز جدید و تکرار آن یکسان نیستند.']
      })
    );
    const response = await handlePhoneLogin(
      post('/api/app/auth/phone/login', {
        phone_number: '09123456789',
        password: 'secret'
      })
    );
    expect(await response.json()).toMatchObject({
      code: 'invalid_setup_request',
      details: ['ایمیل یا رمز موقت نادرست است، یا این حساب نیازی به تنظیم رمز ندارد.'],
      fields: {new_password_confirm: ['رمز جدید و تکرار آن یکسان نیستند.']}
    });
  });
});
