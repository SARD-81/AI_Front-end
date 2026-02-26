import {createHash, randomUUID} from 'crypto';
import {z} from 'zod';
import type {
  LoginInputDTO,
  LoginResultDTO,
  RegisterInputDTO,
  RegisterResultDTO,
  SendOtpInputDTO,
  SendOtpResultDTO,
  VerifyOtpInputDTO,
  VerifyOtpResultDTO
} from '@/lib/types/auth';

const AUTH_TRANSPORT_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? 'mock';
const HASH_SALT = 'sbu-auth-service-static-salt-v1';
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const loginResultSchema = z.object({
  user: z.object({
    studentId: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional()
  })
});

const sendOtpResultSchema = z.object({
  requestId: z.string(),
  devCode: z.string().optional()
});

const verifyOtpResultSchema = z.object({
  verificationToken: z.string()
});

const registerResultSchema = z.object({
  ok: z.literal(true)
});

type PendingOtpRecord = {
  email: string;
  codeHash: string;
  expiresAt: number;
  attemptsLeft: number;
  lastSentAt: number;
};

type VerifiedTokenRecord = {
  email: string;
  expiresAt: number;
};

type UserRecord = {
  studentId: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  degree: string;
  faculty: string;
  major: string;
  specialization?: string;
};

const pendingOtps = new Map<string, PendingOtpRecord>();
const verifiedTokens = new Map<string, VerifiedTokenRecord>();
const users = new Map<string, UserRecord>();
const otpRequestByEmail = new Map<string, string>();

export class ServiceError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
    this.code = code;
  }
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (
    (error as {name?: string}).name === 'AbortError' ||
    (error as {code?: string}).code === 'ABORT_ERR' ||
    (error as {message?: string}).message === 'The operation was aborted.'
  );
}

function toAbortError(): Error {
  const abortError = new Error('The operation was aborted.');
  abortError.name = 'AbortError';
  return abortError;
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw toAbortError();
  }
}

function waitForMockNetwork(signal?: AbortSignal): Promise<void> {
  assertNotAborted(signal);
  const delay = 300 + Math.floor(Math.random() * 601);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (signal?.aborted) {
        reject(toAbortError());
        return;
      }
      resolve();
    }, delay);

    const onAbort = () => {
      clearTimeout(timeout);
      reject(toAbortError());
    };

    signal?.addEventListener('abort', onAbort, {once: true});
  });
}

function hashValue(rawValue: string): string {
  return createHash('sha256').update(`${HASH_SALT}:${rawValue}`).digest('hex');
}

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

interface AuthTransport {
  login(input: LoginInputDTO, opts?: {signal?: AbortSignal}): Promise<unknown>;
  sendOtp(input: SendOtpInputDTO, opts?: {signal?: AbortSignal}): Promise<unknown>;
  verifyOtp(input: VerifyOtpInputDTO, opts?: {signal?: AbortSignal}): Promise<unknown>;
  register(input: RegisterInputDTO, opts?: {signal?: AbortSignal}): Promise<unknown>;
}

