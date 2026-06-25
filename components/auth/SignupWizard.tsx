'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
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
import { SignupProfileModal } from '@/components/auth/SignupProfileModal';
import {
  isAbortError,
  sendOtp,
  ServiceError,
  verifyOtp
} from '@/lib/services/auth-service';
import {
  createSignupStep1Schema,
  type AuthSchemaTranslator,
  type SignupStep1Values,
} from '@/lib/validation/auth-schemas';

type SignupWizardProps = {
  onRegistered: (payload: {
    email: string;
    password: string;
  }) => Promise<void> | void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  controllerRefs: {
    sendOtp: React.MutableRefObject<AbortController | null>;
    verifyOtp: React.MutableRefObject<AbortController | null>;
    register: React.MutableRefObject<AbortController | null>;
  };
  resetToken: number;
};

export function SignupWizard({
  onRegistered,
  busy,
  setBusy,
  controllerRefs,
  resetToken
}: SignupWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [pendingAction, setPendingAction] = useState<
    'send' | 'verify' | null
  >(null);
  const t = useTranslations('auth');
  const schemaT: AuthSchemaTranslator = (key) => t(`validation.${key}`);

  const step1Form = useForm<SignupStep1Values>({
    resolver: zodResolver(createSignupStep1Schema(schemaT)),
    defaultValues: { email: '', otpCode: '' }
  });

  useEffect(() => {
    setStep(1);
    setVerifiedEmail('');
    setOtpSent(false);
    setResendSeconds(0);
    setPendingAction(null);
    step1Form.reset();
  }, [resetToken, step1Form]);

  useEffect(() => {
    if (!otpSent || resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpSent, resendSeconds]);

  const resetOtpState = () => {
    controllerRefs.verifyOtp.current?.abort();
    setOtpSent(false);
    setResendSeconds(0);
    setVerifiedEmail('');
    step1Form.setValue('otpCode', '');
    step1Form.clearErrors('otpCode');
  };

  const onSendOtp = async () => {
    const isValid = await step1Form.trigger('email');
    if (!isValid) return;

    const controller = new AbortController();
    controllerRefs.sendOtp.current?.abort();
    controllerRefs.sendOtp.current = controller;

    try {
      setBusy(true);
      setPendingAction('send');
      const email = step1Form.getValues('email');
      const result = await sendOtp({ email }, { signal: controller.signal });
      setOtpSent(true);
      setResendSeconds(60);
      step1Form.setValue('otpCode', '');
      toast.success(result.message);
    } catch (error) {
      if (isAbortError(error)) return;
      const message =
        error instanceof ServiceError
          ? error.message
          : t('signup.sendOtpErrorFallback');
      toast.error(message);
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  };

  const onVerify = step1Form.handleSubmit(async (values) => {
    const controller = new AbortController();
    controllerRefs.verifyOtp.current?.abort();
    controllerRefs.verifyOtp.current = controller;

    try {
      setBusy(true);
      setPendingAction('verify');
      const result = await verifyOtp(
        { email: values.email, otpCode: values.otpCode },
        { signal: controller.signal }
      );
      setVerifiedEmail(values.email);
      setStep(2);
      toast.success(result.message);
    } catch (error) {
      if (isAbortError(error)) return;
      const message =
        error instanceof ServiceError
          ? error.message
          : t('signup.verifyErrorFallback');
      toast.error(message);
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  });


  const isSendingOtp = pendingAction === 'send';
  const isVerifyingOtp = pendingAction === 'verify';
  const isStep1Locked = otpSent || step === 2;

  const ProgressIndicator = () => (
    <div className="mb-5 flex items-stretch gap-2 text-xs sm:text-sm">
      {[
        { id: 1, label: t('signup.progress.emailVerification') },
        { id: 2, label: t('signup.progress.completeProfile') }
      ].map((item, index, items) => {
        const isActive = step === item.id;
        const isComplete = step > item.id;
        const stepClasses = isComplete
          ? 'border-success/60 bg-success/15 text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.16)]'
          : isActive
            ? 'border-sky-300/70 bg-info/20 text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.18)]'
            : 'border-white/25 bg-surface-overlay/45 text-slate-200/90';
        const connectorClasses = isComplete
          ? 'bg-success/60'
          : 'bg-white/25';

        return (
          <div key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={`min-w-0 flex-1 rounded-xl border px-3 py-2 transition ${stepClasses}`}
            >
              <span className="font-semibold">{item.id}.</span> {item.label}
            </div>
            {index < items.length - 1 ? (
              <div
                aria-hidden="true"
                className={`hidden h-px w-5 shrink-0 sm:block ${connectorClasses}`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <ProgressIndicator />
      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Form {...step1Form}>
              <form
                onSubmit={
                  otpSent
                    ? onVerify
                    : (event) => {
                        event.preventDefault();
                        void onSendOtp();
                      }
                }
                className="space-y-4"
              >
                <FormField
                  control={step1Form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-3">
                        <FormLabel className="text-slate-200/90">{t('signup.emailLabel')}</FormLabel>
                        {otpSent ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto px-2 py-1 text-xs text-sky-100 hover:bg-white/10 hover:text-white"
                            onClick={resetOtpState}
                            disabled={busy || step1Form.formState.isSubmitting}
                          >
                            {t('signup.editEmail')}
                          </Button>
                        ) : null}
                      </div>
                      <FormControl>
                        <Input {...field} autoComplete="email" dir="ltr" readOnly={isStep1Locked} className="h-11 rounded-xl border-field-border bg-field/90 text-field-foreground placeholder:text-field-placeholder focus-visible:ring-field-focus dark:bg-field/75" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!otpSent ? (
                  <Button
                    type="button"
                    className="w-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
                    onClick={onSendOtp}
                    disabled={busy || step1Form.formState.isSubmitting}
                  >
                    {isSendingOtp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {isSendingOtp
                      ? t('signup.sendingOtp')
                      : t('signup.sendOtp')}
                  </Button>
                ) : (
                  <div className="space-y-4 rounded-xl border border-sky-300/35 bg-slate-950/45 p-4 shadow-[0_0_22px_rgba(14,165,233,0.12)]">
                    <div className="text-sm text-slate-100/90">
                      {t('signup.otpSentHint')}
                    </div>
                    <FormField
                      control={step1Form.control}
                      name="otpCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200/90">{t('signup.otpLabel')}</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="numeric" dir="ltr" className="h-11 rounded-xl border-field-border bg-field/90 text-field-foreground placeholder:text-field-placeholder focus-visible:ring-field-focus dark:bg-field/75" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="secondary"
                        className="border border-white/15 bg-white/10 text-sky-50 hover:bg-white/15 hover:text-white disabled:text-slate-300"
                        onClick={onSendOtp}
                        disabled={
                          busy ||
                          step1Form.formState.isSubmitting ||
                          resendSeconds > 0
                        }
                      >
                        {isSendingOtp ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        {resendSeconds > 0
                          ? t('signup.resendCountdown', {
                              seconds: resendSeconds
                            })
                          : isSendingOtp
                            ? t('signup.sendingOtp')
                            : t('signup.resendCode')}
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
                        disabled={busy || step1Form.formState.isSubmitting}
                      >
                        {isVerifyingOtp ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        {isVerifyingOtp
                          ? t('signup.verifyingOtp')
                          : t('signup.verifyAndContinue')}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <SignupProfileModal
        email={verifiedEmail}
        open={step === 2 && Boolean(verifiedEmail)}
        busy={busy}
        setBusy={setBusy}
        registerRef={controllerRefs.register}
        onOpenChange={(open) => {
          if (!open) setStep(1);
        }}
        onRegistered={onRegistered}
      />
    </>
  );
}
