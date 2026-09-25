'use client';

import {UniversityLogo} from '@/components/branding/UniversityLogo';
import surfaceStyles from '@/components/auth/phone-auth-surface.module.css';
import {LoginForm} from '@/components/auth/LoginForm';
import {PasswordResetWizard} from '@/components/auth/PasswordResetWizard';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {isAcceptedPhoneInput, phoneDisplayValue} from '@/lib/auth/phone-number';
import {
  armOtpLane,
  emptyOtpLanes,
  otpSecondsLeft,
  type OtpHold,
  type OtpLane
} from '@/lib/auth/otp-cooldown';
import {ServiceError, isAbortError} from '@/lib/services/auth-service';
import {
  completePhonePasswordReset,
  identifyPhone,
  loginWithPhone,
  registerWithPhone,
  requestPhonePasswordReset,
  requestRegistrationOtp,
  resendActivationOtp,
  verifyActivationOtp,
  verifyPhonePasswordReset,
  verifyRegistrationOtp,
  type PhoneRole,
  type StaffCategory
} from '@/lib/services/phone-auth-service';
import type {LoginResultDTO} from '@/lib/types/auth';
import {useRouter, usePathname, useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useEffect, useRef, useState} from 'react';

type Step =
  | 'identify'
  | 'password'
  | 'activation'
  | 'register-otp'
  | 'register-code'
  | 'register-profile'
  | 'reset-otp'
  | 'reset-password'
  | 'legacy'
  | 'legacy-reset'
  | 'phone-setup'
  | 'imported-password';

type FieldErrors = {
  phone?: string;
  code?: string;
  password?: string[];
  email?: string;
};

const ROLES: PhoneRole[] = ['student', 'professor', 'staff'];
const CATEGORIES: StaffCategory[] = ['faculty_administration', 'vice_presidency', 'other'];

const primaryButtonClass =
  'min-h-11 w-full bg-[#075373] text-base font-semibold text-white hover:bg-[#05384c] focus-visible:ring-[#0a6e8a] disabled:bg-[#d7e6eb] disabled:text-[#0b3a4d] disabled:opacity-100';
const secondaryButtonClass =
  'min-h-11 w-full border-[#075373] bg-white text-base font-semibold text-[#075373] hover:bg-[#e7f4f7] focus-visible:ring-[#0a6e8a] disabled:border-[#b7c9d1] disabled:bg-[#eef3f5] disabled:text-[#1d4d63] disabled:opacity-100';
const quietButtonClass =
  'min-h-11 text-[#075373] hover:bg-[#e7f4f7] focus-visible:ring-[#0a6e8a] disabled:text-[#5c7380] disabled:opacity-100';

