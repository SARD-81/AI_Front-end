'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {AnimatePresence, motion} from 'motion/react';
import {Loader2} from 'lucide-react';
import {Controller, useForm} from 'react-hook-form';
import {toast} from 'sonner';
import {OtpInput} from '@/components/auth/OtpInput';
import {Button} from '@/components/ui/button';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Separator} from '@/components/ui/separator';
import {isAbortError, registerUser, sendOtp, ServiceError, verifyOtp} from '@/lib/services/auth-service';
import {
  signupStep1EmailSchema,
  signupStep1Schema,
  signupStep2Schema,
  type SignupStep1Values,
  type SignupStep2Values
} from '@/lib/validation/auth-schemas';

const degreeOptions = ['کاردانی', 'کارشناسی', 'کارشناسی ارشد', 'دکتری'];
const facultyOptions = ['مهندسی کامپیوتر', 'مهندسی برق', 'علوم پایه', 'ادبیات', 'مدیریت', 'سایر'];

type SignupWizardProps = {
  onRegistered: () => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  controllerRefs: {
    sendOtp: React.MutableRefObject<AbortController | null>;
    verifyOtp: React.MutableRefObject<AbortController | null>;
    register: React.MutableRefObject<AbortController | null>;
  };
  resetToken: number;
};

