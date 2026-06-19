import { z } from 'zod';
import { apiFetch, ApiError } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/config/api-endpoints';
import type {
  LoginInputDTO,
  LoginResponseDTO,
  LoginResultDTO,
  PasswordResetCompleteInputDTO,
  PasswordResetResultDTO,
  ProfileResponseDTO,
  ProfileUpdateDTO,
  RegisterInputDTO,
  RegisterResultDTO,
  SendOtpInputDTO,
  SendOtpResultDTO,
  VerifyOtpInputDTO,
  VerifyOtpResultDTO
} from '@/lib/types/auth';

const loginSchema = z
  .object({
    user: z
      .object({
        studentId: z.string().optional(),
        student_id: z.string().optional(),
        fullName: z.string().optional(),
        full_name: z.string().optional(),
        role: z.enum(['student', 'professor', 'staff']).optional(),
        isProfileCompleted: z.boolean().optional(),
        is_profile_completed: z.boolean().optional()
      })
      .passthrough(),
    isProfileCompleted: z.boolean().optional(),
    is_profile_completed: z.boolean().optional()
  })
  .passthrough()
  .transform((value) => {
    const studentId = value.user.studentId ?? value.user.student_id;

    if (!studentId) {
      throw new ServiceError('شناسه دانشجویی از سرور دریافت نشد.', 500, 'LOGIN_USER_MISSING');
    }

    const isProfileCompleted =
      value.isProfileCompleted ??
      value.is_profile_completed ??
      value.user.isProfileCompleted ??
      value.user.is_profile_completed;

    return {
      user: {
        studentId,
        fullName: value.user.fullName ?? value.user.full_name,
        role: value.user.role,
        isProfileCompleted
      },
      isProfileCompleted
    };
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
  .transform((value) => ({
    message: value.message ?? 'کد تأیید شد.',
    otpToken: value.otp_token ?? value.otpToken ?? value.token
  }));

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
    const result = await apiFetch<LoginResponseDTO>(API_ENDPOINTS.auth.login, {
      method: 'POST',
      signal: opts?.signal,
      body: JSON.stringify(
        input.email
          ? { email: input.email, password: input.password }
          : input.identifier?.includes('@')
            ? { email: input.identifier, password: input.password }
            : { identifier: input.identifier, password: input.password }
      )
    });

    return loginSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getProfile(opts?: { signal?: AbortSignal }): Promise<ProfileResponseDTO> {
  try {
    return await apiFetch<ProfileResponseDTO>(API_ENDPOINTS.auth.profile, {
      method: 'GET',
      signal: opts?.signal
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function updateProfile(
  input: ProfileUpdateDTO,
  opts?: { signal?: AbortSignal }
): Promise<ProfileResponseDTO> {
  try {
    return await apiFetch<ProfileResponseDTO>(API_ENDPOINTS.auth.profile, {
      method: 'PATCH',
      signal: opts?.signal,
      body: JSON.stringify({
        firstName: input.firstName,
        lastName: input.lastName,
        studentId: input.studentId,
        faculty: input.faculty,
        major: input.major,
        degreeLevel: input.degreeLevel
      })
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getMe(opts?: { signal?: AbortSignal }): Promise<ProfileResponseDTO> {
  return getProfile(opts);
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
        body: JSON.stringify({ email: input.email, otpCode: input.otpCode })
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
          password: input.password,
          firstName: input.firstName,
          lastName: input.lastName,
          studentId: input.studentId,
          faculty: input.faculty,
          major: input.major,
          degreeLevel: input.degreeLevel
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
        body: JSON.stringify({ email: input.email, otpCode: input.otpCode })
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
          new_password: input.newPassword
        })
      }
    );

    return messageSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}
