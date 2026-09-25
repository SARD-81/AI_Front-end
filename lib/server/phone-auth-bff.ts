import 'server-only';
import {NextResponse} from 'next/server';
import {isAcceptedPhoneInput} from '@/lib/auth/phone-number';
import {isPhoneAuthEnabled} from '@/lib/config/phone-auth';
import {clearAuthCookies, getAuthCookies, setAuthCookies} from '@/lib/server/auth-cookies';
import {
  normalizeBackendAuthContract,
  type BackendAuthContract
} from '@/lib/server/auth-contract';
import {backendFetchResult} from '@/lib/server/backend-fetch';
import {crossSiteRejection} from '@/lib/server/request-origin';
import {routeErrorResponse} from '@/lib/server/route-error';

const STAFF_CATEGORIES = ['faculty_administration', 'vice_presidency', 'other'] as const;
type StaffCategory = (typeof STAFF_CATEGORIES)[number];
type PublicRole = 'student' | 'professor' | 'staff';

type JsonRecord = Record<string, unknown>;

function disabledResponse() {
  if (isPhoneAuthEnabled()) return null;
  return NextResponse.json(
    {
      message: 'ورود با شماره موبایل در این محیط فعال نیست.',
      code: 'phone_auth_disabled'
    },
    {status: 404}
  );
}

function guard(request: Request) {
  return crossSiteRejection(request) ?? disabledResponse();
}

async function readJson(request: Request): Promise<JsonRecord> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  return body as JsonRecord;
}

function invalidPhone() {
  return NextResponse.json(
    {message: 'شماره موبایل نامعتبر است.', code: 'invalid_phone_number'},
    {status: 400}
  );
}

function phoneFrom(body: JsonRecord): string | NextResponse {
  const phone = typeof body.phone_number === 'string' ? body.phone_number : '';
  if (!isAcceptedPhoneInput(phone)) return invalidPhone();
  return phone;
}

function textField(value: unknown) {
  return typeof value === 'string' ? value : '';
}

async function establishSession(data: BackendAuthContract, status = 200) {
  const {access, refresh, result} = normalizeBackendAuthContract(data);

  if (result.isLocked === true || result.user?.isLocked === true) {
    await clearAuthCookies();
    return NextResponse.json(
      {message: 'Account is locked.', code: 'ACCOUNT_LOCKED'},
      {status: 423}
    );
  }

  if (result.mustChangePassword === true || result.user?.mustChangePassword === true) {
    await clearAuthCookies();
  } else {
    await setAuthCookies({access, refresh});
  }

  return NextResponse.json(result, {status});
}

function acceptedBody(data: JsonRecord) {
  const retryAfter = data.retry_after;
  return NextResponse.json(
    {
      status: typeof data.status === 'string' ? data.status : 'accepted',
      ...(typeof retryAfter === 'number' ? {retry_after: retryAfter} : {})
    },
    {
      status: 202,
      headers:
        typeof retryAfter === 'number' ? {'Retry-After': String(retryAfter)} : undefined
    }
  );
}