export function SignupWizard({onRegistered, busy, setBusy, controllerRefs, resetToken}: SignupWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [otpInlineError, setOtpInlineError] = useState<string | null>(null);

  const sendOtpOpIdRef = useRef(0);
  const verifyOtpOpIdRef = useRef(0);
  const sendOtpInFlightRef = useRef(false);
  const verifyInFlightRef = useRef(false);
  const registerInFlightRef = useRef(false);

  const step1Form = useForm<SignupStep1Values>({
    resolver: zodResolver(signupStep1Schema),
    defaultValues: {email: '', code: ''}
  });

  const step2Form = useForm<SignupStep2Values>({
    resolver: zodResolver(signupStep2Schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      studentId: '',
      degree: '',
      faculty: '',
      major: '',
      specialization: ''
    }
  });

  useEffect(() => {
    if (countdownSeconds <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownSeconds]);

  useEffect(() => {
    setStep(1);
    setRequestId(null);
    setVerificationToken(null);
    setLockedEmail(null);
    setCountdownSeconds(0);
    setOtpInlineError(null);
    step1Form.reset({email: '', code: ''});
    step2Form.reset();
  }, [resetToken, step1Form, step2Form]);

  const formattedCountdown = useMemo(() => {
    const minutes = String(Math.floor(countdownSeconds / 60)).padStart(2, '0');
    const seconds = String(countdownSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [countdownSeconds]);

  const sendCode = async () => {
    if (sendOtpInFlightRef.current) {
      return;
    }

    const emailValid = await step1Form.trigger('email');
    if (!emailValid) {
      return;
    }

    const emailValue = step1Form.getValues('email');
    const parsed = signupStep1EmailSchema.safeParse({email: emailValue});
    if (!parsed.success) {
      return;
    }

    sendOtpInFlightRef.current = true;
    setBusy(true);
    setOtpInlineError(null);

    controllerRefs.sendOtp.current?.abort();
    const controller = new AbortController();
    controllerRefs.sendOtp.current = controller;

    const opId = ++sendOtpOpIdRef.current;

    try {
      const result = await sendOtp({email: parsed.data.email}, {signal: controller.signal});
      if (opId !== sendOtpOpIdRef.current) {
        return;
      }

      setRequestId(result.requestId);
      setLockedEmail(parsed.data.email);
      setVerificationToken(null);
      setCountdownSeconds(60);
      step1Form.setValue('code', '');
      toast.success('کد تایید ایمیل با موفقیت ارسال شد.');
      if (result.devCode) {
        toast.info(`کد توسعه: ${result.devCode}`);
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      const message = error instanceof ServiceError ? error.message : 'ارسال کد تایید با خطا مواجه شد.';
      setOtpInlineError(message);
      toast.error(message);
    } finally {
      sendOtpInFlightRef.current = false;
      setBusy(false);
    }
  };

  const verifyCode = step1Form.handleSubmit(async (values) => {
    if (!requestId) {
      setOtpInlineError('ابتدا کد تایید را دریافت کنید.');
      return;
    }

    if (verifyInFlightRef.current) {
      return;
    }

    verifyInFlightRef.current = true;
    setBusy(true);
    setOtpInlineError(null);

    controllerRefs.verifyOtp.current?.abort();
    const controller = new AbortController();
    controllerRefs.verifyOtp.current = controller;
    const opId = ++verifyOtpOpIdRef.current;

    try {
      const result = await verifyOtp({requestId, code: values.code}, {signal: controller.signal});
      if (opId !== verifyOtpOpIdRef.current) {
        return;
      }

      setVerificationToken(result.verificationToken);
      setStep(2);
      toast.success('ایمیل با موفقیت تایید شد.');
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      const message = error instanceof ServiceError ? error.message : 'تایید کد با خطا مواجه شد.';
      setOtpInlineError(message);
      toast.error(message);
    } finally {
      verifyInFlightRef.current = false;
      setBusy(false);
    }
  });

  const completeRegistration = step2Form.handleSubmit(async (values) => {
    if (!verificationToken) {
      toast.error('تایید ایمیل انجام نشده است. لطفا مرحله اول را تکمیل کنید.');
      setStep(1);
      return;
    }

    if (registerInFlightRef.current) {
      return;
    }

    registerInFlightRef.current = true;
    setBusy(true);

    controllerRefs.register.current?.abort();
    const controller = new AbortController();
    controllerRefs.register.current = controller;

    try {
      await registerUser(
        {
          verificationToken,
          profile: values
        },
        {signal: controller.signal}
      );

      toast.success('ثبت‌نام با موفقیت انجام شد. اکنون می‌توانید وارد شوید.');
      if (process.env.NODE_ENV === 'development') {
        toast.info('رمز عبور آزمایشی: Demo@1234');
      }
      onRegistered();
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      const message = error instanceof ServiceError ? error.message : 'ثبت‌نام با خطا مواجه شد.';
      toast.error(message);
    } finally {
      registerInFlightRef.current = false;
      setBusy(false);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm">
        <span className={step === 1 ? 'font-semibold text-primary' : 'text-muted-foreground'}>۱) تایید ایمیل</span>
        <Separator className="flex-1" />
        <span className={step === 2 ? 'font-semibold text-primary' : 'text-muted-foreground'}>۲) تکمیل اطلاعات</span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{opacity: 0, y: 8, height: 0}}
            animate={{opacity: 1, y: 0, height: 'auto'}}
            exit={{opacity: 0, y: -8, height: 0}}
            transition={{duration: 0.2, ease: 'easeOut'}}
            className="overflow-hidden"
          >
            <Form {...step1Form}>
              <form className="space-y-4" onSubmit={verifyCode} noValidate>
                <FormField
                  control={step1Form.control}
                  name="email"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>ایمیل دانشگاهی</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" disabled={Boolean(lockedEmail)} placeholder="example@mail.sbu.ac.ir" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" disabled={busy || sendOtpInFlightRef.current} onClick={sendCode}>
                    {sendOtpInFlightRef.current ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    ارسال کد
                  </Button>
                  {lockedEmail ? (
                    <button
                      type="button"
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      onClick={() => {
                        setLockedEmail(null);
                        setRequestId(null);
                        setVerificationToken(null);
                        step1Form.setValue('code', '');
                        setOtpInlineError(null);
                      }}
                    >
                      تغییر ایمیل
                    </button>
                  ) : null}
                </div>

                <FormItem>
                  <FormLabel>کد تایید</FormLabel>
                  <Controller
                    control={step1Form.control}
                    name="code"
                    render={({field}) => (
                      <FormControl>
                        <OtpInput value={field.value ?? ''} onChange={field.onChange} disabled={busy} />
                      </FormControl>
                    )}
                  />
                  <FormMessage>{step1Form.formState.errors.code?.message}</FormMessage>
                </FormItem>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>زمان باقی‌مانده برای ارسال مجدد: {formattedCountdown}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={sendCode}
                    disabled={countdownSeconds > 0 || busy}
                  >
                    ارسال مجدد
                  </Button>
                </div>

                {otpInlineError ? <p className="text-sm text-destructive">{otpInlineError}</p> : null}

                <Button type="submit" className="w-full" disabled={busy || verifyInFlightRef.current}>
                  {verifyInFlightRef.current ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  تایید و ادامه
                </Button>
              </form>
            </Form>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{opacity: 0, y: 8, height: 0}}
            animate={{opacity: 1, y: 0, height: 'auto'}}
            exit={{opacity: 0, y: -8, height: 0}}
            transition={{duration: 0.2, ease: 'easeOut'}}
            className="overflow-hidden"
          >
            <Form {...step2Form}>
              <form onSubmit={completeRegistration} className="space-y-4" noValidate>
                <div className="grid gap-4 md:grid-cols-2">
                  {(
                    [
                      ['firstName', 'نام'],
                      ['lastName', 'نام خانوادگی'],
                      ['studentId', 'شماره دانشجویی'],
                      ['major', 'رشته تحصیلی'],
                      ['specialization', 'گرایش (اختیاری)']
                    ] as const
                  ).map(([name, label]) => (
                    <FormField
                      key={name}
                      control={step2Form.control}
                      name={name}
                      render={({field}) => (
                        <FormItem className={name === 'specialization' ? 'md:col-span-2' : undefined}>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input {...field} inputMode={name === 'studentId' ? 'numeric' : undefined} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}

                  <FormField
                    control={step2Form.control}
                    name="degree"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>مقطع تحصیلی</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">انتخاب کنید</option>
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
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>دانشکده</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">انتخاب کنید</option>
                            {facultyOptions.map((option) => (
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
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={busy}>
                    مرحله قبل
                  </Button>
                  <Button type="submit" className="flex-1" disabled={busy || registerInFlightRef.current}>
                    {registerInFlightRef.current ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    تکمیل ثبت‌نام
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
