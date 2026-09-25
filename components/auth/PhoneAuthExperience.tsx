'use client';

import {UniversityLogo} from '@/components/branding/UniversityLogo';
import {LoginForm} from '@/components/auth/LoginForm';
import {PasswordResetWizard} from '@/components/auth/PasswordResetWizard';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {isAcceptedPhoneInput, phoneDisplayValue} from '@/lib/auth/phone-number';
import {
  armOtpLane,
  emptyOtpLanes,
  otpSecondsLeft,
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
  | 'register-profile'
  | 'reset-otp'
  | 'reset-password'
  | 'legacy'
  | 'legacy-reset'
  | 'phone-setup'
  | 'imported-password';

const ROLES: PhoneRole[] = ['student', 'professor', 'staff'];
const CATEGORIES: StaffCategory[] = ['faculty_administration', 'vice_presidency', 'other'];

const primaryButtonClass =
  'min-h-12 bg-[#075373] text-base text-white hover:bg-[#05384c] focus-visible:ring-[#0a8baa] disabled:bg-[#d7e6eb] disabled:text-[#0b3a4d] disabled:opacity-100';
const secondaryButtonClass =
  'min-h-12 border-[#075373] bg-white text-base text-[#075373] hover:bg-[#e7f4f7] focus-visible:ring-[#0a8baa] disabled:border-[#b7c9d1] disabled:bg-[#eef3f5] disabled:text-[#1d4d63] disabled:opacity-100';
const quietButtonClass =
  'min-h-11 text-[#075373] hover:bg-[#e7f4f7] focus-visible:ring-[#0a8baa] disabled:text-[#5c7380] disabled:opacity-100';

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

function stepCopy(step: Step) {
  switch (step) {
    case 'password':
      return {title: 'passwordTitle', body: 'passwordBody'} as const;
    case 'activation':
      return {title: 'activationTitle', body: 'activationBody'} as const;
    case 'register-otp':
      return {title: 'registerOtpTitle', body: 'registerOtpBody'} as const;
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lanes, setLanes] = useState(emptyOtpLanes);
  const [now, setNow] = useState(() => Date.now());
  const activationToken = useRef('');
  const registrationToken = useRef('');
  const resetToken = useRef('');
  const pendingResult = useRef<LoginResultDTO | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const legacyAbort = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const pending = (Object.keys(lanes) as OtpLane[]).some(
      (lane) => otpSecondsLeft(lanes[lane], Date.now()) > 0
    );
    if (!pending) return;
    const timer = window.setInterval(() => {
      const next = Date.now();
      setNow(next);
      const still = (Object.keys(lanes) as OtpLane[]).some(
        (lane) => otpSecondsLeft(lanes[lane], next) > 0
      );
      if (!still) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [lanes]);

  const displayPhone = phoneDisplayValue(phoneRaw);
  const phoneOk = isAcceptedPhoneInput(phoneRaw);
  const registrationLeft = otpSecondsLeft(lanes.registration, now);
  const activationLeft = otpSecondsLeft(lanes.activation, now);
  const recoveryLeft = otpSecondsLeft(lanes.recovery, now);
  const copy = stepCopy(step === 'phone-setup' ? 'phone-setup' : step);

  const arm = (lane: OtpLane, seconds?: number | null) => {
    const at = Date.now();
    setNow(at);
    setLanes((current) => armOtpLane(current, lane, seconds, at));
  };

  const run = async (lane: OtpLane | null, task: (signal: AbortSignal) => Promise<void>) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    try {
      await task(controller.signal);
    } catch (caught) {
      if (!isAbortError(caught)) {
        if (caught instanceof ServiceError && lane && caught.status === 429) {
          arm(lane, caught.retryAfter);
        }
        setError(errorText(caught, t('genericError')));
      }
    } finally {
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
      setStep(next === 'password' ? 'password' : 'register-otp');
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
      } catch (caught) {
        if (caught instanceof ServiceError && caught.code === 'phone_already_registered') {
          registrationToken.current = '';
          setNotice(null);
          setStep('password');
        }
        throw caught;
      }
    });

  const onRegisterVerify = () =>
    run('registration', async (signal) => {
      try {
        const verified = await verifyRegistrationOtp(phoneRaw, code, signal);
        registrationToken.current = verified.registrationToken;
        setStep('register-profile');
      } catch (caught) {
        if (caught instanceof ServiceError && caught.code === 'phone_already_registered') {
          registrationToken.current = '';
          setNotice(null);
          setStep('password');
        }
        throw caught;
      }
    });

  const restartRegistration = () => {
    registrationToken.current = '';
    setCode('');
    setError(null);
    setNotice(null);
    setStep('register-otp');
  };

  const onRegister = () =>
    run(null, async (signal) => {
      if (newPassword !== confirmPassword) {
        setError(t('passwordMismatch'));
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
    'h-12 w-full min-w-0 rounded-xl border-[#b7d4dc] bg-white text-base text-[#073044] shadow-none focus-visible:border-[#0a8baa] focus-visible:ring-[#0a8baa] disabled:border-[#b7d4dc] disabled:bg-white disabled:text-[#073044] disabled:opacity-100';
  const showPhone =
    step === 'identify' ||
    step === 'password' ||
    step === 'register-otp' ||
    step === 'reset-otp' ||
    step === 'activation';
  const heading = step === 'phone-setup' ? t('university') : t(copy.title);
  const guidance = step === 'phone-setup' ? t('setupBody') : t(copy.body);

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#f3f8f8] text-[#073044] [color-scheme:light]">
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] lg:items-center lg:gap-16 lg:px-10">
        <aside className="hidden lg:block">
          <UniversityLogo alt={t('logoAlt')} className="h-16 w-16" />
          <p className="mt-6 text-5xl font-bold leading-none text-[#075373]">سها</p>
          <p className="mt-4 max-w-md text-lg leading-8 text-[#0b3a4d]">{t('university')}</p>
          <p className="mt-4 max-w-md text-base leading-8 text-[#3d6574]">{t('desktopBrand')}</p>
        </aside>

        <div className="flex min-h-[100dvh] w-full flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:min-h-0 lg:px-0 lg:py-10">
          <header className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <UniversityLogo alt={t('logoAlt')} className="h-12 w-12 shrink-0" />
              <div className="min-w-0">
                <p className="text-xl font-bold leading-7 text-[#075373]">سها</p>
                <p className="text-xs leading-5 text-[#3d6574]">{t('university')}</p>
              </div>
            </div>
            <div
              role="group"
              aria-label={t('language')}
              dir="ltr"
              className="ms-auto flex shrink-0 rounded-xl bg-white p-1"
            >
              {(['en', 'fa'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={locale === option}
                  onClick={() => selectLocale(option)}
                  className={`min-h-11 min-w-11 rounded-lg text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a8baa] ${locale === option ? 'bg-[#075373] text-white' : 'text-[#3d6574]'}`}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </header>

          <section className="mt-6 rounded-3xl border border-[#c5e0e6] bg-white p-4 shadow-sm sm:p-6 lg:mt-8">
            <h1 className="text-2xl font-bold leading-9 text-[#06384c]">{heading}</h1>
            <p className="mt-2 text-sm leading-7 text-[#3d6574]">{guidance}</p>

            {error ? (
              <p role="alert" className="mt-4 whitespace-pre-line rounded-xl bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="mt-4 rounded-xl bg-[#e7f6f8] px-3 py-2 text-sm leading-6 text-[#075373]">{notice}</p>
            ) : null}

            {showPhone ? (
              <label className="mt-5 block text-sm font-medium">
                {t('phoneLabel')}
                <Input
                  value={phoneRaw}
                  onChange={(event) => setPhoneRaw(event.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  disabled={busy || step !== 'identify'}
                  className={`${fieldClass} mt-2`}
                  placeholder="09123456789"
                />
                {displayPhone !== phoneRaw ? (
                  <span className="mt-1 block text-xs text-[#3d6574]" dir="ltr">
                    {displayPhone}
                  </span>
                ) : null}
              </label>
            ) : null}

            {step === 'identify' ? (
              <div className="mt-4 grid gap-3">
                <Button type="button" className={primaryButtonClass} disabled={busy || !phoneOk} onClick={onIdentify}>
                  {busy ? t('loading') : t('continue')}
                </Button>
                <Button type="button" variant="outline" className={secondaryButtonClass} onClick={() => setStep('legacy')}>
                  {t('legacyAction')}
                </Button>
              </div>
            ) : null}

            {step === 'password' ? (
              <form
                className="mt-4 grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  onLogin();
                }}
              >
                <label className="text-sm font-medium">
                  {t('passwordLabel')}
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className={`${fieldClass} mt-2`}
                  />
                </label>
                <button type="button" className={`${quietButtonClass} text-start text-sm font-medium`} onClick={() => setShowPassword((value) => !value)}>
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
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-7 text-amber-950">
                  <p className="font-bold">{t('registerWarningTitle')}</p>
                  <p className="mt-1">{t('registerWarningBody')}</p>
                  <Button type="button" variant="outline" className={`${secondaryButtonClass} mt-3 w-full bg-white`} onClick={() => setStep('legacy')}>
                    {t('legacyAction')}
                  </Button>
                </div>
                <Button type="button" className={primaryButtonClass} disabled={busy || registrationLeft > 0} onClick={onRegisterOtp}>
                  {registrationLeft > 0 ? t('resendWait', {seconds: registrationLeft}) : t('sendCode')}
                </Button>
                <CodeField value={code} onChange={setCode} label={t('codeLabel')} className={fieldClass} />
                <Button type="button" className={primaryButtonClass} disabled={busy || code.trim().length === 0} onClick={onRegisterVerify}>
                  {busy ? t('loading') : t('verify')}
                </Button>
                <Button type="button" variant="ghost" className={quietButtonClass} onClick={() => setStep('identify')}>
                  {t('back')}
                </Button>
              </div>
            ) : null}

            {step === 'activation' ? (
              <div className="mt-4 grid gap-3">
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
              <div className="mt-4 grid gap-3">
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
                className="mt-4 grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  onRegister();
                }}
              >
                <TextField label={t('firstName')} value={firstName} onChange={setFirstName} className={fieldClass} autoComplete="given-name" />
                <TextField label={t('lastName')} value={lastName} onChange={setLastName} className={fieldClass} autoComplete="family-name" />
                <label className="text-sm font-medium">
                  {t('role')}
                  <select value={role} onChange={(event) => setRole(event.target.value as PhoneRole)} className={`${fieldClass} mt-2 px-3`}>
                    {ROLES.map((item) => (
                      <option key={item} value={item}>{t(`roles.${item}`)}</option>
                    ))}
                  </select>
                </label>
                {role === 'staff' ? (
                  <label className="text-sm font-medium">
                    {t('staffCategory')}
                    <select value={staffCategory} onChange={(event) => setStaffCategory(event.target.value as StaffCategory)} className={`${fieldClass} mt-2 px-3`}>
                      {CATEGORIES.map((item) => (
                        <option key={item} value={item}>{t(`categories.${item}`)}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <TextField label={t('emailOptional')} value={email} onChange={setEmail} className={fieldClass} autoComplete="email" dir="ltr" />
                <p className="text-xs leading-6 text-[#3d6574]">{t('emailHint')}</p>
                <TextField label={t('passwordLabel')} value={newPassword} onChange={setNewPassword} className={fieldClass} type={showPassword ? 'text' : 'password'} autoComplete="new-password" />
                <TextField label={t('confirmPassword')} value={confirmPassword} onChange={setConfirmPassword} className={fieldClass} type={showPassword ? 'text' : 'password'} autoComplete="new-password" />
                <Button type="submit" className={primaryButtonClass} disabled={busy || !firstName.trim() || !lastName.trim() || !newPassword}>
                  {busy ? t('loading') : t('createAccount')}
                </Button>
                <Button type="button" variant="outline" className={secondaryButtonClass} onClick={restartRegistration}>
                  {t('restartRegistration')}
                </Button>
              </form>
            ) : null}

            {step === 'reset-password' ? (
              <form
                className="mt-4 grid gap-3"
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
              <div className="mt-4">
                <LoginForm
                  busy={busy}
                  setBusy={setBusy}
                  abortRef={legacyAbort}
                  onForgotPassword={() => setStep('legacy-reset')}
                  onSuccess={enterApp}
                />
                <Button type="button" variant="ghost" className={`${quietButtonClass} mt-3 w-full`} onClick={() => setStep('identify')}>
                  {t('back')}
                </Button>
              </div>
            ) : null}

            {step === 'legacy-reset' ? (
              <div className="mt-4">
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
              <div className="mt-4 grid gap-3">
                <Button
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => {
                    const result = pendingResult.current;
                    if (!result) return;
                    result.phoneSetupRequired = false;
                    result.user.phoneSetupRequired = false;
                    enterApp(result);
                  }}
                >
                  {t('continueToApp')}
                </Button>
              </div>
            ) : null}

            {step === 'imported-password' ? (
              <div className="mt-4 grid gap-3">
                <p className="rounded-2xl border border-[#c5e0e6] bg-[#f3f8f8] p-3 text-sm leading-7 text-[#0b3a4d]">
                  {t('importedSupport')}
                </p>
                <Button type="button" className={primaryButtonClass} onClick={() => setStep('legacy')}>
                  {t('importedHaveCredentials')}
                </Button>
                <Button type="button" variant="ghost" className={quietButtonClass} onClick={() => setStep('identify')}>
                  {t('back')}
                </Button>
              </div>
            ) : null}
          </section>
        </div>
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
  dir
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  type?: string;
  autoComplete?: string;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <Input
        value={value}
        type={type}
        dir={dir}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={`${className} mt-2`}
      />
    </label>
  );
}

function CodeField({
  label,
  value,
  onChange,
  className
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <Input
        value={value}
        inputMode="numeric"
        autoComplete="one-time-code"
        dir="ltr"
        onChange={(event) => onChange(event.target.value)}
        className={`${className} mt-2`}
      />
    </label>
  );
}
