'use client';

import { UniversityLogo } from '@/components/branding/UniversityLogo';
import { FacultyIdentity } from '@/components/branding/FacultyIdentity';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpLeft, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { PasswordResetWizard } from '@/components/auth/PasswordResetWizard';
import { SignupWizard } from '@/components/auth/SignupWizard';
import { isAbortError, loginUser } from '@/lib/services/auth-service';
import type { LoginResultDTO } from '@/lib/types/auth';

type AuthMode = 'login' | 'signup' | 'reset';

function replaceLocaleInPath(pathname: string, nextLocale: string) {
  const segments = pathname.split('/');
  if (segments[1] === 'fa' || segments[1] === 'en') {
    segments[1] = nextLocale;
    return segments.join('/');
  }
  return `/${nextLocale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function persistLanguagePreference(nextLocale: string) {
  try {
    const raw = localStorage.getItem('app_settings');
    const settings = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      'app_settings',
      JSON.stringify({ ...settings, language: nextLocale })
    );
  } catch {
    localStorage.setItem(
      'app_settings',
      JSON.stringify({ language: nextLocale })
    );
  }
}

function safeNextUrl(next: string | null, locale: string): string {
  const fallback = `/${locale}/chat`;
  if (!next) return fallback;

  const trimmed = next.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('http')) return fallback;
  if (trimmed.includes('\n') || trimmed.includes('\r')) return fallback;

  return trimmed;
}

export function AuthClient({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const t = useTranslations('auth');
  const modeQuery = searchParams.get('mode');
  const initialAuthMode: AuthMode =
    modeQuery === 'signup' || modeQuery === 'reset' || modeQuery === 'login'
      ? modeQuery
      : 'login';
  const [authMode, setAuthMode] = useState<AuthMode>(initialAuthMode);
  const [busy, setBusy] = useState(false);
  const [postSignupAuthLoading, setPostSignupAuthLoading] = useState(false);
  const [signupResetToken, setSignupResetToken] = useState(0);
  const [loginInitialIdentifier, setLoginInitialIdentifier] = useState('');

  const postSignupInFlightRef = useRef(false);
  const postSignupAuthRef = useRef<AbortController | null>(null);

  const controllersRef = {
    login: useRef<AbortController | null>(null),
    sendOtp: useRef<AbortController | null>(null),
    verifyOtp: useRef<AbortController | null>(null),
    register: useRef<AbortController | null>(null),
    resetRequestOtp: useRef<AbortController | null>(null),
    resetVerifyOtp: useRef<AbortController | null>(null),
    resetComplete: useRef<AbortController | null>(null)
  };

  useEffect(() => {
    if (
      modeQuery === 'signup' ||
      modeQuery === 'login' ||
      modeQuery === 'reset'
    ) {
      setAuthMode(modeQuery);
    }
  }, [modeQuery]);

  useEffect(() => {
    return () => {
      controllersRef.login.current?.abort();
      controllersRef.sendOtp.current?.abort();
      controllersRef.verifyOtp.current?.abort();
      controllersRef.register.current?.abort();
      controllersRef.resetRequestOtp.current?.abort();
      controllersRef.resetVerifyOtp.current?.abort();
      controllersRef.resetComplete.current?.abort();
      postSignupAuthRef.current?.abort();
    };
  }, [
    controllersRef.login,
    controllersRef.register,
    controllersRef.resetComplete,
    controllersRef.resetRequestOtp,
    controllersRef.resetVerifyOtp,
    controllersRef.sendOtp,
    controllersRef.verifyOtp
  ]);

  const applyMode = (mode: AuthMode) => {
    setAuthMode(mode);
    if (mode === 'login') {
      setSignupResetToken((prev) => prev + 1);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', mode);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const updateMode = (mode: AuthMode) => {
    if (busy || postSignupAuthLoading) {
      return;
    }

    applyMode(mode);
  };

  const selectLocale = (nextLocale: 'fa' | 'en') => {
    if (nextLocale === locale) return;

    const params = new URLSearchParams(searchParams.toString());
    const nextPath = replaceLocaleInPath(pathname, nextLocale);
    const query = params.toString();
    persistLanguagePreference(nextLocale);
    router.replace(query ? `${nextPath}?${query}` : nextPath);
  };

  const getPostLoginDestination = (result: LoginResultDTO) => {
    if (
      result?.isProfileCompleted === false ||
      result?.user?.isProfileCompleted === false
    ) {
      return `/${locale}/profile`;
    }

    return safeNextUrl(searchParams.get('next'), locale);
  };

  const handleLoginSuccess = (result: LoginResultDTO) => {
    const destination = getPostLoginDestination(result);
    router.replace(destination);
    router.refresh();
  };

  const handlePasswordResetCompleted = (email: string) => {
    setLoginInitialIdentifier(email);
    applyMode('login');
  };

  const handleRegistered = async ({
    email,
    password
  }: {
    email: string;
    password: string;
  }) => {
    if (postSignupInFlightRef.current) {
      postSignupAuthRef.current?.abort();
    }

    postSignupInFlightRef.current = true;
    setPostSignupAuthLoading(true);

    const controller = new AbortController();
    postSignupAuthRef.current?.abort();
    postSignupAuthRef.current = controller;

    try {
      const result = await loginUser(
        { email, password },
        { signal: controller.signal }
      );
      toast.success(t('signup.autoLoginSuccess'));
      router.replace(getPostLoginDestination(result));
      router.refresh();
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      toast.success(t('signup.createdPleaseLogin'));
      setLoginInitialIdentifier(email);
      setSignupResetToken((prev) => prev + 1);
      setAuthMode('login');
      const params = new URLSearchParams(searchParams.toString());
      params.set('mode', 'login');
      router.replace(`${pathname}?${params.toString()}`);
    } finally {
      postSignupInFlightRef.current = false;
      setPostSignupAuthLoading(false);
    }
  };

  const isNewUser = authMode === 'signup';

  return (
    <main
      id="main-content"
      className="auth-page relative min-h-[100dvh] overflow-x-hidden bg-[#f2f8fa] text-[#073c55]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,#d8f2f5_0,transparent_32%),radial-gradient(circle_at_90%_92%,#dbeef4_0,transparent_36%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(#b5d7df_1px,transparent_1px),linear-gradient(90deg,#b5d7df_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,transparent,black_45%,transparent)]"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1376px] flex-col px-4 pb-8 pt-4 sm:px-8 sm:pt-6 lg:px-12 lg:pb-10">
        <header className="flex items-center justify-between gap-4 border-b border-[#c7dfe5] pb-4 sm:pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <UniversityLogo
              alt={t('hero.logoAlt')}
              className="h-12 w-12 sm:h-14 sm:w-14"
            />
            <div className="min-w-0 border-s border-[#b8d7df] ps-3">
              <p className="font-display-fa text-xl font-bold leading-7 text-[#075373] sm:text-2xl">
                {t('hero.productName')}
              </p>
              <p className="text-[11px] leading-5 text-[#537387] sm:text-xs">
                {t('hero.university')}
              </p>
            </div>
          </div>
          <div
            role="group"
            aria-label={t('languageSwitch.language')}
            dir="ltr"
            className="flex shrink-0 rounded-xl border border-[#c1dce3] bg-white/80 p-1 shadow-sm"
          >
            {(['en', 'fa'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => selectLocale(option)}
                aria-pressed={locale === option}
                aria-label={t('languageSwitch.ariaLabel', {
                  locale: t(`languageSwitch.${option}`)
                })}
                className={`min-h-9 min-w-10 rounded-lg px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0786a4] ${locale === option ? 'bg-[#075373] text-white' : 'text-[#537387] hover:bg-[#e4f4f6]'}`}
              >
                {t(`languageSwitch.${option}`)}
              </button>
            ))}
          </div>
        </header>

        <div className="grid flex-1 items-center gap-7 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-12 lg:pt-8">
          <section
            aria-label={t('card.accessTitle')}
            className="order-1 mx-auto w-full max-w-[570px] overflow-hidden rounded-[28px] border border-[#0c6684] bg-[linear-gradient(155deg,#085878_0%,#064460_55%,#073a53_100%)] text-white shadow-[0_26px_80px_-26px_rgba(4,66,94,0.52)] lg:order-1 lg:mx-0"
          >
            <div className="border-b border-white/15 bg-white/[0.05] px-5 pb-5 pt-6 sm:px-9 sm:pb-6 sm:pt-8">
              <div className="mb-5 flex items-center gap-2 text-xs font-medium tracking-wide text-[#bdebf0]">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                {t('card.accessTitle')}
              </div>
              <h1 className="text-2xl font-extrabold leading-[1.6] sm:text-3xl">
                {authMode === 'login'
                  ? t('card.loginTitle')
                  : authMode === 'signup'
                    ? t('card.signupTitle')
                    : t('card.resetTitle')}
              </h1>
              <p className="mt-1 max-w-md text-sm leading-7 text-[#c7e2e9]">
                {authMode === 'login'
                  ? t('card.loginDescription')
                  : authMode === 'signup'
                    ? t('card.signupDescription')
                    : t('card.resetDescription')}
              </p>
            </div>

            <div className="px-5 pb-6 pt-5 sm:px-9 sm:pb-9 sm:pt-6">
              <div
                role="group"
                aria-label={t('card.choosePath')}
                className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-white/15 bg-[#053950] p-1.5"
              >
                {(['signup', 'login'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateMode(mode)}
                    disabled={busy || postSignupAuthLoading}
                    aria-pressed={authMode === mode}
                    className={`min-h-12 rounded-xl px-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89e2eb] disabled:cursor-not-allowed disabled:opacity-50 ${authMode === mode ? 'bg-white text-[#075373] shadow-[0_3px_12px_rgba(0,20,34,0.2)]' : 'text-[#c1dbe4] hover:bg-white/10 hover:text-white'}`}
                  >
                    {mode === 'signup'
                      ? t('card.signupTab')
                      : t('card.loginTab')}
                  </button>
                ))}
              </div>

              {authMode !== 'reset' ? (
                <div className="mb-6 flex gap-3 rounded-2xl border border-[#81d1dc]/35 bg-[#0d7089]/45 p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#b3f2f0]/15 text-[#b3f2f0]">
                    {isNewUser ? (
                      <Check aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Sparkles aria-hidden="true" className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 text-start">
                    <p className="text-sm font-bold leading-6 text-white">
                      {isNewUser
                        ? t('card.signupHintTitle')
                        : t('card.firstTimeTitle')}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-[#d8edf1]">
                      {isNewUser
                        ? t('card.signupHint')
                        : t('card.firstTimeHint')}
                    </p>
                    {!isNewUser ? (
                      <button
                        type="button"
                        onClick={() => updateMode('signup')}
                        disabled={busy || postSignupAuthLoading}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[#b3f2f0] underline decoration-[#b3f2f0]/45 underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89e2eb] disabled:opacity-50"
                      >
                        {t('card.startSignup')}{' '}
                        <ArrowUpLeft
                          aria-hidden="true"
                          className="h-4 w-4 ltr:rotate-90 rtl:-rotate-90"
                        />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <AnimatePresence mode="wait" initial={false}>
                {authMode === 'login' ? (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <LoginForm
                      busy={busy || postSignupAuthLoading}
                      setBusy={setBusy}
                      abortRef={controllersRef.login}
                      initialIdentifier={loginInitialIdentifier}
                      onForgotPassword={() => updateMode('reset')}
                      onSuccess={handleLoginSuccess}
                    />
                  </motion.div>
                ) : authMode === 'signup' ? (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <SignupWizard
                      busy={busy || postSignupAuthLoading}
                      setBusy={setBusy}
                      resetToken={signupResetToken}
                      controllerRefs={{
                        sendOtp: controllersRef.sendOtp,
                        verifyOtp: controllersRef.verifyOtp,
                        register: controllersRef.register
                      }}
                      onRegistered={handleRegistered}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="reset"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <PasswordResetWizard
                      busy={busy || postSignupAuthLoading}
                      setBusy={setBusy}
                      controllerRefs={{
                        requestOtp: controllersRef.resetRequestOtp,
                        verifyOtp: controllersRef.resetVerifyOtp,
                        complete: controllersRef.resetComplete
                      }}
                      onBackToLogin={() => updateMode('login')}
                      onCompleted={handlePasswordResetCompleted}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <section className="relative order-2 hidden min-w-0 flex-col justify-center py-8 lg:flex lg:ps-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute end-0 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full border border-[#a6d8df]/65 bg-[#e1f5f7]/60 shadow-[0_0_0_45px_rgba(225,245,247,0.26),0_0_0_95px_rgba(225,245,247,0.18)]"
            />
            <div className="relative max-w-[590px]">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#b4dee4] bg-white/75 px-4 py-2 text-xs font-semibold text-[#075373] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#0c9caf]" />
                {t('hero.eyebrow')}
              </div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="font-display-fa text-balance text-4xl font-bold leading-[1.6] text-[#063f59] xl:text-5xl xl:leading-[1.55]"
              >
                {t('hero.title')}
              </motion.h2>
              <p className="mt-6 max-w-lg text-base leading-9 text-[#496b7e]">
                {t('hero.description')}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <span className="rounded-full border border-[#c5e0e4] bg-white/80 px-4 py-2 text-sm font-medium text-[#205d73]">
                  {t('hero.pillOne')}
                </span>
                <span className="rounded-full border border-[#c5e0e4] bg-white/80 px-4 py-2 text-sm font-medium text-[#205d73]">
                  {t('hero.pillTwo')}
                </span>
              </div>
              <div className="mt-16 flex items-center gap-3 border-t border-[#c4dce2] pt-6">
                <div className="h-10 w-1 rounded-full bg-[#0a8baa]" />
                <FacultyIdentity className="justify-start text-[#537387]" />
              </div>
            </div>
          </section>
        </div>
        <footer className="pt-6 text-center text-xs leading-6 text-[#648294] lg:text-start">
          {t('hero.footer')}
        </footer>
      </div>
    </main>
  );
}