export async function handlePhoneIdentify(request: Request) {
  const rejected = guard(request);
  if (rejected) return rejected;

  try {
    const body = await readJson(request);
    const phone = phoneFrom(body);
    if (phone instanceof NextResponse) return phone;

    const result = await backendFetchResult<{next?: string}>('/phone/identify/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({phone_number: phone})
    });

    if (result.data?.next !== 'password' && result.data?.next !== 'register') {
      return NextResponse.json(
        {message: 'پاسخ شناسایی شماره نامعتبر است.', code: 'AUTH_CONTRACT_INVALID'},
        {status: 502}
      );
    }

    return NextResponse.json({next: result.data.next});
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function handlePhoneLogin(request: Request) {
  const rejected = guard(request);
  if (rejected) return rejected;

  try {
    const body = await readJson(request);
    const phone = phoneFrom(body);
    if (phone instanceof NextResponse) return phone;
    const password = textField(body.password);
    if (!password) {
      return NextResponse.json(
        {message: 'رمز عبور الزامی است.', code: 'invalid_login_request'},
        {status: 400}
      );
    }

    const result = await backendFetchResult<BackendAuthContract & JsonRecord>(
      '/phone/login/',
      {
        base: 'auth',
        method: 'POST',
        body: JSON.stringify({phone_number: phone, password})
      }
    );

    if (result.status === 202) {
      const token = textField(result.data.activation_token);
      if (!token || result.data.status !== 'phone_verification_required') {
        return NextResponse.json(
          {message: 'پاسخ فعال‌سازی شماره نامعتبر است.', code: 'AUTH_CONTRACT_INVALID'},
          {status: 502}
        );
      }
      return NextResponse.json(
        {
          status: 'phone_verification_required',
          code: 'phone_verification_required',
          activation_token: token,
          expires_in: result.data.expires_in
        },
        {status: 202}
      );
    }

    return establishSession(result.data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function handleActivationResend(request: Request) {
  const rejected = guard(request);
  if (rejected) return rejected;

  try {
    const body = await readJson(request);
    const activationToken = textField(body.activation_token);
    if (!activationToken) {
      return NextResponse.json(
        {message: 'درخواست تایید شماره نامعتبر است.', code: 'invalid_activation'},
        {status: 400}
      );
    }

    const result = await backendFetchResult<JsonRecord>('/phone/activation/resend-otp/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({activation_token: activationToken})
    });
    return acceptedBody(result.data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function handleActivationVerify(request: Request) {
  const rejected = guard(request);
  if (rejected) return rejected;

  try {
    const body = await readJson(request);
    const activationToken = textField(body.activation_token);
    const code = textField(body.code);
    if (!activationToken || !code) {
      return NextResponse.json(
        {message: 'درخواست تایید شماره نامعتبر است.', code: 'invalid_activation'},
        {status: 400}
      );
    }

    const result = await backendFetchResult<BackendAuthContract>(
      '/phone/activation/verify-otp/',
      {
        base: 'auth',
        method: 'POST',
        body: JSON.stringify({activation_token: activationToken, code})
      }
    );
    return establishSession(result.data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function handleRegistrationRequestOtp(request: Request) {
  const rejected = guard(request);
  if (rejected) return rejected;

  try {
    const body = await readJson(request);
    const phone = phoneFrom(body);
    if (phone instanceof NextResponse) return phone;

    const result = await backendFetchResult<JsonRecord>(
      '/phone/registration/request-otp/',
      {
        base: 'auth',
        method: 'POST',
        body: JSON.stringify({phone_number: phone})
      }
    );
    return acceptedBody(result.data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function handleRegistrationVerifyOtp(request: Request) {
  const rejected = guard(request);
  if (rejected) return rejected;

  try {
    const body = await readJson(request);
    const phone = phoneFrom(body);
    if (phone instanceof NextResponse) return phone;
    const code = textField(body.code);
    if (!code) {
      return NextResponse.json(
        {message: 'کد تایید نامعتبر است.', code: 'invalid_otp'},
        {status: 400}
      );
    }

    const result = await backendFetchResult<JsonRecord>('/phone/registration/verify-otp/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({phone_number: phone, code})
    });
    const registrationToken = textField(result.data.registration_token);
    if (!registrationToken) {
      return NextResponse.json(
        {message: 'پاسخ ثبت‌نام نامعتبر است.', code: 'AUTH_CONTRACT_INVALID'},
        {status: 502}
      );
    }

    return NextResponse.json({
      registration_token: registrationToken,
      expires_in: result.data.expires_in
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function handlePhoneRegister(request: Request) {
  const rejected = guard(request);
  if (rejected) return rejected;

  try {
    const body = await readJson(request);
    const registrationToken = textField(body.registration_token);
    const firstName = textField(body.first_name).trim();
    const lastName = textField(body.last_name).trim();
    const password = textField(body.password);
    const role = textField(body.role);
    if (!registrationToken || !firstName || !lastName || !password) {
      return NextResponse.json(
        {message: 'درخواست ثبت‌نام نامعتبر است.', code: 'invalid_registration'},
        {status: 400}
      );
    }
    if (role !== 'student' && role !== 'professor' && role !== 'staff') {
      return NextResponse.json(
        {message: 'درخواست ثبت‌نام نامعتبر است.', code: 'invalid_registration'},
        {status: 400}
      );
    }

    const payload: JsonRecord = {
      registration_token: registrationToken,
      first_name: firstName,
      last_name: lastName,
      password,
      role: role as PublicRole
    };

    if (role === 'staff') {
      const category = textField(body.staff_category);
      if (!STAFF_CATEGORIES.includes(category as StaffCategory)) {
        return NextResponse.json(
          {message: 'درخواست ثبت‌نام نامعتبر است.', code: 'invalid_registration'},
          {status: 400}
        );
      }
      payload.staff_category = category;
    }

    if (typeof body.email === 'string' && body.email.trim()) {
      payload.email = body.email.trim();
    }

    const result = await backendFetchResult<BackendAuthContract>('/phone/register/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (result.status !== 201) {
      return NextResponse.json(
        {message: 'پاسخ ثبت‌نام نامعتبر است.', code: 'AUTH_CONTRACT_INVALID'},
        {status: 502}
      );
    }

    return establishSession(result.data, 201);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function handlePhoneResetRequest(request: Request) {
  const rejected = guard(request);
  if (rejected) return rejected;

  try {
    const body = await readJson(request);
    const phone = phoneFrom(body);
    if (phone instanceof NextResponse) return phone;

    const result = await backendFetchResult<JsonRecord>(
      '/phone/password-reset/request-otp/',
      {
        base: 'auth',
        method: 'POST',
        body: JSON.stringify({phone_number: phone})
      }
    );
    return acceptedBody(result.data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function handlePhoneResetVerify(request: Request) {
  const rejected = guard(request);
  if (rejected) return rejected;

  try {
    const body = await readJson(request);
    const phone = phoneFrom(body);
    if (phone instanceof NextResponse) return phone;
    const code = textField(body.code);
    if (!code) {
      return NextResponse.json(
        {message: 'کد تایید نامعتبر است.', code: 'invalid_otp'},
        {status: 400}
      );
    }

    const result = await backendFetchResult<JsonRecord>(
      '/phone/password-reset/verify-otp/',
      {
        base: 'auth',
        method: 'POST',
        body: JSON.stringify({phone_number: phone, code})
      }
    );
    const resetToken = textField(result.data.reset_token);
    if (!resetToken) {
      return NextResponse.json(
        {message: 'پاسخ بازیابی نامعتبر است.', code: 'AUTH_CONTRACT_INVALID'},
        {status: 502}
      );
    }

    return NextResponse.json({
      reset_token: resetToken,
      expires_in: result.data.expires_in
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function handlePhoneResetComplete(request: Request) {
  const rejected = guard(request);
  if (rejected) return rejected;

  try {
    const body = await readJson(request);
    const resetToken = textField(body.reset_token);
    const newPassword = textField(body.new_password);
    if (!resetToken || !newPassword) {
      return NextResponse.json(
        {message: 'درخواست بازیابی نامعتبر است.', code: 'invalid_reset_token'},
        {status: 400}
      );
    }

    const result = await backendFetchResult<JsonRecord>('/phone/password-reset/complete/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({reset_token: resetToken, new_password: newPassword})
    });

    await clearAuthCookies();
    return NextResponse.json({
      status: result.data.status === 'password_changed' ? 'password_changed' : result.data.status
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function handlePasswordChange(request: Request) {
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;

  try {
    const body = await readJson(request);
    const currentPassword = textField(body.current_password);
    const newPassword = textField(body.new_password);
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {message: 'اطلاعات تغییر رمز کامل نیست.', code: 'invalid_password'},
        {status: 400}
      );
    }

    const {access} = await getAuthCookies();
    if (!access) {
      return NextResponse.json(
        {message: 'نیاز به ورود مجدد دارید.', code: 'SESSION_EXPIRED'},
        {status: 401}
      );
    }

    const result = await backendFetchResult<JsonRecord>('/password/change/', {
      base: 'auth',
      method: 'POST',
      accessToken: access,
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });

    await clearAuthCookies();
    return NextResponse.json({status: result.data.status ?? 'password_changed'});
  } catch (error) {
    return routeErrorResponse(error);
  }
}
