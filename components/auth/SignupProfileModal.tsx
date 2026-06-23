'use client';

import {useEffect, useMemo, useState} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Loader2} from 'lucide-react';
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

const inputClassName = 'h-11 rounded-xl border-white/10 bg-white/[0.08] text-white placeholder:text-slate-400/70 focus-visible:ring-primary/60';
const selectClassName = 'flex h-11 w-full rounded-xl border border-white/10 bg-slate-950/90 px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60';

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
    if (valid) setStepIndex((value) => Math.min(value + 1, steps.length - 1));
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={locale === 'fa' ? 'rtl' : 'ltr'} className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto overflow-x-hidden rounded-[1.5rem] border-white/15 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl sm:rounded-[2rem]">
        <DialogTitle className="text-xl font-black leading-8 text-white md:text-2xl">{t('signup.modalTitle')}</DialogTitle>
        <p className="text-sm leading-7 text-slate-300">{t('signup.modalDescription')} <span dir="ltr" className="text-sky-100">{email}</span></p>
        <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-4">
          {steps.map((item, index) => (
            <div key={item} className={`rounded-xl border px-2 py-2 text-center ${index <= stepIndex ? 'border-primary/45 bg-primary/15 text-white' : 'border-white/10 bg-white/[0.04] text-slate-400'}`}>{index + 1}. {item === 'role' ? t('signup.roleLabel') : item === 'personal' ? t('signup.groups.personalInfo') : item === 'academic' ? (role === 'staff' ? t('signup.groups.employmentInfo') : t('signup.groups.academicInfo')) : t('signup.groups.password')}</div>
          ))}
        </div>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-5">
            <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <h3 className="text-sm font-bold text-sky-100">{stepTitle}</h3>
              {currentStep === 'role' ? <FormField control={form.control} name="role" render={({field}) => <FormItem><FormLabel>{t('signup.roleLabel')}</FormLabel><FormControl><select {...field} value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value || undefined)} className={selectClassName}><option value="">{t('signup.selectOption')}</option><option value="professor">{t('signup.professorRoleLabel')}</option><option value="staff">{t('signup.staffRoleLabel')}</option></select></FormControl><FormMessage /></FormItem>} /> : null}
              {currentStep === 'personal' ? <div className="grid gap-4 sm:grid-cols-2"><FormField control={form.control} name="firstName" render={({field}) => <FormItem><FormLabel>{t('signup.firstNameLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="lastName" render={({field}) => <FormItem><FormLabel>{t('signup.lastNameLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} /></div> : null}
              {currentStep === 'academic' && role === 'student' ? <div className="grid gap-4 sm:grid-cols-2"><FormField control={form.control} name="studentId" render={({field}) => <FormItem><FormLabel>{t('signup.studentIdLabel')}</FormLabel><FormControl><Input {...field} dir="ltr" className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="faculty" render={({field}) => <FormItem><FormLabel>{t('signup.facultyLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="major" render={({field}) => <FormItem><FormLabel>{t('signup.majorLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="degreeLevel" render={({field}) => <FormItem><FormLabel>{t('signup.degreeLevelLabel')}</FormLabel><FormControl><select {...field} className={selectClassName}><option value="">{t('signup.selectOption')}</option>{degreeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="entryYear" render={({field}) => <FormItem><FormLabel>{t('signup.entryYearLabel')}</FormLabel><FormControl><Input {...field} value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)} type="number" inputMode="numeric" dir="ltr" className={inputClassName} /></FormControl><FormMessage /></FormItem>} /></div> : null}
              {currentStep === 'academic' && (role === 'professor' || role === 'staff') ? <div className="grid gap-4 sm:grid-cols-2"><FormField control={form.control} name="personnelId" render={({field}) => <FormItem><FormLabel>{t('signup.personnelIdLabel')}</FormLabel><FormControl><Input {...field} dir="ltr" className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="faculty" render={({field}) => <FormItem><FormLabel>{t('signup.facultyLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="department" render={({field}) => <FormItem><FormLabel>{t('signup.departmentLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />{role === 'professor' ? <FormField control={form.control} name="academicRank" render={({field}) => <FormItem><FormLabel>{t('signup.academicRankLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} /> : <FormField control={form.control} name="jobTitle" render={({field}) => <FormItem><FormLabel>{t('signup.jobTitleLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />}</div> : null}
              {currentStep === 'password' ? <div className="grid gap-4 sm:grid-cols-2"><FormField control={form.control} name="password" render={({field}) => <FormItem><FormLabel>{t('signup.passwordLabel')}</FormLabel><FormControl><Input {...field} type="password" autoComplete="new-password" dir="ltr" className={inputClassName} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="confirmPassword" render={({field}) => <FormItem><FormLabel>{t('signup.confirmPasswordLabel')}</FormLabel><FormControl><Input {...field} type="password" autoComplete="new-password" dir="ltr" className={inputClassName} /></FormControl><FormMessage /></FormItem>} /></div> : null}
            </section>
            {registerError ? <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">{registerError}</p> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => setStepIndex((value) => Math.max(value - 1, 0))} disabled={busy || stepIndex === 0}>{t('signup.back')}</Button>
              {isLastStep ? <Button type="submit" className="flex-1" disabled={busy || form.formState.isSubmitting}>{busy || form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t('signup.complete')}</Button> : <Button type="button" className="flex-1" onClick={goNext} disabled={busy}>{t('signup.next')}</Button>}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
