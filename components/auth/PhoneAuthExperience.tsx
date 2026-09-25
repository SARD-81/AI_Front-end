'use client';

import {UniversityLogo} from '@/components/branding/UniversityLogo';
import surfaceStyles from '@/components/auth/phone-auth-surface.module.css';
import {LoginForm} from '@/components/auth/LoginForm';
import {PasswordResetWizard} from '@/components/auth/PasswordResetWizard';
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
  | 'choose'
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
    case 'choose':
      return {title: 'chooseTitle', body: 'chooseBody'} as const;
    default:
      return {title: 'identifyTitle', body: 'identifyBody'} as const;
  }
}

function registrationPhase(step: Step): 1 | 2 | 3 | null {
  if (step === 'register-otp') return 1;
  if (step === 'register-code') return 2;
  if (step === 'register-profile') return 3;
  return null;
}

export function PhoneAuthExperience({locale}: {locale: string}) {
  const t = useTranslations('auth.phone');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('choose');
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

  const go = (next: Step) => {
    setError(null);
    setNotice(null);
    setFieldError({});
    setStep(next);
  };

  const forgetSecrets = () => {
    abortRef.current?.abort();
    legacyAbort.current?.abort();
    activationToken.current = '';
    registrationToken.current = '';
    resetToken.current = '';
    pendingResult.current = null;
    setPassword('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setEmail('');
    setShowPassword(false);
    setShowNewPassword(false);
    setError(null);
    setNotice(null);
    setFieldError({});
    setEmailTaken(false);
    setRegistrationBlocked(false);
  };

  const rememberEntry = (entry: 'choose' | 'phone' | 'email') => {
    const url = new URL(window.location.href);
    if (entry === 'choose') url.searchParams.delete('entry');
    else url.searchParams.set('entry', entry);
    window.history.pushState({entry}, '', `${url.pathname}${url.search}`);
  };

  const openPhonePath = () => {
    forgetSecrets();
    setStep('identify');
    rememberEntry('phone');
  };

  const openEmailPath = () => {
    forgetSecrets();
    setStep('legacy');
    rememberEntry('email');
  };

  const changeMethod = () => {
    forgetSecrets();
    setStep('choose');
    rememberEntry('choose');
  };

  useEffect(() => {
    const onPop = () => {
      const entry = new URLSearchParams(window.location.search).get('entry');
      forgetSecrets();
      setStep(entry === 'phone' ? 'identify' : entry === 'email' ? 'legacy' : 'choose');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (step === 'choose') return;
    document.getElementById('auth-step-title')?.focus();
  }, [step]);

  const selectLocale = (nextLocale: 'fa' | 'en') => {
    if (nextLocale === locale) return;
    const params = new URLSearchParams(searchParams.toString());
    const nextPath = replaceLocaleInPath(pathname, nextLocale);
    const query = params.toString();
    router.replace(query ? `${nextPath}?${query}` : nextPath);
  };


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
  const inputClass = (invalid?: boolean, extra?: string) =>
    [surfaceStyles.input, invalid ? surfaceStyles.invalid : '', extra ?? ''].filter(Boolean).join(' ');

  return (
    <main id="main-content" className={surfaceStyles.surface}>
      <div className={surfaceStyles.canvas}>
        <section className={surfaceStyles.identity}>
          <div className={surfaceStyles.fieldArt} aria-hidden="true">
            <span className={surfaceStyles.glow} />
            <span className={surfaceStyles.veil} />
            <CampusField className={surfaceStyles.arches} />
          </div>
          <div role="group" aria-label={t('language')} className={surfaceStyles.languages}>
            <div dir="ltr" className={surfaceStyles.languageRow}>
            {(['en', 'fa'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={locale === option}
                onClick={() => selectLocale(option)}
                className={locale === option ? surfaceStyles.languageOn : surfaceStyles.language}
              >
                {option.toUpperCase()}
              </button>
            ))}
            </div>
          </div>
          <div className={surfaceStyles.identityCopy}>
            <div className={surfaceStyles.brandRow}>
              <span className={surfaceStyles.markPlate}>
                <UniversityLogo alt={t('logoAlt')} onLight className="h-11 w-11 lg:h-14 lg:w-14" />
              </span>
              <p className={`${surfaceStyles.wordmark} font-display-fa`}>{t('brandName')}</p>
            </div>
            <p className={surfaceStyles.identityLine}>{t('identityLine')}</p>
          </div>
        </section>

        <div className={surfaceStyles.sheet}>
          <section className={surfaceStyles.panel} aria-labelledby="auth-step-title">
            {step === 'password' || step === 'register-otp' || step === 'register-code' || step === 'activation' || step === 'reset-otp' || step === 'legacy' || step === 'legacy-reset' || step === 'imported-password' ? (
              <button
                type="button"
                className={surfaceStyles.back}
                onClick={() => {
                  if (step === 'legacy-reset') go('legacy');
                  else if (step === 'register-code') go('register-otp');
                  else if (step === 'activation' || step === 'reset-otp') go('password');
                  else go('identify');
                }}
              >
                {t('back')}
              </button>
            ) : null}
            <h1 id="auth-step-title" className={surfaceStyles.title} tabIndex={-1}>
              {heading}
            </h1>
            <p className={surfaceStyles.lead}>{guidance}</p>

            {phase ? (
              <ol className={surfaceStyles.progress} aria-label={t('registerProgress')}>
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
                      className={current ? surfaceStyles.stepOn : done ? surfaceStyles.stepDone : surfaceStyles.step}
                    >
                      <span className={surfaceStyles.stepIndex}>{index}</span>
                      {label}
                    </li>
                  );
                })}
              </ol>
            ) : null}

            {error ? (
              <p role="alert" className={`${surfaceStyles.banner} whitespace-pre-line`}>
                <span className={surfaceStyles.mark} aria-hidden="true">!</span>
                <span>{error}</span>
              </p>
            ) : null}
            {notice ? (
              <p className={surfaceStyles.notice} role="status">
                <span className={surfaceStyles.mark} aria-hidden="true">i</span>
                <span>{notice}</span>
              </p>
            ) : null}

            {showPhone ? (
              <div className={surfaceStyles.form}>
                <div className={surfaceStyles.field}>
                  <label className={surfaceStyles.label} htmlFor="phone-number">{t('phoneLabel')}</label>
                  <Input
                    id="phone-number"
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
                    aria-describedby={fieldError.phone ? 'phone-error' : undefined}
                    className={inputClass(Boolean(fieldError.phone))}
                    placeholder="09123456789"
                  />
                  {displayPhone !== phoneRaw ? (
                    <span className={surfaceStyles.hint} dir="ltr">{displayPhone}</span>
                  ) : null}
                  {fieldError.phone ? (
                    <span id="phone-error" role="alert" className={surfaceStyles.fieldError}>
                      <span aria-hidden="true">!</span> {fieldError.phone}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div key={step} className={surfaceStyles.motion}>
            {step === 'choose' ? (
              <div className={surfaceStyles.form}>
                <button type="button" className={surfaceStyles.primary} onClick={openEmailPath}>
                  {t('chooseEmail')}
                </button>
                <button type="button" className={surfaceStyles.secondary} onClick={openPhonePath}>
                  {t('choosePhone')}
                </button>
              </div>
            ) : null}

            {step === 'identify' ? (
              <div className={surfaceStyles.form}>
                <button type="button" className={surfaceStyles.primary} disabled={busy || !phoneOk} onClick={onIdentify}>
                  {busy ? t('loading') : t('continue')}
                </button>
                <div className={surfaceStyles.decision}>
                  <button type="button" className={surfaceStyles.secondary} onClick={() => go('legacy')}>
                    {t('legacyAction')}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 'password' ? (
              <form className={surfaceStyles.form} onSubmit={(event) => { event.preventDefault(); onLogin(); }}>
                <PasswordField
                  label={t('passwordLabel')}
                  value={password}
                  onChange={setPassword}
                  shown={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                  showLabel={t('showPassword')}
                  hideLabel={t('hidePassword')}
                  autoComplete="current-password"
                  className={inputClass()}
                />
                <button type="submit" className={surfaceStyles.primary} disabled={busy || !password}>
                  {busy ? t('loading') : t('signIn')}
                </button>
                <button type="button" className={surfaceStyles.secondary} onClick={onResetRequest} disabled={busy || recoveryLeft > 0}>
                  {recoveryLeft > 0 ? t('resendWait', {seconds: recoveryLeft}) : t('forgot')}
                </button>
              </form>
            ) : null}

            {step === 'register-otp' ? (
              <div className={surfaceStyles.form}>
                <div className={surfaceStyles.decision}>
                  <strong>{t('registerWarningTitle')}</strong>
                  <p>{t('registerWarningBody')}</p>
                  <button type="button" className={`${surfaceStyles.secondary} mt-3`} onClick={() => go('legacy')}>
                    {t('legacyAction')}
                  </button>
                </div>
                <button type="button" className={surfaceStyles.primary} disabled={busy || registrationLeft > 0} onClick={onRegisterOtp}>
                  {registrationLeft > 0 ? t('resendWait', {seconds: registrationLeft}) : t('sendCode')}
                </button>
              </div>
            ) : null}

            {step === 'register-code' ? (
              <div className={surfaceStyles.form}>
                <CodeField
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    setFieldError((current) => ({...current, code: undefined}));
                  }}
                  label={t('codeLabel')}
                  className={inputClass(Boolean(fieldError.code), surfaceStyles.code)}
                  invalid={Boolean(fieldError.code)}
                  error={fieldError.code}
                />
                <button type="button" className={surfaceStyles.primary} disabled={busy || verifyLeft > 0 || code.trim().length === 0} onClick={onRegisterVerify}>
                  {busy ? t('loading') : verifyLeft > 0 ? t('verifyWait', {seconds: verifyLeft}) : t('verify')}
                </button>
                <button type="button" className={surfaceStyles.secondary} disabled={busy || registrationLeft > 0} onClick={onRegisterOtp}>
                  {registrationLeft > 0 ? t('resendWait', {seconds: registrationLeft}) : t('resend')}
                </button>
              </div>
            ) : null}

            {step === 'activation' ? (
              <div className={surfaceStyles.form}>
                <CodeField value={code} onChange={setCode} label={t('codeLabel')} className={inputClass(false, surfaceStyles.code)} />
                <button type="button" className={surfaceStyles.primary} disabled={busy || code.trim().length === 0} onClick={onActivationVerify}>
                  {busy ? t('loading') : t('verify')}
                </button>
                <button type="button" className={surfaceStyles.secondary} disabled={busy || activationLeft > 0} onClick={onResendActivation}>
                  {activationLeft > 0 ? t('resendWait', {seconds: activationLeft}) : t('resend')}
                </button>
              </div>
            ) : null}

            {step === 'reset-otp' ? (
              <div className={surfaceStyles.form}>
                <CodeField value={code} onChange={setCode} label={t('codeLabel')} className={inputClass(false, surfaceStyles.code)} />
                <button type="button" className={surfaceStyles.primary} disabled={busy || code.trim().length === 0} onClick={onResetVerify}>
                  {busy ? t('loading') : t('verify')}
                </button>
                <button type="button" className={surfaceStyles.secondary} disabled={busy || recoveryLeft > 0} onClick={onResetRequest}>
                  {recoveryLeft > 0 ? t('resendWait', {seconds: recoveryLeft}) : t('resend')}
                </button>
              </div>
            ) : null}

            {step === 'register-profile' ? (
              <form className={surfaceStyles.form} onSubmit={(event) => { event.preventDefault(); onRegister(); }}>
                <div className={surfaceStyles.names}>
                  <TextField label={t('firstName')} value={firstName} onChange={setFirstName} className={inputClass()} autoComplete="given-name" />
                  <TextField label={t('lastName')} value={lastName} onChange={setLastName} className={inputClass()} autoComplete="family-name" />
                </div>
                <label className={surfaceStyles.field}>
                  <span className={surfaceStyles.label}>{t('role')}</span>
                  <select value={role} onChange={(event) => setRole(event.target.value as PhoneRole)} className={surfaceStyles.select}>
                    {ROLES.map((item) => (
                      <option key={item} value={item}>{t(`roles.${item}`)}</option>
                    ))}
                  </select>
                </label>
                {role === 'staff' ? (
                  <label className={surfaceStyles.field}>
                    <span className={surfaceStyles.label}>{t('staffCategory')}</span>
                    <select value={staffCategory} onChange={(event) => setStaffCategory(event.target.value as StaffCategory)} className={surfaceStyles.select}>
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
                  className={inputClass(Boolean(fieldError.email))}
                  autoComplete="email"
                  dir="ltr"
                  invalid={Boolean(fieldError.email)}
                  error={fieldError.email}
                  optional
                />
                {emailTaken ? (
                  <div className={surfaceStyles.decision}>
                    <p>{t('emailTakenHint')}</p>
                    <button type="button" className={`${surfaceStyles.secondary} mt-3`} onClick={() => go('legacy')}>
                      {t('emailAccountPath')}
                    </button>
                  </div>
                ) : (
                  <p className={surfaceStyles.hint}>{t('emailHint')}</p>
                )}
                <PasswordField
                  label={t('passwordLabel')}
                  value={newPassword}
                  onChange={(value) => {
                    setNewPassword(value);
                    setFieldError((current) => ({...current, password: undefined}));
                  }}
                  shown={showNewPassword}
                  onToggle={() => setShowNewPassword((value) => !value)}
                  showLabel={t('showPassword')}
                  hideLabel={t('hidePassword')}
                  autoComplete="new-password"
                  className={inputClass(Boolean(fieldError.password))}
                  invalid={Boolean(fieldError.password)}
                />
                {fieldError.password?.length ? (
                  <ul role="alert" className={`${surfaceStyles.banner} ${surfaceStyles.errors}`}>
                    {fieldError.password.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
                <TextField
                  label={t('confirmPassword')}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  className={inputClass()}
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                />
                <button type="submit" className={surfaceStyles.primary} disabled={busy || submitLeft > 0 || !firstName.trim() || !lastName.trim() || !newPassword}>
                  {busy ? t('loading') : submitLeft > 0 ? t('resendWait', {seconds: submitLeft}) : t('createAccount')}
                </button>
                {registrationBlocked ? (
                  <div className={surfaceStyles.decision}>
                    <p>{t('registrationInvalidHint')}</p>
                    <button type="button" className={`${surfaceStyles.secondary} mt-3`} onClick={restartRegistration}>
                      {t('requestFreshCode')}
                    </button>
                  </div>
                ) : (
                  <button type="button" className={surfaceStyles.secondary} onClick={restartRegistration}>
                    {t('restartRegistration')}
                  </button>
                )}
              </form>
            ) : null}

            {step === 'reset-password' ? (
              <form className={surfaceStyles.form} onSubmit={(event) => { event.preventDefault(); onResetComplete(); }}>
                <PasswordField
                  label={t('passwordLabel')}
                  value={newPassword}
                  onChange={setNewPassword}
                  shown={showNewPassword}
                  onToggle={() => setShowNewPassword((value) => !value)}
                  showLabel={t('showPassword')}
                  hideLabel={t('hidePassword')}
                  autoComplete="new-password"
                  className={inputClass()}
                />
                <TextField label={t('confirmPassword')} value={confirmPassword} onChange={setConfirmPassword} className={inputClass()} type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" />
                <button type="submit" className={surfaceStyles.primary} disabled={busy || !newPassword}>
                  {busy ? t('loading') : t('savePassword')}
                </button>
                <button
                  type="button"
                  className={surfaceStyles.secondary}
                  onClick={() => {
                    resetToken.current = '';
                    setNotice(t('freshCodeHint'));
                    setStep('reset-otp');
                  }}
                >
                  {t('resend')}
                </button>
              </form>
            ) : null}

            {step === 'legacy' ? (
              <div className={`${surfaceStyles.form} ${surfaceStyles.legacyPaper}`}>
                <LoginForm
                  appearance="paper"
                  busy={busy}
                  setBusy={setBusy}
                  abortRef={legacyAbort}
                  onForgotPassword={() => setStep('legacy-reset')}
                  onSuccess={enterApp}
                />
              </div>
            ) : null}

            {step === 'legacy-reset' ? (
              <div className={`${surfaceStyles.form} ${surfaceStyles.legacyPaper}`}>
                <PasswordResetWizard
                  appearance="paper"
                  busy={busy}
                  setBusy={setBusy}
                  controllerRefs={{
                    requestOtp: abortRef,
                    verifyOtp: abortRef,
                    complete: abortRef
                  }}
                  onBackToLogin={() => go('legacy')}
                  onCompleted={() => {
                    setNotice(t('resetDone'));
                    setStep('legacy');
                  }}
                />
              </div>
            ) : null}

            {step === 'phone-setup' ? (
              <div className={surfaceStyles.form}>
                <button
                  type="button"
                  className={surfaceStyles.primary}
                  onClick={() => {
                    const result = pendingResult.current;
                    if (!result) return;
                    continueToDestination(result);
                  }}
                >
                  {t('continueToApp')}
                </button>
              </div>
            ) : null}

            {step === 'imported-password' ? (
              <div className={surfaceStyles.form}>
                <p className={surfaceStyles.asideNote}>{t('importedSupport')}</p>
                <button type="button" className={surfaceStyles.primary} onClick={() => go('legacy')}>
                  {t('importedHaveCredentials')}
                </button>
              </div>
            ) : null}
            {step !== 'choose' ? (
              <button type="button" className={surfaceStyles.methodSwitch} onClick={changeMethod}>
                {t('changeMethod')}
              </button>
            ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

// Original interpretation of the Shahid Beheshti University main gate.
// Reference photograph: Xpander1, Wikimedia Commons, CC BY 4.0
// https://commons.wikimedia.org/wiki/File:Sahid_Beheshti_University.jpg
// https://creativecommons.org/licenses/by/4.0/
// Not a trace of the photograph and not a measured drawing of the facade.
function CampusField({className}: {className?: string}) {
  return (
    <svg className={className} viewBox="0 0 880 460" fill="none" aria-hidden="true">
      <title>Interpretive drawing of a university gate</title>
      <path d="M40 392h800" stroke="rgba(244,251,251,0.28)" strokeWidth="1.2" />
      <path d="M150 392v-18h580v18" stroke="rgba(244,251,251,0.45)" strokeWidth="1.4" />
      <path d="M190 374v-14h500v14" stroke="rgba(244,251,251,0.35)" strokeWidth="1.2" />
      <path d="M70 392V250h90v142" stroke="rgba(244,251,251,0.4)" strokeWidth="1.6" />
      <path d="M720 392V250h90v142" stroke="rgba(244,251,251,0.4)" strokeWidth="1.6" />
      <path d="M168 392V168h150v224" stroke="rgba(244,251,251,0.8)" strokeWidth="2.2" />
      <path d="M562 392V168h150v224" stroke="rgba(244,251,251,0.8)" strokeWidth="2.2" />
      <path d="M150 168h580" stroke="rgba(244,251,251,0.9)" strokeWidth="8" />
      <path d="M150 148h580" stroke="rgba(94,224,214,0.85)" strokeWidth="3" />
      <path d="M318 392V196h244v196" stroke="rgba(244,251,251,0.72)" strokeWidth="2" />
      <path d="M338 392V214h204v178" stroke="rgba(3,28,40,0.55)" strokeWidth="10" />
      <path d="M186 220h116M578 220h116" stroke="rgba(228,181,106,0.9)" strokeWidth="1.6" />
      <path d="M186 250h116M578 250h116" stroke="rgba(244,251,251,0.35)" strokeWidth="1.2" />
      <path d="M214 300h60v92h-60zM606 300h60v92h-60z" stroke="rgba(244,251,251,0.4)" strokeWidth="1.3" />
      {Array.from({length: 18}, (_, index) => (
        <rect
          key={index}
          x={176 + index * 30}
          y={112}
          width="12"
          height="22"
          rx="1"
          fill={index % 3 === 1 ? 'rgba(228,181,106,0.85)' : 'rgba(244,251,251,0.55)'}
        />
      ))}
      <path d="M430 128l10 16h-20z" fill="rgba(94,224,214,0.9)" />
    </svg>
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
  error,
  optional
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
  optional?: boolean;
}) {
  const fieldId = `field-${label}`;
  return (
    <div className={`${surfaceStyles.field} ${optional ? surfaceStyles.optional : ''}`}>
      <label className={surfaceStyles.label} htmlFor={fieldId}>{label}</label>
      <Input
        id={fieldId}
        value={value}
        type={type}
        dir={dir}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-required={optional ? false : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
      {error ? (
        <span id={`${fieldId}-error`} role="alert" className={surfaceStyles.fieldError}>
          <span aria-hidden="true">!</span> {error}
        </span>
      ) : null}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  shown,
  onToggle,
  showLabel,
  hideLabel,
  autoComplete,
  className,
  invalid
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  shown: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
  autoComplete: string;
  className: string;
  invalid?: boolean;
}) {
  const fieldId = `secret-${label}`;
  return (
    <div className={surfaceStyles.field}>
      <label className={surfaceStyles.label} htmlFor={fieldId}>{label}</label>
      <span className={surfaceStyles.control}>
        <Input
          id={fieldId}
          value={value}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} ${surfaceStyles.padded}`}
        />
        <button type="button" className={surfaceStyles.reveal} aria-pressed={shown} onClick={onToggle}>
          {shown ? hideLabel : showLabel}
        </button>
      </span>
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
    <div className={surfaceStyles.field}>
      <label className={surfaceStyles.label} htmlFor="sms-code">{label}</label>
      <Input
        id="sms-code"
        value={value}
        inputMode="numeric"
        autoComplete="one-time-code"
        dir="ltr"
        aria-invalid={invalid || undefined}
        aria-describedby={error ? 'sms-code-error' : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
      {error ? (
        <span id="sms-code-error" role="alert" className={surfaceStyles.fieldError}>
          <span aria-hidden="true">!</span> {error}
        </span>
      ) : null}
    </div>
  );
}
