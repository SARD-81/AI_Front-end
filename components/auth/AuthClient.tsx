'use client';

import Image from 'next/image';
import {useEffect, useRef, useState} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {AnimatePresence, motion} from 'motion/react';
import {LoginForm} from '@/components/auth/LoginForm';
import {SignupWizard} from '@/components/auth/SignupWizard';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';

type AuthMode = 'login' | 'signup';

export function AuthClient({locale}: {locale: string}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [busy, setBusy] = useState(false);
  const [signupResetToken, setSignupResetToken] = useState(0);

  const controllersRef = {
    login: useRef<AbortController | null>(null),
    sendOtp: useRef<AbortController | null>(null),
    verifyOtp: useRef<AbortController | null>(null),
    register: useRef<AbortController | null>(null)
  };

  useEffect(() => {
    const modeQuery = searchParams.get('mode');
    if (modeQuery === 'signup' || modeQuery === 'login') {
      setAuthMode(modeQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      controllersRef.login.current?.abort();
      controllersRef.sendOtp.current?.abort();
      controllersRef.verifyOtp.current?.abort();
      controllersRef.register.current?.abort();
    };
  }, [controllersRef.login, controllersRef.register, controllersRef.sendOtp, controllersRef.verifyOtp]);

  const updateMode = (mode: AuthMode) => {
    if (busy) {
      return;
    }

    setAuthMode(mode);
    if (mode === 'login') {
      setSignupResetToken((prev) => prev + 1);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', mode);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-7xl items-stretch gap-6 px-4 py-6 md:grid-cols-2 md:px-6">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,hsl(var(--primary)/0.08),transparent_45%),radial-gradient(circle_at_90%_80%,hsl(var(--primary)/0.12),transparent_45%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="space-y-4">
              <Image src="/Logo.png" alt="لوگوی دانشگاه" width={96} height={96} className="rounded-xl" priority />
              <h1 className="text-2xl font-bold leading-relaxed md:text-3xl">دستیار هوشمند دانشگاه شهید بهشتی</h1>
              <p className="text-sm leading-7 text-muted-foreground">
                درگاه احراز هویت یکپارچه برای دسترسی ایمن به خدمات هوشمند آموزشی و پژوهشی دانشگاه.
              </p>
            </div>
            <div className="grid grid-cols-6 gap-3 opacity-30">
              {Array.from({length: 24}).map((_, idx) => (
                <span key={idx} className="h-2 rounded-full bg-primary/70" />
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <CardTitle>{authMode === 'login' ? 'ورود به حساب کاربری' : 'ایجاد حساب کاربری'}</CardTitle>
              <CardDescription>
                {authMode === 'login'
                  ? 'برای ورود، شماره دانشجویی و رمز عبور خود را وارد کنید.'
                  : 'برای ثبت‌نام، ابتدا ایمیل دانشگاهی خود را تایید کنید.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait" initial={false}>
                {authMode === 'login' ? (
                  <motion.div
                    key="login"
                    initial={{opacity: 0, y: 8, height: 0}}
                    animate={{opacity: 1, y: 0, height: 'auto'}}
                    exit={{opacity: 0, y: -8, height: 0}}
                    transition={{duration: 0.2, ease: 'easeOut'}}
                    className="overflow-hidden"
                  >
                    <LoginForm
                      busy={busy}
                      setBusy={setBusy}
                      abortRef={controllersRef.login}
                      onSuccess={() => router.push(`/${locale}/chat`)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="signup"
                    initial={{opacity: 0, y: 8, height: 0}}
                    animate={{opacity: 1, y: 0, height: 'auto'}}
                    exit={{opacity: 0, y: -8, height: 0}}
                    transition={{duration: 0.2, ease: 'easeOut'}}
                    className="overflow-hidden"
                  >
                    <SignupWizard
                      busy={busy}
                      setBusy={setBusy}
                      resetToken={signupResetToken}
                      controllerRefs={{
                        sendOtp: controllersRef.sendOtp,
                        verifyOtp: controllersRef.verifyOtp,
                        register: controllersRef.register
                      }}
                      onRegistered={() => {
                        setSignupResetToken((prev) => prev + 1);
                        updateMode('login');
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Separator className="my-6" />

              <button
                type="button"
                className="text-sm text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => updateMode(authMode === 'login' ? 'signup' : 'login')}
                disabled={busy}
              >
                {authMode === 'login' ? 'حساب ندارید؟ ثبت‌نام' : 'حساب دارید؟ ورود'}
              </button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
