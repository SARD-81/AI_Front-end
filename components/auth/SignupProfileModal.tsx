'use client';

import {useEffect, useMemo, useState} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2} from 'lucide-react';
import {isStudentEmail} from '@/lib/config/email-domains';
import {useLocale, useTranslations} from 'next-intl';
import {useForm} from 'react-hook-form';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {ValidationChecklist, type ChecklistRule} from '@/components/auth/ValidationChecklist';
import {isAbortError, registerUser, ServiceError} from '@/lib/services/auth-service';
import {createSignupStep2Schema, type AuthSchemaTranslator, type SignupStep2Values} from '@/lib/validation/auth-schemas';
import {evaluatePasswordRules, passwordsMatch, PASSWORD_RULE_IDS} from '@/lib/validation/password-rules';

type Props = {
  email: string;
  open: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  registerRef: React.MutableRefObject<AbortController | null>;
  onOpenChange: (open: boolean) => void;
  onRegistered: (payload: {email: string; password: string}) => Promise<void> | void;
  flowToken?: string;
  onFlowExpired?: () => void;
};

const inputClassName =
  'h-11 rounded-xl border-field-border bg-field/90 text-field-foreground placeholder:text-field-placeholder focus-visible:ring-field-focus dark:bg-field/75';
const selectClassName =
  'flex h-11 w-full rounded-xl border border-field-border bg-field/90 px-3 text-sm text-field-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-focus dark:bg-field/75';
const chipClassName =
  'inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-50 shadow-sm';
const passwordToggleClassName =
  'absolute inset-y-0 end-2 inline-flex items-center rounded-lg px-2 text-field-placeholder transition-colors hover:text-field-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-focus';

type StepKey = 'personal' | 'role' | 'academic' | 'password';

