export type AuthServiceError = {
  status: number;
  message: string;
  field?: string;
};

type LoginInput = {
  studentId: string;
  password: string;
};

type SendOtpInput = {
  email: string;
};

type VerifyOtpInput = {
  email: string;
  code: string;
};

type RegisterProfile = {
  firstName: string;
  lastName: string;
  studentId: string;
  degree: string;
  faculty: string;
  major: string;
  specialization?: string;
};

type RegisterInput = {
  email: string;
  profile: RegisterProfile;
};

type UserRecord = {
  email: string;
  password: string;
  profile: RegisterProfile;
};

type OtpRecord = {
  code: string;
  expiresAt: number;
  attemptsLeft: number;
  resendAvailableAt: number;
  verified: boolean;
};

const users = new Map<string, UserRecord>();
const otps = new Map<string, OtpRecord>();

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@(mail|student)\.sbu\.ac\.ir$/;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const randomLatency = () => 450 + Math.floor(Math.random() * 451);

const sanitizeStudentId = (value: string) => value.trim();

const createError = (status: number, message: string, field?: string): AuthServiceError => ({
  status,
  message,
  field
});

const assertValidEmail = (email: string) => {
  if (!EMAIL_REGEX.test(email.trim())) {
    throw createError(422, 'ایمیل دانشگاهی معتبر وارد کنید.', 'email');
  }
};

const normalizeCode = (value: string) => value.replace(/\D/g, '').slice(0, 6);

export async function sendOtp(input: SendOtpInput): Promise<{ok: true}> {
  await sleep(randomLatency());

  const email = input.email.trim().toLowerCase();
  assertValidEmail(email);

  const now = Date.now();
  const existingOtp = otps.get(email);

  if (existingOtp && now < existingOtp.resendAvailableAt) {
    throw createError(429, 'ارسال مجدد کد هنوز فعال نشده است. لطفاً کمی صبر کنید.');
  }

  const code = `${Math.floor(100000 + Math.random() * 900000)}`;

  otps.set(email, {
    code,
    expiresAt: now + 10 * 60 * 1000,
    attemptsLeft: 5,
    resendAvailableAt: now + 60 * 1000,
    verified: false
  });

  return {ok: true};
}

export async function verifyOtp(input: VerifyOtpInput): Promise<{ok: true}> {
  await sleep(randomLatency());

  const email = input.email.trim().toLowerCase();
  const code = normalizeCode(input.code);

  assertValidEmail(email);

  const otpRecord = otps.get(email);
  if (!otpRecord) {
    throw createError(404, 'ابتدا کد تایید را دریافت کنید.');
  }

  const now = Date.now();

  if (now > otpRecord.expiresAt) {
    throw createError(410, 'کد تایید منقضی شده است. لطفاً مجدداً کد دریافت کنید.', 'otp');
  }

  if (otpRecord.attemptsLeft <= 0) {
    throw createError(429, 'تلاش‌های مجاز به پایان رسیده است. لطفاً مجدداً کد دریافت کنید.', 'otp');
  }

  if (otpRecord.code !== code) {
    otpRecord.attemptsLeft -= 1;
    otps.set(email, otpRecord);
    throw createError(401, 'کد وارد شده صحیح نیست.', 'otp');
  }

  otpRecord.verified = true;
  otpRecord.attemptsLeft = 5;
  otps.set(email, otpRecord);

  return {ok: true};
}

export async function registerUser(input: RegisterInput): Promise<{ok: true}> {
  await sleep(randomLatency());

  const email = input.email.trim().toLowerCase();
  assertValidEmail(email);

  const otpRecord = otps.get(email);
  if (!otpRecord || !otpRecord.verified) {
    throw createError(403, 'ابتدا ایمیل خود را تایید کنید.');
  }

  const studentId = sanitizeStudentId(input.profile.studentId);
  if (!studentId) {
    throw createError(422, 'شماره دانشجویی الزامی است.', 'studentId');
  }

  if (users.has(studentId)) {
    throw createError(409, 'این شماره دانشجویی قبلاً ثبت شده است.', 'studentId');
  }

  // Mock authentication rule: initial password is exactly the student ID.
  users.set(studentId, {
    email,
    password: studentId,
    profile: {
      ...input.profile,
      studentId,
      firstName: input.profile.firstName.trim(),
      lastName: input.profile.lastName.trim(),
      major: input.profile.major.trim(),
      specialization: input.profile.specialization?.trim() || ''
    }
  });

  otps.delete(email);

  return {ok: true};
}

export async function loginUser(input: LoginInput): Promise<{
  ok: true;
  user: {firstName: string; lastName: string; studentId: string};
}> {
  await sleep(randomLatency());

  const studentId = sanitizeStudentId(input.studentId);
  const password = input.password;

  const userRecord = users.get(studentId);

  if (!userRecord || userRecord.password !== password) {
    throw createError(401, 'شماره دانشجویی یا رمز عبور اشتباه است.');
  }

  return {
    ok: true,
    user: {
      firstName: userRecord.profile.firstName,
      lastName: userRecord.profile.lastName,
      studentId: userRecord.profile.studentId
    }
  };
}
