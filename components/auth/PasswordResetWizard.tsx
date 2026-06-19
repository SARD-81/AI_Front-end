'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  completePasswordReset,
  isAbortError,
  requestPasswordResetOtp,
  ServiceError,
  verifyPasswordResetOtp
} from '@/lib/services/auth-service';
import {
  createPasswordResetCompleteSchema,
  createSignupStep1EmailSchema,
  createSignupStep1Schema,
  type AuthSchemaTranslator,
  type PasswordResetCompleteValues,
  type SignupStep1EmailValues,
  type SignupStep1Values
} from '@/lib/validation/auth-schemas';

const authInputClassName =
  'h-12 rounded-2xl border-white/10 bg-white/[0.08] text-white shadow-inner shadow-black/15 outline-none placeholder:text-slate-400/75 focus-visible:ring-primary/60 focus-visible:ring-offset-0';

const RESEND_SECONDS = 60;

type PasswordResetWizardProps = {
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onBackToLogin: () => void;
  onCompleted: (email: string) => void;
  controllerRefs: {
    requestOtp: React.MutableRefObject<AbortController | null>;
    verifyOtp: React.MutableRefObject<AbortController | null>;
    complete: React.MutableRefObject<AbortController | null>;
  };
};

export function PasswordResetWizard({
  busy,
  setBusy,
  onBackToLogin,
  onCompleted,
  controllerRefs
}: PasswordResetWizardProps) {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otpToken, setOtpToken] = useState<string | undefined>();
  const [resendSeconds, setResendSeconds] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const t = useTranslations('auth');
  const schemaT: AuthSchemaTranslator = (key) => t(`validation.${key}`);

  const emailForm = useForm<SignupStep1EmailValues>({
    resolver: zodResolver(createSignupStep1EmailSchema(schemaT)),
    defaultValues: { email: '' }
  });

  const otpForm = useForm<SignupStep1Values>({
    resolver: zodResolver(createSignupStep1Schema(schemaT)),
    defaultValues: { email: '', otpCode: '' }
  });

  const passwordForm = useForm<PasswordResetCompleteValues>({
    resolver: zodResolver(createPasswordResetCompleteSchema(schemaT)),
    defaultValues: { password: '', confirmPassword: '' }
  });

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const canResend = useMemo(
    () => stage === 2 && resendSeconds === 0 && !busy,
    [busy, resendSeconds, stage]
  );

  const startCountdown = () => setResendSeconds(RESEND_SECONDS);

  const requestOtp = async (targetEmail: string) => {
    const controller = new AbortController();
    controllerRefs.requestOtp.current?.abort();
    controllerRefs.requestOtp.current = controller;

    try {
      setBusy(true);
      const result = await requestPasswordResetOtp(
        { email: targetEmail },
        { signal: controller.signal }
      );
      toast.success(result.message);
      startCountdown();
      return true;
    } catch (error) {
      if (isAbortError(error)) return false;
      const message =
        error instanceof ServiceError
          ? error.message
          : t('reset.requestErrorFallback');
      toast.error(message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onRequestOtp = emailForm.handleSubmit(async (values) => {
    const normalizedEmail = values.email.trim();
    const sent = await requestOtp(normalizedEmail);
    if (!sent) return;

    setEmail(normalizedEmail);
    setOtpToken(undefined);
    otpForm.reset({ email: normalizedEmail, otpCode: '' });
    passwordForm.reset();
    setStage(2);
  });

  const onResendOtp = async () => {
    if (!canResend || !email) return;
    await requestOtp(email);
  };

  const onVerifyOtp = otpForm.handleSubmit(async (values) => {
    const controller = new AbortController();
    controllerRefs.verifyOtp.current?.abort();
    controllerRefs.verifyOtp.current = controller;

    try {
      setBusy(true);
      const result = await verifyPasswordResetOtp(
        { email, otpCode: values.otpCode },
        { signal: controller.signal }
      );
      setOtpToken(result.otpToken);
      setStage(3);
      toast.success(result.message);
    } catch (error) {
      if (isAbortError(error)) return;
      const message =
        error instanceof ServiceError
          ? error.message
          : t('reset.verifyErrorFallback');
      toast.error(message);
    } finally {
      setBusy(false);
    }
  });

  const onComplete = passwordForm.handleSubmit(async (values) => {
    const controller = new AbortController();
    controllerRefs.complete.current?.abort();
    controllerRefs.complete.current = controller;

    try {
      setBusy(true);
      const result = await completePasswordReset(
        { email, otpToken, newPassword: values.password },
        { signal: controller.signal }
      );
      toast.success(result.message || t('reset.success'));
      onCompleted(email);
    } catch (error) {
      if (isAbortError(error)) return;
      const message =
        error instanceof ServiceError
          ? error.message
          : t('reset.completeErrorFallback');
      toast.error(message);
    } finally {
      setBusy(false);
    }
  });

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait" initial={false}>
        {stage === 1 ? (
          <motion.div key="reset-email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Form {...emailForm}>
              <form onSubmit={onRequestOtp} className="space-y-5" noValidate>
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200/90">{t('reset.emailLabel')}</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" className={authInputClassName} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="h-12 w-full rounded-2xl bg-primary text-sm font-bold shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.99]" disabled={busy || emailForm.formState.isSubmitting}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t('reset.requestOtp')}
                </Button>
              </form>
            </Form>
          </motion.div>
        ) : null}

        {stage === 2 ? (
          <motion.div key="reset-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Form {...otpForm}>
              <form onSubmit={onVerifyOtp} className="space-y-5" noValidate>
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2 text-sm text-slate-200/85">
                  {t('reset.codeSentTo')} <span dir="ltr">{email}</span>
                </div>
                <FormField
                  control={otpForm.control}
                  name="otpCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200/90">{t('reset.otpLabel')}</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="numeric" dir="ltr" className={authInputClassName} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" className="h-12 rounded-2xl" onClick={onResendOtp} disabled={!canResend}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {resendSeconds > 0 ? t('reset.resendCountdown', { seconds: resendSeconds }) : t('reset.resendOtp')}
                  </Button>
                  <Button type="submit" className="h-12 flex-1 rounded-2xl bg-primary text-sm font-bold shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.99]" disabled={busy || otpForm.formState.isSubmitting}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {t('reset.verifyOtp')}
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>
        ) : null}

        {stage === 3 ? (
          <motion.div key="reset-password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Form {...passwordForm}>
              <form onSubmit={onComplete} className="space-y-5" noValidate>
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200/90">{t('reset.newPasswordLabel')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} type={showPassword ? 'text' : 'password'} dir="ltr" className={`${authInputClassName} pl-11`} />
                          <button type="button" className="absolute inset-y-0 left-3 inline-flex items-center rounded-xl px-1 text-slate-300/75 transition hover:text-white" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? t('reset.hidePassword') : t('reset.showPassword')}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200/90">{t('reset.confirmPasswordLabel')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} type={showConfirmPassword ? 'text' : 'password'} dir="ltr" className={`${authInputClassName} pl-11`} />
                          <button type="button" className="absolute inset-y-0 left-3 inline-flex items-center rounded-xl px-1 text-slate-300/75 transition hover:text-white" onClick={() => setShowConfirmPassword((prev) => !prev)} aria-label={showConfirmPassword ? t('reset.hidePassword') : t('reset.showPassword')}>
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="h-12 w-full rounded-2xl bg-primary text-sm font-bold shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.99]" disabled={busy || passwordForm.formState.isSubmitting}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t('reset.complete')}
                </Button>
              </form>
            </Form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button type="button" className="w-full text-center text-sm font-medium text-sky-100/85 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onBackToLogin} disabled={busy}>
        {t('reset.backToLogin')}
      </button>
    </div>
  );
}
