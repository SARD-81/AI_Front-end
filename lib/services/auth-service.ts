import { z } from 'zod';
import { isEmployeeEmail, isStudentEmail } from '@/lib/config/email-domains';
import { apiFetch, ApiError } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/config/api-endpoints';
import type {
  AuthRoleDTO,
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
  SetInitialPasswordInputDTO,
  VerifyOtpInputDTO,
  VerifyOtpResultDTO
} from '@/lib/types/auth';

const KNOWN_ROLES = ['student', 'professor', 'staff', 'admin'] as const;

function normalizeRole(value: unknown): AuthRoleDTO | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return (KNOWN_ROLES as readonly string[]).includes(normalized)
    ? (normalized as AuthRoleDTO)
    : undefined;
}

const nullableString = z.string().nullish();
const nullableBoolean = z.boolean().nullish();

function cleanString(value: string | null | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function cleanBoolean(value: boolean | null | undefined): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

const loginSchema = z
  .object({
    user: z
      .object({
        identifier: nullableString,
        studentId: nullableString,
        student_id: nullableString,
        personnelId: nullableString,
        personnel_id: nullableString,
        fullName: nullableString,
        full_name: nullableString,
        role: z.unknown().optional(),
        isProfileCompleted: nullableBoolean,
        is_profile_completed: nullableBoolean,
        mustChangePassword: nullableBoolean,
        must_change_password: nullableBoolean,
        isLocked: nullableBoolean,
        is_locked: nullableBoolean
      })
      .passthrough()
      .optional(),
    isProfileCompleted: nullableBoolean,
    is_profile_completed: nullableBoolean,
    mustChangePassword: nullableBoolean,
    must_change_password: nullableBoolean,
    isLocked: nullableBoolean,
    is_locked: nullableBoolean
  })
  .passthrough()
  .transform((value) => {
    const user = value.user ?? {};
    const isProfileCompleted =
      cleanBoolean(value.isProfileCompleted) ??
      cleanBoolean(value.is_profile_completed) ??
      cleanBoolean(user.isProfileCompleted) ??
      cleanBoolean(user.is_profile_completed);
    const mustChangePassword =
      cleanBoolean(value.mustChangePassword) ??
      cleanBoolean(value.must_change_password) ??
      cleanBoolean(user.mustChangePassword) ??
      cleanBoolean(user.must_change_password);
    const isLocked =
      cleanBoolean(value.isLocked) ??
      cleanBoolean(value.is_locked) ??
      cleanBoolean(user.isLocked) ??
      cleanBoolean(user.is_locked);

    return {
      user: {
        identifier: cleanString(user.identifier),
        studentId: cleanString(user.studentId ?? user.student_id),
        personnelId: cleanString(user.personnelId ?? user.personnel_id),
        fullName: cleanString(user.fullName ?? user.full_name),
        role: normalizeRole(user.role),
        isProfileCompleted,
        mustChangePassword,
        isLocked
      },
      isProfileCompleted,
      mustChangePassword,
      isLocked
    };
  });

const profileSchema = z
  .object({
    user: z
      .object({
        identifier: nullableString,
        email: nullableString,
        firstName: nullableString,
        first_name: nullableString,
        lastName: nullableString,
        last_name: nullableString,
        studentId: nullableString,
        student_id: nullableString,
        personnelId: nullableString,
        personnel_id: nullableString,
        faculty: nullableString,
        major: nullableString,
        degreeLevel: nullableString,
        degree_level: nullableString,
        department: nullableString,
        academicRank: nullableString,
        academic_rank: nullableString,
        jobTitle: nullableString,
        job_title: nullableString,
        fullName: nullableString,
        full_name: nullableString,
        role: z.unknown().optional(),
        isProfileCompleted: nullableBoolean,
        is_profile_completed: nullableBoolean,
        mustChangePassword: nullableBoolean,
        must_change_password: nullableBoolean,
        isLocked: nullableBoolean,
        is_locked: nullableBoolean
      })
      .passthrough()
      .optional(),
    isProfileCompleted: nullableBoolean,
    is_profile_completed: nullableBoolean,
    mustChangePassword: nullableBoolean,
    must_change_password: nullableBoolean,
    isLocked: nullableBoolean,
    is_locked: nullableBoolean
  })
  .passthrough()
  .transform((value) => {
    const user = value.user ?? {};
    const isProfileCompleted =
      cleanBoolean(value.isProfileCompleted) ??
      cleanBoolean(value.is_profile_completed) ??
      cleanBoolean(user.isProfileCompleted) ??
      cleanBoolean(user.is_profile_completed);
    const mustChangePassword =
      cleanBoolean(value.mustChangePassword) ??
      cleanBoolean(value.must_change_password) ??
      cleanBoolean(user.mustChangePassword) ??
      cleanBoolean(user.must_change_password);
    const isLocked =
      cleanBoolean(value.isLocked) ??
      cleanBoolean(value.is_locked) ??
      cleanBoolean(user.isLocked) ??
      cleanBoolean(user.is_locked);

    return {
      user: {
        identifier: cleanString(user.identifier),
        email: cleanString(user.email),
        firstName: cleanString(user.firstName ?? user.first_name) ?? '',
        lastName: cleanString(user.lastName ?? user.last_name) ?? '',
        studentId: cleanString(user.studentId ?? user.student_id),
        personnelId: cleanString(user.personnelId ?? user.personnel_id),
        faculty: cleanString(user.faculty),
        major: cleanString(user.major),
        degreeLevel: cleanString(user.degreeLevel ?? user.degree_level),
        department: cleanString(user.department),
        academicRank: cleanString(user.academicRank ?? user.academic_rank),
        jobTitle: cleanString(user.jobTitle ?? user.job_title),
        fullName: cleanString(user.fullName ?? user.full_name),
        role: normalizeRole(user.role),
        isProfileCompleted,
        mustChangePassword,
        isLocked
      },
      isProfileCompleted,
      mustChangePassword,
      isLocked
    };
  });

const messageSchema = z
  .object({
    message: z.string().optional()
  })
  .passthrough()
  .transform((value) => ({
    message: value.message ?? 'درخواست با موفقیت انجام شد.'
  }));

const otpTokenSchema = z
  .object({
    message: z.string().optional(),
    flow_token: z.string().optional(),
    flowToken: z.string().optional(),
    otp_token: z.string().optional(),
    otpToken: z.string().optional(),
    token: z.string().optional(),
    expires_in: z.number().optional()
  })
  .passthrough()
  .transform((value) => ({
    message: value.message ?? 'کد تأیید شد.',
    otpToken:
      value.flow_token ??
      value.flowToken ??
      value.otp_token ??
      value.otpToken ??
      value.token,
    expiresIn: value.expires_in
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

function addOptionalString(
  payload: Record<string, unknown>,
  key: string,
  value: string | undefined
): Record<string, unknown> {
  if (value?.trim()) {
    payload[key] = value.trim();
  }
  return payload;
}

function toRegisterCompletePayload(input: RegisterInputDTO) {
  const basePayload = {
    email: input.email,
    flowToken: input.otpToken,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    faculty: input.faculty
  };

  if (isStudentEmail(input.email)) {
    if ('role' in input && input.role && input.role !== 'student') {
      throw new ServiceError(
        'دامنه ایمیل با نقش انتخاب‌شده سازگار نیست.',
        400,
        'REGISTER_ROLE_DOMAIN_MISMATCH'
      );
    }

    if (!('studentId' in input)) {
      throw new ServiceError(
        'اطلاعات دانشجویی کامل نیست.',
        400,
        'REGISTER_STUDENT_FIELDS_MISSING'
      );
    }

    return {
      ...basePayload,
      studentId: input.studentId,
      major: input.major,
      degreeLevel: input.degreeLevel,
      entryYear: input.entryYear
    };
  }

  if (isEmployeeEmail(input.email)) {
    if (input.role !== 'professor' && input.role !== 'staff') {
      throw new ServiceError(
        'برای ایمیل sbu.ac.ir نقش استاد یا کارمند را انتخاب کنید.',
        400,
        'REGISTER_ROLE_REQUIRED'
      );
    }

    const payload = {
      ...basePayload,
      role: input.role,
      personnelId: input.personnelId,
      department: input.department
    };

    return input.role === 'professor'
      ? addOptionalString(payload, 'academicRank', input.academicRank)
      : addOptionalString(payload, 'jobTitle', input.jobTitle);
  }

  throw new ServiceError(
    'ایمیل باید در دامنه مجاز دانشگاهی باشد.',
    400,
    'REGISTER_EMAIL_DOMAIN_INVALID'
  );
}

function toServiceError(error: unknown): ServiceError {
  if (error instanceof ServiceError) return error;
  if (error instanceof ApiError) {
    const message =
      error.message && error.message !== 'API request failed'
        ? error.message
        : 'در ارتباط با سرور خطایی رخ داد. لطفاً دوباره تلاش کنید.';
    const payloadCode =
      error.payload &&
      typeof error.payload === 'object' &&
      'code' in error.payload &&
      typeof (error.payload as {code?: unknown}).code === 'string'
        ? (error.payload as {code: string}).code
        : undefined;
    return new ServiceError(message, error.status, error.code ?? payloadCode ?? 'API_ERROR');
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
      body: JSON.stringify({ email: input.email, password: input.password })
    });

    return loginSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function setInitialPassword(
  input: SetInitialPasswordInputDTO,
  opts?: { signal?: AbortSignal }
): Promise<LoginResultDTO> {
  try {
    const result = await apiFetch<LoginResponseDTO>(
      API_ENDPOINTS.auth.setInitialPassword,
      {
        method: 'POST',
        signal: opts?.signal,
        body: JSON.stringify({
          email: input.email,
          temporary_password: input.temporaryPassword,
          new_password: input.newPassword,
          new_password_confirm: input.newPasswordConfirm
        })
      }
    );

    return loginSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getProfile(opts?: {
  signal?: AbortSignal;
}): Promise<ProfileResponseDTO> {
  try {
    const result = await apiFetch<ProfileResponseDTO>(
      API_ENDPOINTS.auth.profile,
      {
        method: 'GET',
        signal: opts?.signal
      }
    );

    return profileSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function updateProfile(
  input: ProfileUpdateDTO,
  opts?: { signal?: AbortSignal }
): Promise<ProfileResponseDTO> {
  try {
    const result = await apiFetch<ProfileResponseDTO>(
      API_ENDPOINTS.auth.profile,
      {
        method: 'PATCH',
        signal: opts?.signal,
        body: JSON.stringify({
          first_name: input.firstName,
          last_name: input.lastName
        })
      }
    );

    return profileSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getMe(opts?: {
  signal?: AbortSignal;
}): Promise<ProfileResponseDTO> {
  try {
    const result = await apiFetch<ProfileResponseDTO>(API_ENDPOINTS.auth.me, {
      method: 'GET',
      signal: opts?.signal
    });

    return profileSchema.parse(result);
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
        body: JSON.stringify(toRegisterCompletePayload(input))
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
          flow_token: input.otpToken,
          new_password: input.newPassword
        })
      }
    );

    return messageSchema.parse(result);
  } catch (error) {
    throw toServiceError(error);
  }
}
