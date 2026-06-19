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
import { Separator } from '@/components/ui/separator';
import {
  isAbortError,
  registerUser,
  sendOtp,
  ServiceError,
  verifyOtp
} from '@/lib/services/auth-service';
import {
  createSignupStep1Schema,
  createSignupStep2Schema,
  type AuthSchemaTranslator,
  type SignupStep1Values,
  type SignupStep2Values
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
    'send' | 'verify' | 'register' | null
  >(null);
  const t = useTranslations('auth');
  const schemaT: AuthSchemaTranslator = (key) => t(`validation.${key}`);
  const degreeOptions = t.raw('signup.degreeOptions') as string[];

  const step1Form = useForm<SignupStep1Values>({
    resolver: zodResolver(createSignupStep1Schema(schemaT)),
    defaultValues: { email: '', otpCode: '' }
  });

  const step2Form = useForm<SignupStep2Values>({
    resolver: zodResolver(createSignupStep2Schema(schemaT)),
    defaultValues: {
      firstName: '',
      lastName: '',
      studentId: '',
      degreeLevel: '',
      faculty: '',
      major: '',
      specialization: '',
      password: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    setStep(1);
    setVerifiedEmail('');
    setOtpSent(false);
    setResendSeconds(0);
    setPendingAction(null);
    step1Form.reset();
    step2Form.reset();
  }, [resetToken, step1Form, step2Form]);

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

  const onRegister = step2Form.handleSubmit(async (values) => {
    if (!verifiedEmail) {
      toast.error(t('signup.verifyFirstStepRequired'));
      setStep(1);
      return;
    }

    const controller = new AbortController();
    controllerRefs.register.current?.abort();
    controllerRefs.register.current = controller;

    try {
      setBusy(true);
      setPendingAction('register');
      const result = await registerUser(
        {
          email: verifiedEmail,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          studentId: values.studentId,
          faculty: values.faculty,
          major: values.major,
          degreeLevel: values.degreeLevel
        },
        { signal: controller.signal }
      );
      toast.success(result.message);
      await onRegistered({ email: verifiedEmail, password: values.password });
    } catch (error) {
      if (isAbortError(error)) return;
      const message =
        error instanceof ServiceError
          ? error.message
          : t('signup.registerErrorFallback');
      toast.error(message);
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  });

  const isSendingOtp = pendingAction === 'send';
  const isVerifyingOtp = pendingAction === 'verify';
  const isCompletingRegistration = pendingAction === 'register';
  const isStep1Locked = otpSent || step === 2;

  const ProgressIndicator = () => (
    <div className="mb-5 grid grid-cols-2 gap-2 text-xs sm:text-sm">
      {[
        { id: 1, label: t('signup.progress.emailVerification') },
        { id: 2, label: t('signup.progress.completeProfile') }
      ].map((item) => {
        const isActive = step === item.id;
        const isComplete = step > item.id;

        return (
          <div
            key={item.id}
            className={`rounded-xl border px-3 py-2 transition ${
              isActive || isComplete
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border bg-muted/20 text-muted-foreground'
            }`}
          >
            <span className="font-semibold">{item.id}.</span> {item.label}
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
                        <FormLabel>{t('signup.emailLabel')}</FormLabel>
                        {otpSent ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto px-2 py-1 text-xs"
                            onClick={resetOtpState}
                            disabled={busy || step1Form.formState.isSubmitting}
                          >
                            {t('signup.editEmail')}
                          </Button>
                        ) : null}
                      </div>
                      <FormControl>
                        <Input {...field} dir="ltr" readOnly={isStep1Locked} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!otpSent ? (
                  <Button
                    type="button"
                    className="w-full"
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
                  <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="text-sm text-muted-foreground">
                      {t('signup.otpSentHint')}
                    </div>
                    <FormField
                      control={step1Form.control}
                      name="otpCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('signup.otpLabel')}</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode="numeric" dir="ltr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="secondary"
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
                        className="flex-1"
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
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-4 rounded-md border border-border bg-muted/30 p-3 text-sm">
              {t('signup.verifiedEmail')}:{' '}
              <span dir="ltr">{verifiedEmail}</span>
            </div>
            <Form {...step2Form}>
              <form onSubmit={onRegister} className="space-y-5">
                <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                  <h3 className="text-sm font-semibold">
                    {t('signup.groups.personalInfo')}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={step2Form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('signup.firstNameLabel')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={step2Form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('signup.lastNameLabel')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>
                <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                  <h3 className="text-sm font-semibold">
                    {t('signup.groups.academicInfo')}
                  </h3>
                  <FormField
                    control={step2Form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('signup.studentIdLabel')}</FormLabel>
                        <FormControl>
                          <Input {...field} dir="ltr" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('signup.profileFieldsFutureNote')}
                  </p>
                  <FormField
                    control={step2Form.control}
                    name="degreeLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('signup.degreeLevelLabel')}</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                          >
                            <option value="">{t('signup.selectOption')}</option>
                            {degreeOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={step2Form.control}
                    name="faculty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('signup.facultyLabel')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={step2Form.control}
                    name="major"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('signup.majorLabel')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={step2Form.control}
                    name="specialization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('signup.specializationLabel')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>
                <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                  <h3 className="text-sm font-semibold">
                    {t('signup.groups.password')}
                  </h3>
                  <FormField
                    control={step2Form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('signup.passwordLabel')}</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" dir="ltr" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Separator />
                  <FormField
                    control={step2Form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('signup.confirmPasswordLabel')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="password" dir="ltr" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(1)}
                    disabled={busy || step2Form.formState.isSubmitting}
                  >
                    {t('signup.back')}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={busy || step2Form.formState.isSubmitting}
                  >
                    {isCompletingRegistration ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {isCompletingRegistration
                      ? t('signup.completingRegistration')
                      : t('signup.complete')}
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
