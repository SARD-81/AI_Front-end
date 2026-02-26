'use client';

import {FormEvent, type InputHTMLAttributes, type RefObject, useEffect, useMemo, useRef, useState} from 'react';
import Image from 'next/image';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {AnimatePresence, LayoutGroup, motion} from 'motion/react';
import {Eye, EyeOff, Loader2, MailCheck} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';
import {OtpInput} from '@/components/auth/OtpInput';
import {
  loginUser,
  registerUser,
  sendOtp,
  verifyOtp,
  type AuthServiceError
} from '@/lib/services/auth-service';

type AuthMode = 'login' | 'signup';
type SignupStep = 1 | 2;

type LoginState = {
  studentId: string;
  password: string;
};

type SignupState = {
  email: string;
  otpCode: string;
  firstName: string;
  lastName: string;
  studentId: string;
  degree: string;
  faculty: string;
  major: string;
  specialization: string;
};

type FormErrors = Record<string, string>;

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@(mail|student)\.sbu\.ac\.ir$/;

const degrees = ['کارشناسی', 'کارشناسی ارشد', 'دکتری'];
const faculties = ['فنی و مهندسی', 'علوم پایه', 'ادبیات و علوم انسانی', 'مدیریت و اقتصاد', 'علوم تربیتی'];

const transition = {duration: 0.2, ease: 'easeOut'};

const parseServiceError = (error: unknown): AuthServiceError => {
  if (typeof error === 'object' && error && 'status' in error && 'message' in error) {
    return error as AuthServiceError;
  }
  return {status: 500, message: 'خطایی غیرمنتظره رخ داد.'};
};