function replaceLocaleInPath(pathname: string, nextLocale: string) {
  const segments = pathname.split('/');
  if (segments[1] === 'fa' || segments[1] === 'en') {
    segments[1] = nextLocale;
    return segments.join('/');
  }
  return `/${nextLocale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function safeNextUrl(next: string | null, locale: string) {
  const fallback = `/${locale}/chat`;
  if (!next) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('http')) {
    return fallback;
  }
  return trimmed;
}

function errorText(error: unknown, fallback: string) {
  if (!(error instanceof ServiceError)) return fallback;
  const lines = [error.message, ...(error.details ?? [])];
  for (const messages of Object.values(error.fields ?? {})) lines.push(...messages);
  return lines.filter(Boolean).join('\n') || fallback;
}

function passwordLines(error: ServiceError) {
  const listed = (error.details ?? []).map((line) => line.trim()).filter(Boolean);
  if (listed.length > 0) return listed;
  return error.message ? [error.message] : [];
}

function nextHold(current: OtpHold | null, seconds: number | null | undefined, now: number) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return current;
  return {
    id: (current?.id ?? 0) + 1,
    seconds: Math.ceil(seconds),
    startedAt: now
  };
}

function stepCopy(step: Step) {
  switch (step) {
    case 'password':
      return {title: 'passwordTitle', body: 'passwordBody'} as const;
    case 'activation':
      return {title: 'activationTitle', body: 'activationBody'} as const;
    case 'register-otp':
      return {title: 'registerOtpTitle', body: 'registerOtpBody'} as const;
    case 'register-code':
      return {title: 'registerCodeTitle', body: 'registerCodeBody'} as const;
    case 'register-profile':
      return {title: 'registerTitle', body: 'registerBody'} as const;
    case 'reset-otp':
      return {title: 'resetOtpTitle', body: 'resetOtpBody'} as const;
    case 'reset-password':
      return {title: 'resetPasswordTitle', body: 'resetPasswordBody'} as const;
    case 'imported-password':
      return {title: 'importedTitle', body: 'importedBody'} as const;
    case 'phone-setup':
      return {title: 'setupBody', body: 'setupBody'} as const;
    case 'legacy':
    case 'legacy-reset':
      return {title: 'legacyAction', body: 'legacyBody'} as const;
    default:
      return {title: 'identifyTitle', body: 'identifyBody'} as const;
  }
}

function registrationPhase(step: Step): 1 | 2 | 3 | null {
  if (step === 'identify') return 1;
  if (step === 'register-otp' || step === 'register-code') return 2;
  if (step === 'register-profile') return 3;
  return null;
}

export function PhoneAuthExperience({locale}: {locale: string}) {
  const t = useTranslations('auth.phone');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('identify');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<PhoneRole>('student');
  const [staffCategory, setStaffCategory] = useState<StaffCategory>('other');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<FieldErrors>({});
  const [registrationBlocked, setRegistrationBlocked] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [lanes, setLanes] = useState(emptyOtpLanes);
  const [submitHold, setSubmitHold] = useState<OtpHold | null>(null);
  const [verifyHold, setVerifyHold] = useState<OtpHold | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const activationToken = useRef('');
  const registrationToken = useRef('');
  const resetToken = useRef('');
  const pendingResult = useRef<LoginResultDTO | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const legacyAbort = useRef<AbortController | null>(null);
  const flight = useRef(false);
  const verifyHoldRef = useRef<OtpHold | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const pending =
      (Object.keys(lanes) as OtpLane[]).some((lane) => otpSecondsLeft(lanes[lane], Date.now()) > 0) ||
      otpSecondsLeft(submitHold, Date.now()) > 0 ||
      otpSecondsLeft(verifyHold, Date.now()) > 0;
    if (!pending) return;
    const timer = window.setInterval(() => {
      const next = Date.now();
      setNow(next);
      const still =
        (Object.keys(lanes) as OtpLane[]).some((lane) => otpSecondsLeft(lanes[lane], next) > 0) ||
        otpSecondsLeft(submitHold, next) > 0 ||
        otpSecondsLeft(verifyHold, next) > 0;
      if (!still) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [lanes, submitHold, verifyHold]);

  const displayPhone = phoneDisplayValue(phoneRaw);
  const phoneOk = isAcceptedPhoneInput(phoneRaw);
  const registrationLeft = otpSecondsLeft(lanes.registration, now);
  const activationLeft = otpSecondsLeft(lanes.activation, now);
  const recoveryLeft = otpSecondsLeft(lanes.recovery, now);
  const submitLeft = otpSecondsLeft(submitHold, now);
  const verifyLeft = otpSecondsLeft(verifyHold, now);
  const copy = stepCopy(step === 'phone-setup' ? 'phone-setup' : step);
  const phase = registrationPhase(step);

  const arm = (lane: OtpLane, seconds?: number | null) => {
    const at = Date.now();
    setNow(at);
    setLanes((current) => armOtpLane(current, lane, seconds, at));
  };

  const armSubmit = (seconds?: number | null) => {
    const at = Date.now();
    setNow(at);
    setSubmitHold((current) => nextHold(current, seconds, at));
  };

  const armVerify = (seconds?: number | null) => {
    const at = Date.now();
    setNow(at);
    setVerifyHold((current) => {
      const next = nextHold(current, seconds, at);
      verifyHoldRef.current = next;
      return next;
    });
  };

  const run = async (
    lane: OtpLane | null,
    task: (signal: AbortSignal) => Promise<void>,
    onError?: (caught: unknown) => boolean
  ) => {
    if (flight.current) return;
    flight.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setFieldError({});
    try {
      await task(controller.signal);
    } catch (caught) {
      if (!isAbortError(caught)) {
        if (caught instanceof ServiceError && lane && caught.status === 429) {
          arm(lane, caught.retryAfter);
        }
        if (!onError?.(caught)) setError(errorText(caught, t('genericError')));
      }
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };

  const noteAccepted = (lane: OtpLane, value?: number) => {
    setNotice(t('smsRequested'));
    arm(lane, value);
  };

  const enterApp = (result: LoginResultDTO) => {
    if (result.phoneSetupRequired || result.user.phoneSetupRequired) {
      pendingResult.current = result;
      setStep('phone-setup');
      return;
    }
    continueToDestination(result);
  };

  const continueToDestination = (result: LoginResultDTO) => {
    const incomplete =
      result.isProfileCompleted === false || result.user.isProfileCompleted === false;
    router.replace(incomplete ? `/${locale}/profile` : safeNextUrl(searchParams.get('next'), locale));
    router.refresh();
  };

  const onIdentify = () =>
    run(null, async (signal) => {
      const next = await identifyPhone(phoneRaw, signal);
      setPassword('');
      setCode('');
      setNotice(null);
      setRegistrationBlocked(false);
      setEmailTaken(false);
      setStep(next === 'password' ? 'password' : 'register-otp');
    }, (caught) => {
      if (caught instanceof ServiceError && caught.code === 'invalid_phone_number') {
        setFieldError({phone: caught.message});
        return true;
      }
      return false;
    });

  const onLogin = () =>
    run(null, async (signal) => {
      try {
        const outcome = await loginWithPhone(phoneRaw, password, signal);
        if (outcome.kind === 'activation') {
          activationToken.current = outcome.activationToken;
          setCode('');
          setNotice(t('smsRequested'));
          setStep('activation');
          return;
        }
        enterApp(outcome.result);
      } catch (caught) {
        if (caught instanceof ServiceError && caught.code === 'password_change_required') {
          setNotice(null);
          setStep('imported-password');
        }
        throw caught;
      }
    });

  const onActivationVerify = () =>
    run(null, async (signal) => {
      try {
        const result = await verifyActivationOtp(activationToken.current, code, signal);
        activationToken.current = '';
        enterApp(result);
      } catch (caught) {
        if (caught instanceof ServiceError && caught.code === 'password_change_required') {
          activationToken.current = '';
          setNotice(null);
          setStep('imported-password');
        }
        if (caught instanceof ServiceError && caught.status === 503 && caught.code === 'sms_unavailable') {
          activationToken.current = '';
          setCode('');
          setNotice(t('activationRestart'));
          setStep('password');
        }
        throw caught;
      }
    });

  const onResendActivation = () =>
    run('activation', async (signal) => {
      const accepted = await resendActivationOtp(activationToken.current, signal);
      noteAccepted('activation', accepted.retry_after);
    });

  const onRegisterOtp = () =>
    run('registration', async (signal) => {
      try {
        const accepted = await requestRegistrationOtp(phoneRaw, signal);
        setCode('');
        noteAccepted('registration', accepted.retry_after);
        setStep('register-code');
      } catch (caught) {
        if (caught instanceof ServiceError && caught.code === 'phone_already_registered') {
          registrationToken.current = '';
          setNotice(null);
          setStep('password');
        }
        if (caught instanceof ServiceError && caught.code === 'invalid_phone_number') {
          setFieldError({phone: caught.message});
        }
        throw caught;
      }
    }, (caught) => caught instanceof ServiceError && caught.code === 'invalid_phone_number');

  const onRegisterVerify = () => {
    if (otpSecondsLeft(verifyHoldRef.current, Date.now()) > 0) return;
    return run(null, async (signal) => {
      try {
        const verified = await verifyRegistrationOtp(phoneRaw, code, signal);
        registrationToken.current = verified.registrationToken;
        setRegistrationBlocked(false);
        setEmailTaken(false);
        setNotice(null);
        setStep('register-profile');
      } catch (caught) {
        if (caught instanceof ServiceError && caught.code === 'phone_already_registered') {
          registrationToken.current = '';
          setNotice(null);
          setStep('password');
        }
        throw caught;
      }
    }, (caught) => {
      setNotice(null);
      if (caught instanceof ServiceError && caught.status === 429) {
        armVerify(caught.retryAfter);
        setError(errorText(caught, t('genericError')));
        return true;
      }
      if (caught instanceof ServiceError && caught.code === 'invalid_otp') {
        setFieldError({code: caught.message});
        return true;
      }
      return false;
    });
  };

  const restartRegistration = () => {
    registrationToken.current = '';
    setCode('');
    setError(null);
    setNotice(null);
    setFieldError({});
    setRegistrationBlocked(false);
    setEmailTaken(false);
    setStep('register-otp');
  };

  const onRegister = () =>
    run(null, async (signal) => {
      if (newPassword !== confirmPassword) {
        setFieldError({password: [t('passwordMismatch')]});
        return;
      }
      try {
        const result = await registerWithPhone(
          {
            registrationToken: registrationToken.current,
            firstName,
            lastName,
            password: newPassword,
            role,
            staffCategory: role === 'staff' ? staffCategory : null,
            email
          },
          signal
        );
        registrationToken.current = '';
        enterApp(result);
      } catch (caught) {
        if (caught instanceof ServiceError && caught.code === 'phone_already_registered') {
          registrationToken.current = '';
          setNotice(null);
          setStep('password');
        }
        throw caught;
      }
    }, (caught) => {
      if (!(caught instanceof ServiceError)) return false;
      if (caught.code === 'invalid_password') {
        setFieldError({password: passwordLines(caught)});
        return true;
      }
      if (caught.code === 'email_already_registered') {
        setEmailTaken(true);
        setFieldError({email: caught.message});
        return true;
      }
      if (caught.code === 'invalid_registration') {
        setRegistrationBlocked(true);
        setError(caught.message);
        return true;
      }
      if (caught.status === 429) {
        armSubmit(caught.retryAfter);
        setError(caught.message);
        return true;
      }
      if (caught.status === 503) {
        setError(caught.message);
        return true;
      }
      return false;
    });

  const onResetRequest = () =>
    run('recovery', async (signal) => {
      const accepted = await requestPhonePasswordReset(phoneRaw, signal);
      setCode('');
      noteAccepted('recovery', accepted.retry_after);
      setStep('reset-otp');
    });

  const onResetVerify = () =>
    run('recovery', async (signal) => {
      const verified = await verifyPhonePasswordReset(phoneRaw, code, signal);
      resetToken.current = verified.resetToken;
      setNewPassword('');
      setConfirmPassword('');
      setStep('reset-password');
    });

  const onResetComplete = () =>
    run('recovery', async (signal) => {
      if (newPassword !== confirmPassword) {
        setError(t('passwordMismatch'));
        return;
      }
      try {
        await completePhonePasswordReset(resetToken.current, newPassword, signal);
        resetToken.current = '';
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setNotice(t('resetDone'));
        setStep('password');
      } catch (caught) {
        if (
          caught instanceof ServiceError &&
          (caught.code === 'invalid_reset_token' || caught.code === 'password_reset_unavailable')
        ) {
          resetToken.current = '';
          setNewPassword('');
          setConfirmPassword('');
          setNotice(t('freshCodeHint'));
          setStep('reset-otp');
        }
        throw caught;
      }
    });

  const selectLocale = (nextLocale: 'fa' | 'en') => {
    if (nextLocale === locale) return;
    const params = new URLSearchParams(searchParams.toString());
    const nextPath = replaceLocaleInPath(pathname, nextLocale);
    const query = params.toString();
    router.replace(query ? `${nextPath}?${query}` : nextPath);
  };

  const fieldClass =
    'h-12 w-full min-w-0 rounded-xl border-[#9ec3ce] bg-white text-base text-[#073044] shadow-none placeholder:text-[#4d6a76] focus-visible:border-[#075373] focus-visible:ring-[#075373] disabled:border-[#b7d4dc] disabled:bg-[#f7fbfb] disabled:text-[#073044] disabled:opacity-100';
  const invalidFieldClass = 'border-[#9b2c2c] focus-visible:border-[#9b2c2c] focus-visible:ring-[#9b2c2c]';
  const showPhone =
    step === 'identify' ||
    step === 'password' ||
    step === 'register-otp' ||
    step === 'register-code' ||
    step === 'reset-otp' ||
    step === 'activation';
  const heading = step === 'phone-setup' ? t('university') : t(copy.title);
  const guidance = step === 'phone-setup' ? t('setupBody') : t(copy.body);
  const phoneLocked = busy || step !== 'identify';

  return (
    <main className={`${surfaceStyles.surface} min-h-[100dvh] overflow-x-hidden text-[#073044]`}>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`${surfaceStyles.markPlate} grid h-14 w-14 shrink-0 place-items-center rounded-2xl shadow-sm`}>
              <UniversityLogo alt={t('logoAlt')} onLight className="h-11 w-11" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none text-[#075373]">سها</p>
              <p className="mt-1 text-sm leading-5 text-[#245066]">{t('university')}</p>
            </div>
          </div>
          <div role="group" aria-label={t('language')} dir="ltr" className="flex shrink-0 rounded-xl bg-white p-1 shadow-sm">
            {(['en', 'fa'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={locale === option}
                onClick={() => selectLocale(option)}
                className={`min-h-11 min-w-11 rounded-lg text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075373] ${locale === option ? 'bg-[#075373] text-white' : 'text-[#245066] hover:bg-[#e7f4f7]'}`}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        {phase ? (
          <ol className="mt-4 grid grid-cols-3 gap-2" aria-label={heading}>
            {[
              [1, t('stepNumber')],
              [2, t('stepCode')],
              [3, t('stepAccount')]
            ].map(([index, label]) => {
              const current = index === phase;
              const done = Number(index) < phase;
              return (
                <li
                  key={label}
                  aria-current={current ? 'step' : undefined}
                  className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold leading-5 ${current ? 'bg-[#075373] text-white' : done ? 'bg-[#d7e6eb] text-[#075373]' : 'bg-white text-[#245066]'}`}
                >
                  <span className="me-2 inline-grid h-6 w-6 place-items-center rounded-full bg-white/20 text-xs">{index}</span>
                  {label}
                </li>
              );
            })}
          </ol>
        ) : null}

        <section className="mt-4 grid gap-6 border-s-4 border-[#075373] bg-white px-4 py-5 shadow-sm sm:px-8 sm:py-8 lg:mt-6">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-[#0a6e8a]">{t('university')}</p>
            <h1 className="mt-2 text-3xl font-bold leading-10 text-[#06384c]">{heading}</h1>
            <p className="mt-3 text-base leading-8 text-[#245066]">{guidance}</p>
          </div>

          {error ? (
            <p role="alert" className="whitespace-pre-line rounded-xl bg-[#fdecec] px-3 py-3 text-sm leading-6 text-[#6f1d1d]">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-xl bg-[#e7f6f8] px-3 py-3 text-sm leading-6 text-[#075373]">{notice}</p>
          ) : null}

          {showPhone ? (
            <label className="block max-w-xl text-sm font-semibold">
              {t('phoneLabel')}
              <Input
                value={phoneRaw}
                onChange={(event) => {
                  setPhoneRaw(event.target.value);
                  setFieldError((current) => ({...current, phone: undefined}));
                }}
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                disabled={phoneLocked}
                aria-invalid={fieldError.phone ? true : undefined}
                className={`${fieldClass} mt-2 ${fieldError.phone ? invalidFieldClass : ''}`}
                placeholder="09123456789"
              />
              {displayPhone !== phoneRaw ? (
                <span className="mt-1 block text-xs text-[#245066]" dir="ltr">
                  {displayPhone}
                </span>
              ) : null}
            </label>
          ) : null}
          {showPhone && fieldError.phone ? (
            <span role="alert" className="-mt-4 block max-w-xl text-sm leading-6 text-[#9b2c2c]">{fieldError.phone}</span>
          ) : null}

          {step === 'identify' ? (
            <div className="grid max-w-xl gap-3">
              <Button type="button" className={primaryButtonClass} disabled={busy || !phoneOk} onClick={onIdentify}>
                {busy ? t('loading') : t('continue')}
              </Button>
              <div className="rounded-2xl bg-[#f3f8f8] p-4">
                <p className="text-sm leading-7 text-[#245066]">{t('legacyLead')}</p>
                <Button type="button" variant="outline" className={`${secondaryButtonClass} mt-3`} onClick={() => setStep('legacy')}>
                  {t('legacyAction')}
                </Button>
              </div>
            </div>
          ) : null}

          {step === 'password' ? (
            <form
              className="grid max-w-xl gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                onLogin();
              }}
            >
              <label className="text-sm font-semibold">
                {t('passwordLabel')}
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className={`${fieldClass} mt-2`}
                />
              </label>
              <button type="button" className={`${quietButtonClass} text-start text-sm font-semibold`} onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? t('hidePassword') : t('showPassword')}
              </button>
              <Button type="submit" className={primaryButtonClass} disabled={busy || !password}>
                {busy ? t('loading') : t('signIn')}
              </Button>
              <Button type="button" variant="outline" className={secondaryButtonClass} onClick={onResetRequest} disabled={busy || recoveryLeft > 0}>
                {recoveryLeft > 0 ? t('resendWait', {seconds: recoveryLeft}) : t('forgot')}
              </Button>
              <Button type="button" variant="ghost" className={quietButtonClass} onClick={() => setStep('identify')}>
                {t('back')}
              </Button>
            </form>
          ) : null}

          {step === 'register-otp' ? (
            <div className="grid max-w-xl gap-3">
              <div className="rounded-2xl bg-[#f3f8f8] p-4">
                <p className="text-sm font-bold leading-7 text-[#06384c]">{t('registerWarningTitle')}</p>
                <p className="mt-1 text-sm leading-7 text-[#245066]">{t('registerWarningBody')}</p>
                <Button type="button" variant="outline" className={`${secondaryButtonClass} mt-3`} onClick={() => setStep('legacy')}>
                  {t('legacyAction')}
                </Button>
              </div>
              <Button type="button" className={primaryButtonClass} disabled={busy || registrationLeft > 0} onClick={onRegisterOtp}>
                {registrationLeft > 0 ? t('resendWait', {seconds: registrationLeft}) : t('sendCode')}
              </Button>
              <Button type="button" variant="ghost" className={quietButtonClass} onClick={() => setStep('identify')}>
                {t('back')}
              </Button>
            </div>
          ) : null}

          {step === 'register-code' ? (
            <div className="grid max-w-xl gap-3">
              <CodeField
                value={code}
                onChange={(value) => {
                  setCode(value);
                  setFieldError((current) => ({...current, code: undefined}));
                }}
                label={t('codeLabel')}
                className={fieldClass}
                invalid={Boolean(fieldError.code)}
                error={fieldError.code}
              />
              <Button type="button" className={primaryButtonClass} disabled={busy || verifyLeft > 0 || code.trim().length === 0} onClick={onRegisterVerify}>
                {busy ? t('loading') : verifyLeft > 0 ? t('verifyWait', {seconds: verifyLeft}) : t('verify')}
              </Button>
              <Button type="button" variant="outline" className={secondaryButtonClass} disabled={busy || registrationLeft > 0} onClick={onRegisterOtp}>
                {registrationLeft > 0 ? t('resendWait', {seconds: registrationLeft}) : t('resend')}
              </Button>
              <Button type="button" variant="ghost" className={quietButtonClass} onClick={() => setStep('register-otp')}>
                {t('back')}
              </Button>
            </div>
          ) : null}

          {step === 'activation' ? (
            <div className="grid max-w-xl gap-3">
              <CodeField value={code} onChange={setCode} label={t('codeLabel')} className={fieldClass} />
              <Button type="button" className={primaryButtonClass} disabled={busy || code.trim().length === 0} onClick={onActivationVerify}>
                {busy ? t('loading') : t('verify')}
              </Button>
              <Button type="button" variant="outline" className={secondaryButtonClass} disabled={busy || activationLeft > 0} onClick={onResendActivation}>
                {activationLeft > 0 ? t('resendWait', {seconds: activationLeft}) : t('resend')}
              </Button>
              <Button type="button" variant="ghost" className={quietButtonClass} onClick={() => setStep('password')}>
                {t('back')}
              </Button>
            </div>
          ) : null}

          {step === 'reset-otp' ? (
            <div className="grid max-w-xl gap-3">
              <CodeField value={code} onChange={setCode} label={t('codeLabel')} className={fieldClass} />
              <Button type="button" className={primaryButtonClass} disabled={busy || code.trim().length === 0} onClick={onResetVerify}>
                {busy ? t('loading') : t('verify')}
              </Button>
              <Button type="button" variant="outline" className={secondaryButtonClass} disabled={busy || recoveryLeft > 0} onClick={onResetRequest}>
                {recoveryLeft > 0 ? t('resendWait', {seconds: recoveryLeft}) : t('resend')}
              </Button>
              <Button type="button" variant="ghost" className={quietButtonClass} onClick={() => setStep('password')}>
                {t('back')}
              </Button>
            </div>
          ) : null}

          {step === 'register-profile' ? (
            <form
              className="grid max-w-xl gap-4 pb-4"
              onSubmit={(event) => {
                event.preventDefault();
                onRegister();
              }}
            >
              <TextField label={t('firstName')} value={firstName} onChange={setFirstName} className={fieldClass} autoComplete="given-name" />
              <TextField label={t('lastName')} value={lastName} onChange={setLastName} className={fieldClass} autoComplete="family-name" />
              <label className="text-sm font-semibold">
                {t('role')}
                <select value={role} onChange={(event) => setRole(event.target.value as PhoneRole)} className={`${fieldClass} mt-2 px-3`}>
                  {ROLES.map((item) => (
                    <option key={item} value={item}>{t(`roles.${item}`)}</option>
                  ))}
                </select>
              </label>
              {role === 'staff' ? (
                <label className="text-sm font-semibold">
                  {t('staffCategory')}
                  <select value={staffCategory} onChange={(event) => setStaffCategory(event.target.value as StaffCategory)} className={`${fieldClass} mt-2 px-3`}>
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>{t(`categories.${item}`)}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <TextField
                label={t('emailOptional')}
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  setEmailTaken(false);
                  setFieldError((current) => ({...current, email: undefined}));
                }}
                className={`${fieldClass} ${fieldError.email ? invalidFieldClass : ''}`}
                autoComplete="email"
                dir="ltr"
                invalid={Boolean(fieldError.email)}
                error={fieldError.email}
              />
              {emailTaken ? (
                <div className="rounded-2xl bg-[#f3f8f8] p-4">
                  <p className="text-sm leading-7 text-[#245066]">{t('emailTakenHint')}</p>
                  <Button type="button" variant="outline" className={`${secondaryButtonClass} mt-3`} onClick={() => setStep('legacy')}>
                    {t('emailAccountPath')}
                  </Button>
                </div>
              ) : (
                <p className="text-sm leading-7 text-[#245066]">{t('emailHint')}</p>
              )}
              <TextField
                label={t('passwordLabel')}
                value={newPassword}
                onChange={(value) => {
                  setNewPassword(value);
                  setFieldError((current) => ({...current, password: undefined}));
                }}
                className={`${fieldClass} ${fieldError.password ? invalidFieldClass : ''}`}
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                invalid={Boolean(fieldError.password)}
              />
              <button type="button" className={`${quietButtonClass} justify-start text-sm font-semibold`} onClick={() => setShowNewPassword((value) => !value)}>
                {showNewPassword ? t('hidePassword') : t('showPassword')}
              </button>
              <p className="text-sm leading-7 text-[#245066]">{t('passwordGuide')}</p>
              {fieldError.password?.length ? (
                <ul role="alert" className="grid gap-1 rounded-xl bg-[#fdecec] px-3 py-3 text-sm leading-6 text-[#6f1d1d]">
                  {fieldError.password.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              <TextField label={t('confirmPassword')} value={confirmPassword} onChange={setConfirmPassword} className={fieldClass} type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" />
              <Button type="submit" className={primaryButtonClass} disabled={busy || submitLeft > 0 || !firstName.trim() || !lastName.trim() || !newPassword}>
                {busy ? t('loading') : submitLeft > 0 ? t('resendWait', {seconds: submitLeft}) : t('createAccount')}
              </Button>
              {registrationBlocked ? (
                <div className="rounded-2xl bg-[#f3f8f8] p-4">
                  <p className="text-sm leading-7 text-[#245066]">{t('registrationInvalidHint')}</p>
                  <Button type="button" variant="outline" className={`${secondaryButtonClass} mt-3`} onClick={restartRegistration}>
                    {t('requestFreshCode')}
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className={secondaryButtonClass} onClick={restartRegistration}>
                  {t('restartRegistration')}
                </Button>
              )}
            </form>
          ) : null}

          {step === 'reset-password' ? (
            <form
              className="grid max-w-xl gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                onResetComplete();
              }}
            >
              <TextField label={t('passwordLabel')} value={newPassword} onChange={setNewPassword} className={fieldClass} type="password" autoComplete="new-password" />
              <TextField label={t('confirmPassword')} value={confirmPassword} onChange={setConfirmPassword} className={fieldClass} type="password" autoComplete="new-password" />
              <Button type="submit" className={primaryButtonClass} disabled={busy || !newPassword}>
                {busy ? t('loading') : t('savePassword')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={secondaryButtonClass}
                onClick={() => {
                  resetToken.current = '';
                  setNotice(t('freshCodeHint'));
                  setStep('reset-otp');
                }}
              >
                {t('resend')}
              </Button>
            </form>
          ) : null}

          {step === 'legacy' ? (
            <div className="max-w-xl rounded-2xl bg-[#06384c] p-4 text-slate-100 sm:p-5">
              <LoginForm
                busy={busy}
                setBusy={setBusy}
                abortRef={legacyAbort}
                onForgotPassword={() => setStep('legacy-reset')}
                onSuccess={enterApp}
              />
              <Button type="button" variant="ghost" className={surfaceStyles.legacyBack} onClick={() => setStep('identify')}>
                {t('back')}
              </Button>
            </div>
          ) : null}

          {step === 'legacy-reset' ? (
            <div className="max-w-xl rounded-2xl bg-[#06384c] p-4 text-slate-100 sm:p-5">
              <PasswordResetWizard
                busy={busy}
                setBusy={setBusy}
                controllerRefs={{
                  requestOtp: abortRef,
                  verifyOtp: abortRef,
                  complete: abortRef
                }}
                onBackToLogin={() => setStep('legacy')}
                onCompleted={() => {
                  setNotice(t('resetDone'));
                  setStep('legacy');
                }}
              />
            </div>
          ) : null}

          {step === 'phone-setup' ? (
            <div className="grid max-w-xl gap-3">
              <Button
                type="button"
                className={primaryButtonClass}
                onClick={() => {
                  const result = pendingResult.current;
                  if (!result) return;
                  continueToDestination(result);
                }}
              >
                {t('continueToApp')}
              </Button>
            </div>
          ) : null}

          {step === 'imported-password' ? (
            <div className="grid max-w-xl gap-3">
              <p className="rounded-2xl bg-[#f3f8f8] p-4 text-sm leading-7 text-[#0b3a4d]">{t('importedSupport')}</p>
              <Button type="button" className={primaryButtonClass} onClick={() => setStep('legacy')}>
                {t('importedHaveCredentials')}
              </Button>
              <Button type="button" variant="ghost" className={quietButtonClass} onClick={() => setStep('identify')}>
                {t('back')}
              </Button>
            </div>
          ) : null}
        </section>
        <p className="mt-6 hidden max-w-xl text-sm leading-7 text-[#245066] lg:block">{t('desktopBrand')}</p>
      </div>
    </main>
  );
}

function TextField({
  label,
  value,
  onChange,
  className,
  type = 'text',
  autoComplete,
  dir,
  invalid,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  type?: string;
  autoComplete?: string;
  dir?: 'ltr' | 'rtl';
  invalid?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">
        {label}
        <Input
          value={value}
          type={type}
          dir={dir}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} mt-2`}
        />
      </label>
      {error ? <span role="alert" className="mt-1 block text-sm font-medium leading-6 text-[#9b2c2c]">{error}</span> : null}
    </div>
  );
}

function CodeField({
  label,
  value,
  onChange,
  className,
  invalid,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  invalid?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">
        {label}
        <Input
          value={value}
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} mt-2 ${invalid ? 'border-[#9b2c2c] focus-visible:ring-[#9b2c2c]' : ''}`}
        />
      </label>
      {error ? <span role="alert" className="mt-1 block text-sm leading-6 text-[#9b2c2c]">{error}</span> : null}
    </div>
  );
}
