import { z } from 'zod';
import { apiFetch, ApiError } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/config/api-endpoints';
import type {
  LoginInputDTO,
  LoginResultDTO,
  PasswordResetCompleteInputDTO,
  PasswordResetResultDTO,
  RegisterInputDTO,
  RegisterResultDTO,
  SendOtpInputDTO,
  SendOtpResultDTO,
  VerifyOtpInputDTO,
  VerifyOtpResultDTO
} from '@/lib/types/auth';

const loginSchema = z.object({
  user: z.object({
    studentId: z.string(),
    fullName: z.string().optional()
  })
});

const messageSchema = z
  .object({
    message: z.string().optional()
  })
  .passthrough()
  .transform((value) => ({message: value.message ?? 'درخواست با موفقیت انجام شد.'}));

const otpTokenSchema = z
  .object({
    message: z.string().optional(),
    otp_token: z.string().optional(),
    otpToken: z.string().optional(),
    token: z.string().optional()
  })
  .passthrough()
  .transform((value) => {
    const otpToken = value.otp_token ?? value.otpToken ?? value.token;

    if (!otpToken) {
      throw new ServiceError('توکن تأیید از سرور دریافت نشد.', 500, 'OTP_TOKEN_MISSING');
    }

    return {
      message: value.message ?? 'کد تأیید شد.',
      otpToken
    };
  });

export class ServiceError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'SERVICE_ERROR') {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
    this.code = code;
  }
}

export function isAbortError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    (error as { name?: string }).name === 'AbortError'
  );
}

function toServiceError(error: unknown): ServiceError {
  if (error instanceof ServiceError) return error;
  if (error instanceof ApiError) {
    const message =
      error.message && error.message !== 'API request failed'
        ? error.message
        : 'در ارتباط با سرور خطایی رخ داد. لطفاً دوباره تلاش کنید.';
    return new ServiceError(message, error.status, 'API_ERROR');
  }
  return new ServiceError('خطای غیرمنتظره رخ داد.', 500, 'UNEXPECTED');
}

export async function loginUser(
  input: LoginInputDTO,
  opts?: { signal?: AbortSignal }
): Promise<LoginResultDTO> {
  try {
    const result = await apiFetch<LoginResultDTO>(API_ENDPOINTS.auth.login, {
      method: 'POST',
      signal: opts?.signal,
      body: JSON.stringify({
        identifier: input.identifier,
        password: input.password
      })
    });

    return loginSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getMe(opts?: { signal?: AbortSignal }) {
  try {
    return await apiFetch<{ user: Record<string, string> }>(
      API_ENDPOINTS.auth.profile,
      {
        method: 'GET',
        signal: opts?.signal
      }
    );
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function logout(opts?: { signal?: AbortSignal }): Promise<void> {
  try {
    await apiFetch<void>(API_ENDPOINTS.auth.logout, {
      method: 'POST',
      signal: opts?.signal
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function sendOtp(
  input: SendOtpInputDTO,
  opts?: { signal?: AbortSignal }
): Promise<SendOtpResultDTO> {
  try {
    const result = await apiFetch<SendOtpResultDTO>(
      API_ENDPOINTS.auth.register.requestOtp,
      {
        method: 'POST',
        signal: opts?.signal,
        body: JSON.stringify({ email: input.email })
      }
    );

    return messageSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function verifyOtp(
  input: VerifyOtpInputDTO,
  opts?: { signal?: AbortSignal }
): Promise<VerifyOtpResultDTO> {
  try {
    const result = await apiFetch<VerifyOtpResultDTO>(
      API_ENDPOINTS.auth.register.verifyOtp,
      {
        method: 'POST',
        signal: opts?.signal,
        body: JSON.stringify({ email: input.email, otp: input.otpCode })
      }
    );

    return otpTokenSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function registerUser(
  input: RegisterInputDTO,
  opts?: { signal?: AbortSignal }
): Promise<RegisterResultDTO> {
  try {
    const result = await apiFetch<RegisterResultDTO>(
      API_ENDPOINTS.auth.register.complete,
      {
        method: 'POST',
        signal: opts?.signal,
        body: JSON.stringify({
          email: input.email,
          otp_token: input.otpToken,
          password: input.password,
          first_name: input.firstName,
          last_name: input.lastName,
          student_id: input.studentId
        })
      }
    );

    return messageSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function requestPasswordResetOtp(
  input: SendOtpInputDTO,
  opts?: { signal?: AbortSignal }
): Promise<PasswordResetResultDTO> {
  try {
    const result = await apiFetch<PasswordResetResultDTO>(
      API_ENDPOINTS.auth.passwordReset.requestOtp,
      {
        method: 'POST',
        signal: opts?.signal,
        body: JSON.stringify({ email: input.email })
      }
    );

    return messageSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function verifyPasswordResetOtp(
  input: VerifyOtpInputDTO,
  opts?: { signal?: AbortSignal }
): Promise<VerifyOtpResultDTO> {
  try {
    const result = await apiFetch<VerifyOtpResultDTO>(
      API_ENDPOINTS.auth.passwordReset.verifyOtp,
      {
        method: 'POST',
        signal: opts?.signal,
        body: JSON.stringify({ email: input.email, otp: input.otpCode })
      }
    );

    return otpTokenSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function completePasswordReset(
  input: PasswordResetCompleteInputDTO,
  opts?: { signal?: AbortSignal }
): Promise<PasswordResetResultDTO> {
  try {
    const result = await apiFetch<PasswordResetResultDTO>(
      API_ENDPOINTS.auth.passwordReset.complete,
      {
        method: 'POST',
        signal: opts?.signal,
        body: JSON.stringify({
          email: input.email,
          otp_token: input.otpToken,
          new_password: input.newPassword
        })
      }
    );

    return messageSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}