export function SignupProfileModal({email, open, busy, setBusy, registerRef, onOpenChange, onRegistered, flowToken, onFlowExpired}: Props) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const schemaT: AuthSchemaTranslator = (key) => t(`validation.${key}`);
  const [stepIndex, setStepIndex] = useState(0);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    setShowPassword(false);
    setShowConfirmPassword(false);
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

  const goBack = () => {
    setDirection(-1);
    setStepIndex((value) => Math.max(value - 1, 0));
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const controller = new AbortController();
    registerRef.current?.abort();
    registerRef.current = controller;
    setRegisterError(null);

    try {
      setBusy(true);
      const resolvedRole = studentDomain ? 'student' : values.role;
      const base = {email, otpToken: flowToken, password: values.password, firstName: values.firstName, lastName: values.lastName, faculty: values.faculty};
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
      if (error instanceof ServiceError && error.status === 403) {
        // Flow token expired or already consumed: restart the OTP flow.
        onOpenChange(false);
        onFlowExpired?.();
      }
    } finally {
      setBusy(false);
    }
  });

  const stepTitle = currentStep === 'role' ? t('signup.groups.role') : currentStep === 'personal' ? t('signup.groups.personalInfo') : currentStep === 'academic' ? (role === 'staff' ? t('signup.groups.employmentInfo') : t('signup.groups.academicInfo')) : t('signup.groups.password');
  const stepDescription = currentStep === 'role' ? t('signup.stepHelpers.role') : currentStep === 'personal' ? t('signup.stepHelpers.personal') : currentStep === 'academic' ? (role === 'staff' ? t('signup.stepHelpers.employment') : t('signup.stepHelpers.academic')) : t('signup.stepHelpers.password');
  const roleLabel = role === 'student' ? t('signup.studentRoleLabel') : role === 'professor' ? t('signup.professorRoleLabel') : role === 'staff' ? t('signup.staffRoleLabel') : null;
  const progressPercent = ((stepIndex + 1) / steps.length) * 100;

  // --- Live validation checklist -------------------------------------------
  // Every value is watched so the checklist reflects the field state on each
  // keystroke, instead of only after a failed "next"/"submit" attempt.
  const watchedFirstName = form.watch('firstName') ?? '';
  const watchedLastName = form.watch('lastName') ?? '';
  const watchedStudentId = form.watch('studentId') ?? '';
  const watchedFaculty = form.watch('faculty') ?? '';
  const watchedMajor = form.watch('major') ?? '';
  const watchedDegreeLevel = form.watch('degreeLevel') ?? '';
  const watchedEntryYear = form.watch('entryYear');
  const watchedPersonnelId = form.watch('personnelId') ?? '';
  const watchedDepartment = form.watch('department') ?? '';
  const watchedPassword = form.watch('password') ?? '';
  const watchedConfirmPassword = form.watch('confirmPassword') ?? '';
  const passwordRuleState = evaluatePasswordRules(watchedPassword);
  const entryYearNumber = typeof watchedEntryYear === 'number' ? watchedEntryYear : Number(watchedEntryYear);

  const checklistRules = useMemo<ChecklistRule[]>(() => {
    if (currentStep === 'role') {
      return [{id: 'role', label: t('stepRules.role'), met: role === 'professor' || role === 'staff'}];
    }

    if (currentStep === 'personal') {
      return [
        {id: 'firstName', label: t('stepRules.firstName'), met: watchedFirstName.trim().length >= 2},
        {id: 'lastName', label: t('stepRules.lastName'), met: watchedLastName.trim().length >= 2}
      ];
    }

    if (currentStep === 'academic') {
      if (role === 'student') {
        return [
          {id: 'studentId', label: t('stepRules.studentId'), met: /^\d{9}$/.test(watchedStudentId)},
          {id: 'faculty', label: t('stepRules.faculty'), met: watchedFaculty.trim().length > 0},
          {id: 'major', label: t('stepRules.major'), met: watchedMajor.trim().length >= 2},
          {id: 'degreeLevel', label: t('stepRules.degreeLevel'), met: watchedDegreeLevel.trim().length > 0},
          {
            id: 'entryYear',
            label: t('stepRules.entryYear'),
            met: Number.isInteger(entryYearNumber) && entryYearNumber >= 1399 && entryYearNumber <= 1500
          }
        ];
      }

      return [
        {id: 'personnelId', label: t('stepRules.personnelId'), met: watchedPersonnelId.trim().length > 0},
        {id: 'faculty', label: t('stepRules.faculty'), met: watchedFaculty.trim().length > 0},
        {id: 'department', label: t('stepRules.department'), met: watchedDepartment.trim().length > 0}
      ];
    }

    return [
      ...PASSWORD_RULE_IDS.map((ruleId) => ({
        id: ruleId,
        label: t(`passwordRules.${ruleId}`),
        met: passwordRuleState[ruleId]
      })),
      {
        id: 'match',
        label: t('passwordRules.match'),
        met: passwordsMatch(watchedPassword, watchedConfirmPassword)
      }
    ];
  }, [
    currentStep,
    entryYearNumber,
    passwordRuleState,
    role,
    t,
    watchedConfirmPassword,
    watchedDegreeLevel,
    watchedDepartment,
    watchedFaculty,
    watchedFirstName,
    watchedLastName,
    watchedMajor,
    watchedPassword,
    watchedPersonnelId,
    watchedStudentId
  ]);

  const checklistMetCount = checklistRules.filter((rule) => rule.met).length;
  const checklistTitle = currentStep === 'password' ? t('passwordRules.title') : t('stepRules.title');
  const BackIcon = locale === 'fa' ? ArrowRight : ArrowLeft;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={locale === 'fa' ? 'rtl' : 'ltr'}
        className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl border-white/10 bg-slate-950/95 p-0 pe-0 text-white shadow-2xl backdrop-blur-xl"
      >
        {/* Header: fixed 24/28px rhythm, close button gets its own reserved gutter. */}
        <header className="shrink-0 space-y-5 border-b border-white/10 px-6 pb-5 pt-6 pe-14 sm:px-7 sm:pb-6 sm:pt-7 sm:pe-16">
          <div className="space-y-3">
            <DialogTitle className="text-xl font-black leading-8 text-white sm:text-2xl">{t('signup.modalTitle')}</DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <span className={chipClassName}>
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                {t('signup.verifiedEmail')}: <span dir="ltr">{email}</span>
              </span>
              {roleLabel ? <span className={chipClassName}>{roleLabel}</span> : null}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-base font-bold text-sky-100">{stepTitle}</p>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-400">
                {stepIndex + 1}/{steps.length}
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-300">{stepDescription}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-primary transition-all duration-300 motion-reduce:transition-none"
                style={{width: `${progressPercent}%`}}
              />
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              {steps.map((item, index) => (
                <span key={item} className={`h-1.5 flex-1 rounded-full transition-colors ${index <= stepIndex ? 'bg-sky-300/80' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
        </header>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-6 py-6 sm:px-7">
              <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-inner shadow-white/[0.02] sm:p-6">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    initial={reduceMotion ? false : {opacity: 0, x: direction * (locale === 'fa' ? -18 : 18)}}
                    animate={{opacity: 1, x: 0}}
                    exit={reduceMotion ? {opacity: 0} : {opacity: 0, x: direction * (locale === 'fa' ? 18 : -18)}}
                    transition={{duration: 0.22, ease: 'easeOut'}}
                    className="space-y-5"
                  >
                    {currentStep === 'role' ? (
                      <FormField
                        control={form.control}
                        name="role"
                        render={({field}) => (
                          <FormItem>
                            <FormLabel className="text-slate-200/90">{t('signup.roleLabel')}</FormLabel>
                            <FormControl>
                              <div className="grid gap-3 sm:grid-cols-2">
                                {(['professor', 'staff'] as const).map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => field.onChange(option)}
                                    className={`rounded-2xl border p-4 text-start transition hover:border-primary/60 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-focus ${field.value === option ? 'border-primary/70 bg-primary/20 text-white shadow-[0_0_18px_rgba(59,130,246,0.18)]' : 'border-white/15 bg-white/[0.07] text-slate-100 hover:text-white'}`}
                                  >
                                    <span className="block text-sm font-bold">{option === 'professor' ? t('signup.professorRoleLabel') : t('signup.staffRoleLabel')}</span>
                                    <span className="mt-1 block text-xs leading-5 text-slate-300">{option === 'professor' ? t('signup.roleDescriptions.professor') : t('signup.roleDescriptions.staff')}</span>
                                  </button>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}

                    {currentStep === 'personal' ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField control={form.control} name="firstName" render={({field}) => <FormItem><FormLabel className="text-slate-200/90">{t('signup.firstNameLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="lastName" render={({field}) => <FormItem><FormLabel className="text-slate-200/90">{t('signup.lastNameLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />
                      </div>
                    ) : null}

                    {currentStep === 'academic' && role === 'student' ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField control={form.control} name="studentId" render={({field}) => <FormItem><FormLabel className="text-slate-200/90">{t('signup.studentIdLabel')}</FormLabel><FormControl><Input {...field} inputMode="numeric" maxLength={9} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="faculty" render={({field}) => <FormItem><FormLabel className="text-slate-200/90">{t('signup.facultyLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="major" render={({field}) => <FormItem><FormLabel className="text-slate-200/90">{t('signup.majorLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="degreeLevel" render={({field}) => <FormItem><FormLabel className="text-slate-200/90">{t('signup.degreeLevelLabel')}</FormLabel><FormControl><select {...field} className={selectClassName}><option value="">{t('signup.selectOption')}</option>{degreeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="entryYear" render={({field}) => <FormItem><FormLabel className="text-slate-200/90">{t('signup.entryYearLabel')}</FormLabel><FormControl><Input {...field} value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)} type="number" inputMode="numeric" className={inputClassName} /></FormControl><FormMessage /></FormItem>} />
                      </div>
                    ) : null}

                    {currentStep === 'academic' && (role === 'professor' || role === 'staff') ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField control={form.control} name="personnelId" render={({field}) => <FormItem><FormLabel className="text-slate-200/90">{t('signup.personnelIdLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="faculty" render={({field}) => <FormItem><FormLabel className="text-slate-200/90">{t('signup.facultyLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="department" render={({field}) => <FormItem><FormLabel className="text-slate-200/90">{t('signup.departmentLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />
                        {role === 'professor'
                          ? <FormField control={form.control} name="academicRank" render={({field}) => <FormItem><FormLabel className="text-slate-200/90">{t('signup.academicRankLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />
                          : <FormField control={form.control} name="jobTitle" render={({field}) => <FormItem><FormLabel className="text-slate-200/90">{t('signup.jobTitleLabel')}</FormLabel><FormControl><Input {...field} className={inputClassName} /></FormControl><FormMessage /></FormItem>} />}
                      </div>
                    ) : null}

                    {currentStep === 'password' ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="password"
                          render={({field}) => (
                            <FormItem>
                              <FormLabel className="text-slate-200/90">{t('signup.passwordLabel')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input {...field} type={showPassword ? 'text' : 'password'} autoComplete="new-password" className={`${inputClassName} pe-11`} />
                                  <button
                                    type="button"
                                    className={passwordToggleClassName}
                                    onClick={() => setShowPassword((previous) => !previous)}
                                    aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
                                    title={showPassword ? t('common.hidePassword') : t('common.showPassword')}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="confirmPassword"
                          render={({field}) => (
                            <FormItem>
                              <FormLabel className="text-slate-200/90">{t('signup.confirmPasswordLabel')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input {...field} type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" className={`${inputClassName} pe-11`} />
                                  <button
                                    type="button"
                                    className={passwordToggleClassName}
                                    onClick={() => setShowConfirmPassword((previous) => !previous)}
                                    aria-label={showConfirmPassword ? t('common.hidePassword') : t('common.showPassword')}
                                    title={showConfirmPassword ? t('common.hidePassword') : t('common.showPassword')}
                                  >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ) : null}

                    {/* Live "what is done / what is left" list for the current step. */}
                    <ValidationChecklist
                      title={checklistTitle}
                      counterLabel={t('passwordRules.counter', {met: checklistMetCount, total: checklistRules.length})}
                      rules={checklistRules}
                    />
                  </motion.div>
                </AnimatePresence>
              </section>

              {registerError ? (
                <p className="rounded-2xl border border-danger-border bg-danger-surface px-4 py-3 text-sm font-medium text-danger-text shadow-sm">{registerError}</p>
              ) : null}
            </div>

            {/* Footer: back is a quiet outlined control, primary action stays dominant. */}
            <footer className="shrink-0 border-t border-white/10 bg-slate-950/90 px-6 py-4 sm:px-7 sm:py-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goBack}
                  disabled={busy || stepIndex === 0}
                  className="group h-11 w-full justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-slate-200 transition-all hover:border-white/25 hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-field-focus disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-transparent disabled:text-slate-500 disabled:opacity-100 sm:w-auto"
                >
                  <BackIcon
                    className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${locale === 'fa' ? 'group-hover:translate-x-0.5' : 'group-hover:-translate-x-0.5'} group-disabled:translate-x-0`}
                    aria-hidden="true"
                  />
                  {t('signup.back')}
                </Button>

                {isLastStep ? (
                  <Button type="submit" className="h-11 flex-1 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.99]" disabled={busy || form.formState.isSubmitting}>
                    {busy || form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {busy || form.formState.isSubmitting ? t('signup.completingRegistration') : t('signup.complete')}
                  </Button>
                ) : (
                  <Button type="button" className="h-11 flex-1 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.99]" onClick={goNext} disabled={busy}>
                    {t('signup.next')}
                  </Button>
                )}
              </div>
            </footer>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
