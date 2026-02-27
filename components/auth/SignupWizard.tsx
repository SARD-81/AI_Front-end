'use client';

import {useEffect, useState} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {AnimatePresence, motion} from 'motion/react';
import {Loader2} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Separator} from '@/components/ui/separator';
import {isAbortError, registerUser, sendOtp, ServiceError, verifyOtp} from '@/lib/services/auth-service';
import {signupStep1Schema, signupStep2Schema, type SignupStep1Values, type SignupStep2Values} from '@/lib/validation/auth-schemas';

const degreeOptions = ['کاردانی', 'کارشناسی', 'کارشناسی ارشد', 'دکتری'];

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
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');

  const step1Form = useForm<SignupStep1Values>({
    resolver: zodResolver(signupStep1Schema),
    defaultValues: {email: '', otpCode: ''}
  });

  const step2Form = useForm<SignupStep2Values>({
    resolver: zodResolver(signupStep2Schema),
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
    step1Form.reset();
    step2Form.reset();
  }, [resetToken, step1Form, step2Form]);

  const onSendOtp = async () => {
    const isValid = await step1Form.trigger('email');
    if (!isValid) return;

    const controller = new AbortController();
    controllerRefs.sendOtp.current?.abort();
    controllerRefs.sendOtp.current = controller;

    try {
      setBusy(true);
      const email = step1Form.getValues('email');
      const result = await sendOtp({email}, {signal: controller.signal});
      toast.success(result.message);
    } catch (error) {
      if (isAbortError(error)) return;
      const message = error instanceof ServiceError ? error.message : 'ارسال کد تایید ناموفق بود.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onVerify = step1Form.handleSubmit(async (values) => {
    const controller = new AbortController();
    controllerRefs.verifyOtp.current?.abort();
    controllerRefs.verifyOtp.current = controller;

    try {
      setBusy(true);
      const result = await verifyOtp({email: values.email, otpCode: values.otpCode}, {signal: controller.signal});
      setVerifiedEmail(values.email);
      setStep(2);
      toast.success(result.message);
    } catch (error) {
      if (isAbortError(error)) return;
      const message = error instanceof ServiceError ? error.message : 'تایید کد ناموفق بود.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  });

  const onRegister = step2Form.handleSubmit(async (values) => {
    const controller = new AbortController();
    controllerRefs.register.current?.abort();
    controllerRefs.register.current = controller;

    try {
      setBusy(true);
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
        {signal: controller.signal}
      );
      toast.success(result.message);
      onRegistered();
    } catch (error) {
      if (isAbortError(error)) return;
      const message = error instanceof ServiceError ? error.message : 'ثبت‌نام ناموفق بود.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  });

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step === 1 ? (
        <motion.div key="step1" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
          <Form {...step1Form}>
            <form onSubmit={onVerify} className="space-y-4">
              <FormField control={step1Form.control} name="email" render={({field}) => (
                <FormItem><FormLabel>ایمیل دانشگاهی</FormLabel><FormControl><Input {...field} dir="ltr" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={step1Form.control} name="otpCode" render={({field}) => (
                <FormItem><FormLabel>کد تایید</FormLabel><FormControl><Input {...field} inputMode="numeric" dir="ltr" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={onSendOtp} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}ارسال کد</Button>
                <Button type="submit" className="flex-1" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}تایید و ادامه</Button>
              </div>
            </form>
          </Form>
        </motion.div>
      ) : (
        <motion.div key="step2" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
          <div className="mb-4 rounded-md border border-border bg-muted/30 p-3 text-sm">ایمیل تاییدشده: <span dir="ltr">{verifiedEmail}</span></div>
          <Form {...step2Form}>
            <form onSubmit={onRegister} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField control={step2Form.control} name="firstName" render={({field}) => (
                  <FormItem><FormLabel>نام</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={step2Form.control} name="lastName" render={({field}) => (
                  <FormItem><FormLabel>نام خانوادگی</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={step2Form.control} name="studentId" render={({field}) => (
                <FormItem><FormLabel>شماره دانشجویی</FormLabel><FormControl><Input {...field} dir="ltr" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={step2Form.control} name="degreeLevel" render={({field}) => (
                <FormItem><FormLabel>مقطع تحصیلی</FormLabel><FormControl><select {...field} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="">انتخاب کنید</option>{degreeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={step2Form.control} name="faculty" render={({field}) => (
                <FormItem><FormLabel>دانشکده</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={step2Form.control} name="major" render={({field}) => (
                <FormItem><FormLabel>رشته تحصیلی</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={step2Form.control} name="specialization" render={({field}) => (
                <FormItem><FormLabel>گرایش (اختیاری)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Separator />
              <FormField control={step2Form.control} name="password" render={({field}) => (
                <FormItem><FormLabel>رمز عبور</FormLabel><FormControl><Input {...field} type="password" dir="ltr" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={step2Form.control} name="confirmPassword" render={({field}) => (
                <FormItem><FormLabel>تکرار رمز عبور</FormLabel><FormControl><Input {...field} type="password" dir="ltr" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={busy}>بازگشت</Button>
                <Button type="submit" className="flex-1" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}تکمیل ثبت‌نام</Button>
              </div>
            </form>
          </Form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