export function AuthScreen({locale}: {locale: string}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [loginState, setLoginState] = useState<LoginState>({studentId: '', password: ''});
  const [signupState, setSignupState] = useState<SignupState>({
    email: '',
    otpCode: '',
    firstName: '',
    lastName: '',
    studentId: '',
    degree: '',
    faculty: '',
    major: '',
    specialization: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isSendOtpLoading, setIsSendOtpLoading] = useState(false);
  const [isVerifyOtpLoading, setIsVerifyOtpLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpEnabled, setOtpEnabled] = useState(false);
  const stepTwoFirstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const modeFromUrl = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
    setAuthMode(modeFromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (signupStep === 2) {
      const focusTimer = window.setTimeout(() => stepTwoFirstFieldRef.current?.focus(), 180);
      return () => window.clearTimeout(focusTimer);
    }
  }, [signupStep]);

  const setMode = (nextMode: AuthMode) => {
    setErrors({});
    setAttemptsLeft(null);
    if (nextMode === 'login') {
      setSignupStep(1);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', nextMode);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const validateLogin = () => {
    const nextErrors: FormErrors = {};
    if (!loginState.studentId.trim()) {
      nextErrors.studentId = 'شماره دانشجویی الزامی است.';
    }
    if (!loginState.password) {
      nextErrors.password = 'رمز عبور الزامی است.';
    }
    return nextErrors;
  };

  const validateEmailStep = () => {
    const nextErrors: FormErrors = {};
    if (!signupState.email.trim()) {
      nextErrors.email = 'ایمیل دانشگاهی الزامی است.';
    } else if (!EMAIL_REGEX.test(signupState.email.trim())) {
      nextErrors.email = 'فرمت ایمیل باید در دامنه mail.sbu.ac.ir یا student.sbu.ac.ir باشد.';
    }

    if (!signupState.otpCode.trim()) {
      nextErrors.otp = 'کد تایید را وارد کنید.';
    } else if (signupState.otpCode.replace(/\D/g, '').length !== 6) {
      nextErrors.otp = 'کد تایید باید ۶ رقم باشد.';
    }

    return nextErrors;
  };

  const validateProfileStep = () => {
    const nextErrors: FormErrors = {};

    if (!signupState.firstName.trim()) nextErrors.firstName = 'نام الزامی است.';
    if (!signupState.lastName.trim()) nextErrors.lastName = 'نام خانوادگی الزامی است.';
    if (!signupState.studentId.trim()) nextErrors.studentId = 'شماره دانشجویی الزامی است.';
    if (!signupState.degree.trim()) nextErrors.degree = 'انتخاب مقطع الزامی است.';
    if (!signupState.faculty.trim()) nextErrors.faculty = 'انتخاب دانشکده الزامی است.';
    if (!signupState.major.trim()) nextErrors.major = 'رشته الزامی است.';

    return nextErrors;
  };

  const handleLoginSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateLogin();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsLoginLoading(true);
      await loginUser({
        studentId: loginState.studentId.trim(),
        password: loginState.password
      });
      toast.success('ورود موفقیت‌آمیز بود.');
      router.push(`/${locale}/chat`);
    } catch (error) {
      const serviceError = parseServiceError(error);
      if (serviceError.field) {
        setErrors(prev => ({...prev, [serviceError.field as string]: serviceError.message}));
      }
      toast.error(serviceError.message);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const email = signupState.email.trim();
    const nextErrors: FormErrors = {};
    if (!email) {
      nextErrors.email = 'ایمیل دانشگاهی الزامی است.';
    } else if (!EMAIL_REGEX.test(email)) {
      nextErrors.email = 'ایمیل وارد شده معتبر نیست.';
    }

    setErrors(prev => ({...prev, ...nextErrors}));
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsSendOtpLoading(true);
      await sendOtp({email});
      setOtpEnabled(true);
      setResendCountdown(60);
      setAttemptsLeft(5);
      toast.success('کد تایید ارسال شد.');
    } catch (error) {
      const serviceError = parseServiceError(error);
      if (serviceError.field) {
        setErrors(prev => ({...prev, [serviceError.field as string]: serviceError.message}));
      }
      toast.error(serviceError.message);
    } finally {
      setIsSendOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();

    const nextErrors = validateEmailStep();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsVerifyOtpLoading(true);
      await verifyOtp({email: signupState.email.trim(), code: signupState.otpCode});
      setAttemptsLeft(null);
      toast.success('ایمیل با موفقیت تایید شد.');
      setSignupStep(2);
    } catch (error) {
      const serviceError = parseServiceError(error);
      if (serviceError.field) {
        setErrors(prev => ({...prev, [serviceError.field as string]: serviceError.message}));
      }
      if (serviceError.status === 401) {
        setAttemptsLeft(prev => (prev && prev > 0 ? prev - 1 : prev));
      }
      toast.error(serviceError.message);
    } finally {
      setIsVerifyOtpLoading(false);
    }
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateProfileStep();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsRegisterLoading(true);
      await registerUser({
        email: signupState.email.trim(),
        profile: {
          firstName: signupState.firstName.trim(),
          lastName: signupState.lastName.trim(),
          studentId: signupState.studentId.trim(),
          degree: signupState.degree,
          faculty: signupState.faculty,
          major: signupState.major.trim(),
          specialization: signupState.specialization.trim()
        }
      });
      toast.success('ثبت‌نام با موفقیت انجام شد. رمز عبور اولیه، شماره دانشجویی شماست.');
      setMode('login');
      setSignupStep(1);
      setOtpEnabled(false);
      setResendCountdown(0);
      setSignupState(prev => ({
        ...prev,
        otpCode: '',
        firstName: '',
        lastName: '',
        studentId: '',
        degree: '',
        faculty: '',
        major: '',
        specialization: ''
      }));
      setLoginState(prev => ({...prev, studentId: signupState.studentId.trim(), password: ''}));
    } catch (error) {
      const serviceError = parseServiceError(error);
      if (serviceError.field) {
        setErrors(prev => ({...prev, [serviceError.field as string]: serviceError.message}));
      } else {
        toast.error(serviceError.message);
      }
    } finally {
      setIsRegisterLoading(false);
    }
  };

  const signupStepIndicator = useMemo(
    () => [
      {id: 1, title: 'تایید ایمیل'},
      {id: 2, title: 'اطلاعات دانشجو'}
    ],
    []
  );

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 md:grid-cols-2">
        <aside className="relative hidden overflow-hidden border-l border-border bg-muted/30 p-10 md:flex md:flex-col md:justify-between">
          <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.18),transparent_45%),linear-gradient(45deg,transparent_44%,hsl(var(--border))_45%,transparent_46%),linear-gradient(-45deg,transparent_44%,hsl(var(--border))_45%,transparent_46%)]" />
          <div className="relative z-10 space-y-6">
            <Image src="/Logo.png" alt="لوگوی دانشگاه" width={64} height={64} className="h-16 w-auto" priority />
            <div className="space-y-3">
              <h1 className="text-3xl font-bold leading-snug">دستیار هوشمند دانشگاه شهید بهشتی</h1>
              <p className="max-w-md text-sm text-muted-foreground">
                تجربه‌ای یکپارچه، امن و حرفه‌ای برای ورود و ثبت‌نام در سامانه هوش مصنوعی دانشگاه.
              </p>
            </div>
          </div>
          <p className="relative z-10 text-xs text-muted-foreground">© دانشگاه شهید بهشتی</p>
        </aside>

        <main className="flex items-center justify-center p-4 md:p-10">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
            <LayoutGroup>
              <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1">
                {(['login', 'signup'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setMode(mode)}
                    className={cn(
                      'relative z-10 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      authMode === mode ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {authMode === mode ? (
                      <motion.span
                        layoutId="auth-mode"
                        className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm"
                        transition={transition}
                      />
                    ) : null}
                    {mode === 'login' ? 'ورود' : 'ثبت‌نام'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {authMode === 'login' ? (
                  <motion.form
                    key="login"
                    onSubmit={handleLoginSubmit}
                    className="space-y-4"
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -10}}
                    transition={transition}
                  >
                    <div className="space-y-2">
                      <label htmlFor="login-studentId" className="text-sm font-medium">
                        شماره دانشجویی
                      </label>
                      <Input
                        id="login-studentId"
                        value={loginState.studentId}
                        onChange={event => setLoginState(prev => ({...prev, studentId: event.target.value.replace(/[^0-9]/g, '')}))}
                        placeholder="مثال: 401123456"
                        inputMode="numeric"
                        dir="ltr"
                        disabled={isLoginLoading}
                        aria-invalid={Boolean(errors.studentId)}
                        aria-describedby={errors.studentId ? 'login-studentId-error' : undefined}
                      />
                      {errors.studentId ? (
                        <p id="login-studentId-error" className="text-xs text-destructive">
                          {errors.studentId}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="login-password" className="text-sm font-medium">
                        رمز عبور
                      </label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          value={loginState.password}
                          onChange={event => setLoginState(prev => ({...prev, password: event.target.value}))}
                          placeholder="رمز عبور خود را وارد کنید"
                          disabled={isLoginLoading}
                          aria-invalid={Boolean(errors.password)}
                          aria-describedby={errors.password ? 'login-password-error' : undefined}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(prev => !prev)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password ? (
                        <p id="login-password-error" className="text-xs text-destructive">
                          {errors.password}
                        </p>
                      ) : null}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoginLoading}>
                      {isLoginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      ورود به سامانه
                    </Button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="signup"
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -10}}
                    transition={transition}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3">
                      {signupStepIndicator.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold',
                              signupStep >= item.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
                            )}
                          >
                            {item.id}
                          </div>
                          <span className="text-xs text-muted-foreground">{item.title}</span>
                          {item.id === 1 ? <div className="h-px w-6 bg-border" /> : null}
                        </div>
                      ))}
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                      {signupStep === 1 ? (
                        <motion.form
                          key="signup-step-1"
                          onSubmit={handleVerifyOtp}
                          className="space-y-4"
                          initial={{opacity: 0, x: 12}}
                          animate={{opacity: 1, x: 0}}
                          exit={{opacity: 0, x: -12}}
                          transition={transition}
                        >
                          <div className="space-y-2">
                            <label htmlFor="signup-email" className="text-sm font-medium">
                              ایمیل دانشگاهی
                            </label>
                            <Input
                              id="signup-email"
                              type="email"
                              placeholder="name@mail.sbu.ac.ir"
                              value={signupState.email}
                              onChange={event => setSignupState(prev => ({...prev, email: event.target.value}))}
                              dir="ltr"
                              disabled={isSendOtpLoading || isVerifyOtpLoading}
                              aria-invalid={Boolean(errors.email)}
                              aria-describedby={errors.email ? 'signup-email-error' : undefined}
                            />
                            {errors.email ? (
                              <p id="signup-email-error" className="text-xs text-destructive">
                                {errors.email}
                              </p>
                            ) : null}
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={handleSendOtp}
                            disabled={isSendOtpLoading || resendCountdown > 0}
                          >
                            {isSendOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                            {resendCountdown > 0 ? `ارسال مجدد تا ${resendCountdown} ثانیه` : 'ارسال کد'}
                          </Button>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">کد تایید ۶ رقمی</label>
                            <OtpInput
                              value={signupState.otpCode}
                              onChange={otpCode => setSignupState(prev => ({...prev, otpCode}))}
                              disabled={!otpEnabled || isVerifyOtpLoading}
                              error={errors.otp}
                              autoFocus={otpEnabled}
                            />
                            {attemptsLeft !== null ? (
                              <p className="text-xs text-muted-foreground">تعداد تلاش باقی‌مانده: {attemptsLeft}</p>
                            ) : null}
                          </div>

                          <Button type="submit" className="w-full" disabled={isVerifyOtpLoading || !otpEnabled}>
                            {isVerifyOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            تایید و ادامه
                          </Button>
                        </motion.form>
                      ) : (
                        <motion.form
                          key="signup-step-2"
                          onSubmit={handleRegister}
                          className="space-y-4"
                          initial={{opacity: 0, x: 12}}
                          animate={{opacity: 1, x: 0}}
                          exit={{opacity: 0, x: -12}}
                          transition={transition}
                        >
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                              id="firstName"
                              label="نام"
                              value={signupState.firstName}
                              error={errors.firstName}
                              disabled={isRegisterLoading}
                              onChange={value => setSignupState(prev => ({...prev, firstName: value}))}
                              inputRef={stepTwoFirstFieldRef}
                            />
                            <Field
                              id="lastName"
                              label="نام خانوادگی"
                              value={signupState.lastName}
                              error={errors.lastName}
                              disabled={isRegisterLoading}
                              onChange={value => setSignupState(prev => ({...prev, lastName: value}))}
                            />
                            <Field
                              id="studentId"
                              label="شماره دانشجویی"
                              value={signupState.studentId}
                              error={errors.studentId}
                              disabled={isRegisterLoading}
                              dir="ltr"
                              inputMode="numeric"
                              onChange={value => setSignupState(prev => ({...prev, studentId: value.replace(/[^0-9]/g, '')}))}
                            />

                            <SelectField
                              id="degree"
                              label="مقطع"
                              value={signupState.degree}
                              error={errors.degree}
                              disabled={isRegisterLoading}
                              options={degrees}
                              onChange={value => setSignupState(prev => ({...prev, degree: value}))}
                            />
                            <SelectField
                              id="faculty"
                              label="دانشکده"
                              value={signupState.faculty}
                              error={errors.faculty}
                              disabled={isRegisterLoading}
                              options={faculties}
                              onChange={value => setSignupState(prev => ({...prev, faculty: value}))}
                            />
                            <Field
                              id="major"
                              label="رشته"
                              value={signupState.major}
                              error={errors.major}
                              disabled={isRegisterLoading}
                              onChange={value => setSignupState(prev => ({...prev, major: value}))}
                            />
                            <Field
                              id="specialization"
                              label="گرایش (اختیاری)"
                              value={signupState.specialization}
                              error={errors.specialization}
                              disabled={isRegisterLoading}
                              onChange={value => setSignupState(prev => ({...prev, specialization: value}))}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setSignupStep(1)} disabled={isRegisterLoading}>
                              بازگشت
                            </Button>
                            <Button type="submit" className="flex-1" disabled={isRegisterLoading}>
                              {isRegisterLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              تکمیل ثبت‌نام
                            </Button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </LayoutGroup>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {authMode === 'login' ? 'حساب کاربری ندارید؟' : 'قبلاً ثبت‌نام کرده‌اید؟'}{' '}
              <button
                type="button"
                onClick={() => setMode(authMode === 'login' ? 'signup' : 'login')}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {authMode === 'login' ? 'ثبت‌نام کنید' : 'وارد شوید'}
              </button>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  dir?: 'rtl' | 'ltr';
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  inputRef?: RefObject<HTMLInputElement | null>;
};

function Field({id, label, value, onChange, error, disabled, dir = 'rtl', inputMode, inputRef}: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        dir={dir}
        inputMode={inputMode}
        ref={inputRef}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  error?: string;
  disabled?: boolean;
};

function SelectField({id, label, value, onChange, options, error, disabled}: SelectFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
          error ? 'border-destructive focus:ring-destructive' : ''
        )}
      >
        <option value="">انتخاب کنید</option>
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
