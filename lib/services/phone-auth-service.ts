import { apiFetch } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/config/api-endpoints';
import { closeActiveChatSockets } from '@/lib/services/chat-service';
import {
  loginSchema,
  ServiceError,
  toServiceError
} from '@/lib/services/auth-service';
import type { LoginResultDTO } from '@/lib/types/auth';

export type PhoneNext = 'password' | 'register';
export type StaffCategory =
  | 'faculty_administration'
  | 'vice_presidency'
  | 'other';
export type PhoneRole = 'student' | 'professor' | 'staff';

type AcceptedSms = {
  status: 'accepted';
  retry_after?: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

async function post<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<T> {
  try {
    return await apiFetch<T>(path, {
      method: 'POST',
      signal,
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function identifyPhone(phoneNumber: string, signal?: AbortSignal) {
  const data = await post<{
    next?: PhoneNext;
    verification_required?: boolean;
  }>(API_ENDPOINTS.auth.phone.identify, { phone_number: phoneNumber }, signal);
  if (
    (data.next !== 'password' && data.next !== 'register') ||
    typeof data.verification_required !== 'boolean'
  ) {
    throw new ServiceError(
      'پاسخ شناسایی شماره نامعتبر است.',
      502,
      'AUTH_CONTRACT_INVALID'
    );
  }
  return { next: data.next, verificationRequired: data.verification_required };
}

export async function loginWithPhone(
  phoneNumber: string,
  password: string,
  signal?: AbortSignal
): Promise<
  | { kind: 'session'; result: LoginResultDTO }
  | { kind: 'activation'; activationToken: string; expiresIn?: number }
> {
  const data = asRecord(
    await post<unknown>(
      API_ENDPOINTS.auth.phone.login,
      { phone_number: phoneNumber, password },
      signal
    )
  );
  if (data.status === 'phone_verification_required') {
    const activationToken =
      typeof data.activation_token === 'string' ? data.activation_token : '';
    if (!activationToken) {
      throw new ServiceError(
        'پاسخ فعال‌سازی شماره نامعتبر است.',
        502,
        'AUTH_CONTRACT_INVALID'
      );
    }
    return {
      kind: 'activation',
      activationToken,
      expiresIn:
        typeof data.expires_in === 'number' ? data.expires_in : undefined
    };
  }
  return { kind: 'session', result: loginSchema.parse(data) };
}

export async function resendActivationOtp(
  activationToken: string,
  signal?: AbortSignal
) {
  return post<AcceptedSms>(
    API_ENDPOINTS.auth.phone.activationResend,
    { activation_token: activationToken },
    signal
  );
}

export async function verifyActivationOtp(
  activationToken: string,
  code: string,
  signal?: AbortSignal
) {
  const data = await post<unknown>(
    API_ENDPOINTS.auth.phone.activationVerify,
    { activation_token: activationToken, code },
    signal
  );
  return loginSchema.parse(data);
}

export async function requestRegistrationOtp(
  phoneNumber: string,
  signal?: AbortSignal
) {
  return post<AcceptedSms>(
    API_ENDPOINTS.auth.phone.registrationRequestOtp,
    { phone_number: phoneNumber },
    signal
  );
}

export async function verifyRegistrationOtp(
  phoneNumber: string,
  code: string,
  signal?: AbortSignal
) {
  const data = asRecord(
    await post<unknown>(
      API_ENDPOINTS.auth.phone.registrationVerifyOtp,
      { phone_number: phoneNumber, code },
      signal
    )
  );
  const registrationToken =
    typeof data.registration_token === 'string' ? data.registration_token : '';
  if (!registrationToken) {
    throw new ServiceError(
      'پاسخ ثبت‌نام نامعتبر است.',
      502,
      'AUTH_CONTRACT_INVALID'
    );
  }
  return {
    registrationToken,
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : undefined
  };
}

export async function registerWithPhone(
  input: {
    registrationToken?: string;
    phoneNumber?: string;
    firstName: string;
    lastName: string;
    password: string;
    role: PhoneRole;
    staffCategory?: StaffCategory | null;
    email?: string;
  },
  signal?: AbortSignal
) {
  const body: Record<string, unknown> = {
    first_name: input.firstName,
    last_name: input.lastName,
    password: input.password,
    role: input.role
  };
  if (input.registrationToken)
    body.registration_token = input.registrationToken;
  else if (input.phoneNumber) body.phone_number = input.phoneNumber;
  if (input.role === 'staff' && input.staffCategory) {
    body.staff_category = input.staffCategory;
  }
  if (input.email?.trim()) body.email = input.email.trim();

  const data = await post<unknown>(
    API_ENDPOINTS.auth.phone.register,
    body,
    signal
  );
  return loginSchema.parse(data);
}

export async function requestPhonePasswordReset(
  phoneNumber: string,
  signal?: AbortSignal
) {
  return post<AcceptedSms>(
    API_ENDPOINTS.auth.phone.resetRequestOtp,
    { phone_number: phoneNumber },
    signal
  );
}

export async function verifyPhonePasswordReset(
  phoneNumber: string,
  code: string,
  signal?: AbortSignal
) {
  const data = asRecord(
    await post<unknown>(
      API_ENDPOINTS.auth.phone.resetVerifyOtp,
      { phone_number: phoneNumber, code },
      signal
    )
  );
  const resetToken =
    typeof data.reset_token === 'string' ? data.reset_token : '';
  if (!resetToken) {
    throw new ServiceError(
      'پاسخ بازیابی نامعتبر است.',
      502,
      'AUTH_CONTRACT_INVALID'
    );
  }
  return {
    resetToken,
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : undefined
  };
}

export async function completePhonePasswordReset(
  resetToken: string,
  newPassword: string,
  signal?: AbortSignal
) {
  const data = await post<{ status?: string }>(
    API_ENDPOINTS.auth.phone.resetComplete,
    { reset_token: resetToken, new_password: newPassword },
    signal
  );
  closeActiveChatSockets();
  return data;
}