const mockTransport: AuthTransport = {
  async login(input, opts) {
    await waitForMockNetwork(opts?.signal);

    const user = users.get(input.studentId);
    if (!user || user.passwordHash !== hashValue(input.password)) {
      throw new ServiceError('شماره دانشجویی یا رمز عبور معتبر نیست.', 401, 'INVALID_CREDENTIALS');
    }

    return {
      user: {
        studentId: user.studentId,
        firstName: user.firstName,
        lastName: user.lastName
      }
    };
  },

  async sendOtp(input, opts) {
    await waitForMockNetwork(opts?.signal);

    const now = Date.now();
    const email = input.email.toLowerCase().trim();
    const existingRequestId = otpRequestByEmail.get(email);
    const existingRecord = existingRequestId ? pendingOtps.get(existingRequestId) : undefined;

    if (existingRecord && now - existingRecord.lastSentAt < OTP_COOLDOWN_MS) {
      throw new ServiceError(
        'درخواست ارسال کد بیش از حد مجاز است. لطفا پس از چند لحظه دوباره تلاش کنید.',
        429,
        'OTP_RATE_LIMIT'
      );
    }

    const code = generateOtpCode();
    const requestId = existingRequestId ?? randomUUID();

    pendingOtps.set(requestId, {
      email,
      codeHash: hashValue(code),
      expiresAt: now + OTP_EXPIRY_MS,
      attemptsLeft: OTP_MAX_ATTEMPTS,
      lastSentAt: now
    });
    otpRequestByEmail.set(email, requestId);

    return {
      requestId,
      ...(process.env.NODE_ENV === 'development' ? {devCode: code} : {})
    };
  },

  async verifyOtp(input, opts) {
    await waitForMockNetwork(opts?.signal);

    const now = Date.now();
    const pendingOtp = pendingOtps.get(input.requestId);

    if (!pendingOtp) {
      throw new ServiceError('درخواست تایید یافت نشد. لطفا کد جدید دریافت کنید.', 400, 'OTP_REQUEST_NOT_FOUND');
    }

    if (now > pendingOtp.expiresAt) {
      pendingOtps.delete(input.requestId);
      otpRequestByEmail.delete(pendingOtp.email);
      throw new ServiceError('مهلت کد تایید به پایان رسیده است. لطفا کد جدید دریافت کنید.', 400, 'OTP_EXPIRED');
    }

    if (pendingOtp.attemptsLeft <= 0) {
      throw new ServiceError('تعداد تلاش مجاز برای تایید کد به پایان رسیده است.', 403, 'OTP_MAX_ATTEMPTS');
    }

    if (pendingOtp.codeHash !== hashValue(input.code)) {
      pendingOtp.attemptsLeft -= 1;

      if (pendingOtp.attemptsLeft <= 0) {
        throw new ServiceError('تعداد تلاش مجاز برای تایید کد به پایان رسیده است.', 403, 'OTP_MAX_ATTEMPTS');
      }

      throw new ServiceError('کد تایید وارد شده صحیح نیست.', 400, 'OTP_INVALID_CODE');
    }

    const verificationToken = randomUUID();
    verifiedTokens.set(verificationToken, {
      email: pendingOtp.email,
      expiresAt: now + OTP_EXPIRY_MS
    });

    return {verificationToken};
  },

  async register(input, opts) {
    await waitForMockNetwork(opts?.signal);

    const tokenData = verifiedTokens.get(input.verificationToken);

    if (!tokenData || Date.now() > tokenData.expiresAt) {
      throw new ServiceError('اعتبار تایید ایمیل نامعتبر یا منقضی شده است.', 403, 'VERIFICATION_INVALID');
    }

    if (users.has(input.profile.studentId)) {
      throw new ServiceError('این شماره دانشجویی قبلا ثبت شده است.', 409, 'STUDENT_ID_CONFLICT');
    }

    users.set(input.profile.studentId, {
      studentId: input.profile.studentId,
      passwordHash: hashValue('Demo@1234'),
      firstName: input.profile.firstName,
      lastName: input.profile.lastName,
      degree: input.profile.degree,
      faculty: input.profile.faculty,
      major: input.profile.major,
      specialization: input.profile.specialization
    });

    verifiedTokens.delete(input.verificationToken);
    otpRequestByEmail.delete(tokenData.email);

    return {ok: true};
  }
};

const transport: AuthTransport = AUTH_TRANSPORT_MODE === 'mock' ? mockTransport : mockTransport;

function normalizeLoginResult(raw: unknown): LoginResultDTO {
  return loginResultSchema.parse(raw);
}

function normalizeSendOtpResult(raw: unknown): SendOtpResultDTO {
  return sendOtpResultSchema.parse(raw);
}

function normalizeVerifyOtpResult(raw: unknown): VerifyOtpResultDTO {
  return verifyOtpResultSchema.parse(raw);
}

function normalizeRegisterResult(raw: unknown): RegisterResultDTO {
  return registerResultSchema.parse(raw);
}

export async function loginUser(
  input: LoginInputDTO,
  opts?: {signal?: AbortSignal}
): Promise<LoginResultDTO> {
  assertNotAborted(opts?.signal);
  const rawResponse = await transport.login(input, opts);
  return normalizeLoginResult(rawResponse);
}

export async function sendOtp(
  input: SendOtpInputDTO,
  opts?: {signal?: AbortSignal}
): Promise<SendOtpResultDTO> {
  assertNotAborted(opts?.signal);
  const rawResponse = await transport.sendOtp(input, opts);
  return normalizeSendOtpResult(rawResponse);
}

export async function verifyOtp(
  input: VerifyOtpInputDTO,
  opts?: {signal?: AbortSignal}
): Promise<VerifyOtpResultDTO> {
  assertNotAborted(opts?.signal);
  const rawResponse = await transport.verifyOtp(input, opts);
  return normalizeVerifyOtpResult(rawResponse);
}

export async function registerUser(
  input: RegisterInputDTO,
  opts?: {signal?: AbortSignal}
): Promise<RegisterResultDTO> {
  assertNotAborted(opts?.signal);
  const rawResponse = await transport.register(input, opts);
  return normalizeRegisterResult(rawResponse);
}
