'use client';

import {useEffect, useMemo, useState} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Check, Loader2} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useForm} from 'react-hook-form';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {isAbortError, registerUser, ServiceError} from '@/lib/services/auth-service';
import {createSignupStep2Schema, type AuthSchemaTranslator, type SignupStep2Values} from '@/lib/validation/auth-schemas';

type Props = {
  email: string;
  open: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  registerRef: React.MutableRefObject<AbortController | null>;
  onOpenChange: (open: boolean) => void;
  onRegistered: (payload: {email: string; password: string}) => Promise<void> | void;
};

const inputClassName = 'h-11 rounded-xl border-field-border bg-field/90 text-field-foreground placeholder:text-field-placeholder focus-visible:ring-field-focus dark:bg-field/75';
const selectClassName = 'flex h-11 w-full rounded-xl border border-field-border bg-menu px-3 text-sm text-menu-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-focus';
const chipClassName = 'inline-flex items-center gap-1.5 rounded-full border border-menu-border bg-menu/70 px-3 py-1 text-xs font-semibold text-menu-foreground';

function isStudentEmail(email: string) {
  return email.trim().toLowerCase().endsWith('@mail.sbu.ac.ir');
}

type StepKey = 'personal' | 'role' | 'academic' | 'password';

export function SignupProfileModal({email, open, busy, setBusy, registerRef, onOpenChange, onRegistered}: Props) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const schemaT: AuthSchemaTranslator = (key) => t(`validation.${key}`);
  const [stepIndex, setStepIndex] = useState(0);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);
  const reduceMotion = useReducedMotion();
  const studentDomain = isStudentEmail(email);
  const degreeOptions = t.raw('signup.degreeOptions') as string[];

  const form = useForm<SignupStep2Values>({
    resolver: zodResolver(createSignupStep2Schema(schemaT)),
    mode: 'onChange',
    defaultValues: {
      email: email.trim(),
      role: studentDomain ? 'student' : undefined,
      firstName: '',
      lastName: '',
      studentId: '',
      degreeLevel: '',
      entryYear: undefined,
      faculty: '',
      major: '',
      specialization: '',
      personnelId: '',
      department: '',
      academicRank: '',
      jobTitle: '',
      password: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    const verifiedEmail = email.trim();
    const nextRole = isStudentEmail(verifiedEmail) ? 'student' : undefined;

    form.setValue('email', verifiedEmail, {shouldDirty: false, shouldValidate: true});
    form.setValue('role', nextRole, {shouldDirty: false, shouldValidate: true});
    setDirection(1);
    setStepIndex(0);
    setRegisterError(null);
  }, [email, form]);

  const role = studentDomain ? 'student' : form.watch('role');
  const steps = useMemo<StepKey[]>(() => (studentDomain ? ['personal', 'academic', 'password'] : ['role', 'personal', 'academic', 'password']), [studentDomain]);
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const fieldsForStep = (step: StepKey): (keyof SignupStep2Values)[] => {
    if (step === 'role') return ['role'];
    if (step === 'personal') return ['firstName', 'lastName'];
    if (step === 'password') return ['password', 'confirmPassword'];
    if (role === 'student') return ['studentId', 'faculty', 'major', 'degreeLevel', 'entryYear'];
    return ['personnelId', 'faculty', 'department'];
  };

  const goNext = async () => {
    const valid = await form.trigger(fieldsForStep(currentStep), {shouldFocus: true});
    if (valid) {
      setDirection(1);
      setStepIndex((value) => Math.min(value + 1, steps.length - 1));
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const controller = new AbortController();
    registerRef.current?.abort();
    registerRef.current = controller;
    setRegisterError(null);

    try {
      setBusy(true);
      const resolvedRole = studentDomain ? 'student' : values.role;
      const base = {email, password: values.password, firstName: values.firstName, lastName: values.lastName, faculty: values.faculty};
      const payload = resolvedRole === 'student'
        ? {...base, role: 'student' as const, studentId: values.studentId, major: values.major, degreeLevel: values.degreeLevel, entryYear: Number(values.entryYear)}
        : resolvedRole === 'professor'
          ? {...base, role: 'professor' as const, personnelId: values.personnelId ?? '', department: values.department ?? '', academicRank: values.academicRank}
          : {...base, role: 'staff' as const, personnelId: values.personnelId ?? '', department: values.department ?? '', jobTitle: values.jobTitle};
      const result = await registerUser(payload, {signal: controller.signal});
      toast.success(result.message);
      onOpenChange(false);
      await onRegistered({email, password: values.password});
    } catch (error) {
      if (isAbortError(error)) return;
      const message = error instanceof ServiceError ? error.message : t('signup.registerErrorFallback');
      setRegisterError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  });

  const stepTitle = currentStep === 'role' ? t('signup.groups.role') : currentStep === 'personal' ? t('signup.groups.personalInfo') : currentStep === 'academic' ? (role === 'staff' ? t('signup.groups.employmentInfo') : t('signup.groups.academicInfo')) : t('signup.groups.password');
  const stepDescription = currentStep === 'role' ? t('signup.stepHelpers.role') : currentStep === 'personal' ? t('signup.stepHelpers.personal') : currentStep === 'academic' ? (role === 'staff' ? t('signup.stepHelpers.employment') : t('signup.stepHelpers.academic')) : t('signup.stepHelpers.password');
  const roleLabel = role === 'student' ? t('signup.studentRoleLabel') : role === 'professor' ? t('signup.professorRoleLabel') : role === 'staff' ? t('signup.staffRoleLabel') : null;
  const progressPercent = ((stepIndex + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={locale === 'fa' ? 'rtl' : 'ltr'} className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border-white/15 bg-slate-950/95 p-0 text-white shadow-2xl backdrop-blur-xl sm:rounded-[2rem]">
        <div className="space-y-4 border-b border-white/10 px-5 py-5 sm:px-7">
          <div className="space-y-3">
            <DialogTitle className="text-xl font-black leading-8 text-white md:text-2xl">{t('signup.modalTitle')}</DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <span className={chipClassName}><Check className="h-3.5 w-3.5 text-emerald-300" />{t('signup.verifiedEmail')}: <span dir="ltr">{email}</span></span>
              {roleLabel ? <span className={chipClassName}>{roleLabel}</span> : null}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-base font-bold text-sky-100">{stepTitle}</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{stepDescription}</p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true"><div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-primary transition-all duration-300 motion-reduce:transition-none" style={{width: `${progressPercent}%`}} /></div>
            <div className="flex gap-1.5" aria-hidden="true">{steps.map((item, index) => <span key={item} className={`h-1.5 flex-1 rounded-full transition-colors ${index <= stepIndex ? 'bg-sky-300/80' : 'bg-white/10'}`} />)}</div>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-7">
            <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.05] p-4 shadow-inner shadow-white/[0.02] sm:p-6">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div key={currentStep} custom={direction} initial={reduceMotion ? false : {opacity: 0, x: direction * (locale === 'fa' ? -18 : 18)}} animate={{opacity: 1, x: 0}} exit={reduceMotion ? {opacity: 0} : {opacity: 0, x: direction * (locale === 'fa' ? 18 : -18)}} transition={{duration: 0.22, ease: 'easeOut'}} className="space-y-4">
              {currentStep === 'role' ? <FormField control={form.control} name="role" render={({field}) => <FormItem><FormLabel>{t('signup.roleLabel')}</FormLabel><FormControl><div className="grid gap-3 sm:grid-cols-2">{(['professor', 'staff'] as const).map((option) => <button key={option} type="button" onClick={() => field.onChange(option)} className={`rounded-2xl border p-4 text-start transition hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-focus ${field.value === option ? 'border-primary/70 bg-primary/15 text-foreground dark:text-white' : 'border-menu-border bg-menu/60 text-menu-foreground'}`}><span className="block text-sm font-bold">{option === 'professor' ? t('signup.professorRoleLabel') : t('signup.staffRoleLabel')}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{option === 'professor' ? t('signup.roleDescriptions.professor') : t('signup.roleDescriptions.staff')}</span></button>)}</div></FormControl><FormMessage /></FormItem>} /> : null}
              {currentStep === 'personal' ? <div className="grid gap-4 sm:grid-cols-2"><FormField control={form.control} name="firstName" render={({field}) => <FormItem><FormLabel>{t('signup.firstNameLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="lastName" render={({field}) => <FormItem><FormLabel>{t('signup.lastNameLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} /></div> : null}
              {currentStep === 'academic' && role === 'student' ? <div className="grid gap-4 sm:grid-cols-2"><FormField control={form.control} name="studentId" render={({field}) => <FormItem><FormLabel>{t('signup.studentIdLabel')}</FormLabel><FormControl><Input {...field} dir="ltr" className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="faculty" render={({field}) => <FormItem><FormLabel>{t('signup.facultyLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="major" render={({field}) => <FormItem><FormLabel>{t('signup.majorLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="degreeLevel" render={({field}) => <FormItem><FormLabel>{t('signup.degreeLevelLabel')}</FormLabel><FormControl><select {...field} className={selectClassName}><option value="">{t('signup.selectOption')}</option>{degreeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="entryYear" render={({field}) => <FormItem><FormLabel>{t('signup.entryYearLabel')}</FormLabel><FormControl><Input {...field} value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)} type="number" inputMode="numeric" dir="ltr" className={inputClassName} /></FormControl><FormMessage /></FormItem>} /></div> : null}
              {currentStep === 'academic' && (role === 'professor' || role === 'staff') ? <div className="grid gap-4 sm:grid-cols-2"><FormField control={form.control} name="personnelId" render={({field}) => <FormItem><FormLabel>{t('signup.personnelIdLabel')}</FormLabel><FormControl><Input {...field} dir="ltr" className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="faculty" render={({field}) => <FormItem><FormLabel>{t('signup.facultyLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="department" render={({field}) => <FormItem><FormLabel>{t('signup.departmentLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />{role === 'professor' ? <FormField control={form.control} name="academicRank" render={({field}) => <FormItem><FormLabel>{t('signup.academicRankLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} /> : <FormField control={form.control} name="jobTitle" render={({field}) => <FormItem><FormLabel>{t('signup.jobTitleLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />}</div> : null}
              {currentStep === 'password' ? <div className="grid gap-4 sm:grid-cols-2"><FormField control={form.control} name="password" render={({field}) => <FormItem><FormLabel>{t('signup.passwordLabel')}</FormLabel><FormControl><Input {...field} type="password" autoComplete="new-password" dir="ltr" className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="confirmPassword" render={({field}) => <FormItem><FormLabel>{t('signup.confirmPasswordLabel')}</FormLabel><FormControl><Input {...field} type="password" autoComplete="new-password" dir="ltr" className={inputClassName} /></FormControl><FormMessage /></FormItem>} /></div> : null}
                </motion.div>
              </AnimatePresence>
            </section>
            {registerError ? <p className="mt-4 rounded-2xl border border-danger-border bg-danger-surface px-3 py-2 text-sm font-medium text-danger-text shadow-sm">{registerError}</p> : null}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-white/10 bg-slate-950/90 px-5 py-4 sm:flex-row sm:px-7">
              <Button type="button" variant="ghost" onClick={() => { setDirection(-1); setStepIndex((value) => Math.max(value - 1, 0)); }} disabled={busy || stepIndex === 0}>{t('signup.back')}</Button>
              {isLastStep ? <Button type="submit" className="flex-1" disabled={busy || form.formState.isSubmitting}>{busy || form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{busy || form.formState.isSubmitting ? t('signup.completingRegistration') : t('signup.complete')}</Button> : <Button type="button" className="flex-1" onClick={goNext} disabled={busy}>{t('signup.next')}</Button>}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
