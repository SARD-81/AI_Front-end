'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { PasswordResetWizard } from '@/components/auth/PasswordResetWizard';
import { SignupWizard } from '@/components/auth/SignupWizard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#060a13] text-white">
      <div className="bg-slate-950/38 pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.30),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(148,163,184,0.18),transparent_32%),linear-gradient(115deg,rgba(2,6,23,0.86)_0%,rgba(15,23,42,0.54)_48%,rgba(2,6,23,0.84)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-12 h-96 w-96 rounded-full bg-sky-500/15 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl items-start px-3 py-3 sm:px-4 sm:py-6 md:px-8 lg:items-center lg:py-10">
        <div className="grid w-full min-w-0 items-center gap-3 sm:gap-5 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8 xl:gap-12">
          <section className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/[0.08] p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:rounded-[2rem] sm:p-6 md:p-8 lg:min-h-[640px]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_32%,rgba(59,130,246,0.14)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />

            <div className="relative z-10 flex h-full flex-col justify-between gap-4 sm:gap-8 lg:gap-12">
              <div className="flex flex-1 items-center gap-4 sm:flex-col sm:justify-center sm:space-y-6 sm:text-center lg:space-y-8">
                <div className="bg-white/12 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/20 p-2 shadow-2xl shadow-black/35 ring-1 ring-white/10 backdrop-blur-md sm:mx-auto sm:h-32 sm:w-32 sm:rounded-[2rem] sm:p-3 md:h-44 md:w-44 md:p-4">
                  <Image
                    src="/Logo.png"
                    alt={t('hero.logoAlt')}
                    width={176}
                    height={176}
                    className="h-full w-full object-contain drop-shadow-2xl"
                    priority
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5 text-start sm:mx-auto sm:max-w-2xl sm:space-y-5 sm:text-center">
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="text-xl font-black leading-8 tracking-tight text-white drop-shadow-lg sm:text-3xl sm:leading-[1.8] md:text-4xl xl:text-5xl"
                  >
                    {t('hero.title')}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: 0.06 }}
                    className="hidden max-w-xl text-sm leading-7 text-slate-200/82 sm:block md:text-base md:leading-8"
                  >
                    {t('hero.description')}
                  </motion.p>
                </div>
              </div>

              <div className="border-white/12 mx-auto hidden max-w-xl rounded-3xl border bg-slate-950/30 px-5 py-4 text-center text-sm leading-7 text-sky-50/90 shadow-lg shadow-black/20 backdrop-blur-md sm:block">
                {t('hero.tagline')}
              </div>
            </div>
          </section>

          <section className="flex min-w-0 items-center justify-center lg:justify-start">
            <Card className="border-white/16 bg-slate-950/58 relative w-full min-w-0 max-w-xl overflow-hidden rounded-[1.5rem] text-white shadow-2xl shadow-slate-950/55 backdrop-blur-2xl sm:rounded-[2rem]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.10),transparent_34%)]" />
              <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
              <div className="relative z-10 min-w-0">
                <CardHeader className="space-y-3 p-4 pb-2 sm:space-y-4 sm:p-6 sm:pb-3 md:p-8 md:pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div
                      role="group"
                      aria-label={t('languageSwitch.language')}
                      dir="ltr"
                      className="inline-flex overflow-hidden rounded-md bg-white/[0.06] ring-1 ring-white/15"
                    >
                      {(['en', 'fa'] as const).map((option) => {
                        const active = locale === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => selectLocale(option)}
                            aria-pressed={active}
                            aria-label={t('languageSwitch.ariaLabel', {
                              locale: t(`languageSwitch.${option}`)
                            })}
                            title={t('languageSwitch.ariaLabel', {
                              locale: t(`languageSwitch.${option}`)
                            })}
                            className={
                              active
                                ? 'flex h-9 w-11 items-center justify-center bg-[#3b4bf6] text-[13px] font-bold tracking-wide text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70'
                                : 'flex h-9 w-11 items-center justify-center bg-transparent text-[13px] font-bold tracking-wide text-slate-200/80 transition-colors hover:bg-white/[0.1] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70'
                            }
                          >
                            {t(`languageSwitch.${option}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 text-right sm:space-y-3">
                    <CardTitle className="text-xl font-black leading-relaxed text-white sm:text-2xl md:text-3xl">
                      {authMode === 'login'
                        ? t('card.loginTitle')
                        : authMode === 'reset'
                          ? t('card.resetTitle')
                          : t('card.signupTitle')}
                    </CardTitle>
                    <CardDescription className="text-xs leading-6 text-slate-300/85 sm:text-sm sm:leading-7">
                      {authMode === 'login'
                        ? t('card.loginDescription')
                        : authMode === 'reset'
                          ? t('card.resetDescription')
                          : t('card.signupDescription')}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="min-w-0 p-4 pt-2 sm:p-6 sm:pt-2 md:p-8 md:pt-3">
                  <div className="bg-slate-950/32 min-w-0 rounded-2xl border border-white/10 p-3 shadow-inner shadow-black/25 backdrop-blur-md sm:rounded-3xl sm:p-4 md:p-5">
                    <AnimatePresence mode="wait" initial={false}>
                      {authMode === 'login' ? (
                        <motion.div
                          key="login"
                          initial={{ opacity: 0, y: 8, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -8, height: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="min-w-0 overflow-hidden"
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
                          initial={{ opacity: 0, y: 8, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -8, height: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="min-w-0 overflow-hidden"
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
                          initial={{ opacity: 0, y: 8, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -8, height: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="min-w-0 overflow-hidden"
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

                  <Separator className="my-4 bg-white/10 sm:my-6" />

                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-medium text-sky-100 transition hover:bg-white/[0.11] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() =>
                      updateMode(authMode === 'login' ? 'signup' : 'login')
                    }
                    disabled={busy || postSignupAuthLoading}
                  >
                    {authMode === 'login'
                      ? t('card.switchToSignup')
                      : t('card.switchToLogin')}
                  </button>
                </CardContent>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
