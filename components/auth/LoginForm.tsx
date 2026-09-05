'use client';

import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
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
import { ValidationChecklist, type ChecklistRule } from '@/components/auth/ValidationChecklist';
import {
  evaluatePasswordRules,
  passwordsMatch,
  PASSWORD_RULE_IDS
} from '@/lib/validation/password-rules';
import {
  isAbortError,
  loginUser,
  ServiceError,
  setInitialPassword
} from '@/lib/services/auth-service';
import {
  formatAuthRateLimitMessage,
  isAuthRateLimitCode
} from '@/lib/services/auth-error-policy';
import type { LoginResultDTO } from '@/lib/types/auth';
import {
  createLoginSchema,
  createPasswordResetCompleteSchema,
  type AuthSchemaTranslator,
  type LoginFormValues,
} from '@/lib/validation/auth-schemas';

type SetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

const authInputClassName =
  'h-12 rounded-2xl border-field-border bg-field/90 text-field-foreground shadow-inner shadow-black/15 outline-none placeholder:text-field-placeholder focus-visible:ring-field-focus focus-visible:ring-offset-0 dark:bg-field/70';

type LoginFormProps = {
  onSuccess: (result: LoginResultDTO) => void;
  busy?: boolean;
  setBusy: (busy: boolean) => void;
  abortRef: React.MutableRefObject<AbortController | null>;
  initialIdentifier?: string;
  onForgotPassword: () => void;
};

function mustChangePassword(result: LoginResultDTO): boolean {
  return (
    result.mustChangePassword === true ||
    result.user.mustChangePassword === true
  );
}

function isLocked(result: LoginResultDTO): boolean {
  return result.isLocked === true || result.user.isLocked === true;
}

export function LoginForm({
  onSuccess,
  busy = false,
  setBusy,
  abortRef,
  initialIdentifier,
  onForgotPassword
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingPasswordChange, setPendingPasswordChange] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const inFlightRef = useRef(false);
  const locale = useLocale();
  const t = useTranslations('auth');
  const appT = useTranslations('app');
  const schemaT: AuthSchemaTranslator = (key) => t(`validation.${key}`);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(createLoginSchema(schemaT)),
    defaultValues: {
      email: initialIdentifier ?? '',
      password: ''
    }
  });

  const setPasswordForm = useForm<SetPasswordFormValues>({
    resolver: zodResolver(createPasswordResetCompleteSchema(schemaT)),
    defaultValues: { password: '', confirmPassword: '' }
  });

  useEffect(() => {
    if (initialIdentifier !== undefined) {
      form.setValue('email', initialIdentifier, {
        shouldDirty: false,
        shouldTouch: false
      });
    }
  }, [form, initialIdentifier]);

  const startInitialPasswordFlow = (email: string, temporaryPassword: string) => {
    setPendingPasswordChange({ email, temporaryPassword });
    setPasswordForm.reset({ password: '', confirmPassword: '' });
    setFormError(null);
  };

  const showRateLimitError = (error: unknown) => {
    if (!(error instanceof ServiceError) || !isAuthRateLimitCode(error.code)) {
      return false;
    }
    const message = formatAuthRateLimitMessage(
      locale,
      error.code,
      error.retryAfter
    );
    setFormError(message);
    toast.error(message);
    return true;
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setFormError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await loginUser(values, { signal: controller.signal });

      if (isLocked(result)) {
        const message = appT('chat.accountLocked');
        setFormError(message);
        toast.error(message);
        return;
      }

      if (mustChangePassword(result)) {
        startInitialPasswordFlow(values.email, values.password);
        return;
      }

      toast.success(t('login.success'));
      onSuccess(result);
    } catch (error) {
      if (isAbortError(error)) return;
      if (
        error instanceof ServiceError &&
        error.code.toLowerCase() === 'password_change_required'
      ) {
        startInitialPasswordFlow(values.email, values.password);
        return;
      }
      if (
        error instanceof ServiceError &&
        error.code.toUpperCase() === 'ACCOUNT_LOCKED'
      ) {
        const message = appT('chat.accountLocked');
        setFormError(message);
        toast.error(message);
        return;
      }
      if (showRateLimitError(error)) return;

      const message = t('login.errorFallback');
      setFormError(message);
      toast.error(message);
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  });

  const onSubmitNewPassword = setPasswordForm.handleSubmit(async (values) => {
    if (!pendingPasswordChange || inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setFormError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await setInitialPassword(
        {
          email: pendingPasswordChange.email,
          temporaryPassword: pendingPasswordChange.temporaryPassword,
          newPassword: values.password,
          newPasswordConfirm: values.confirmPassword
        },
        { signal: controller.signal }
      );

      if (isLocked(result)) {
        const message = appT('chat.accountLocked');
        setFormError(message);
        toast.error(message);
        return;
      }

      if (mustChangePassword(result)) {
        startInitialPasswordFlow(pendingPasswordChange.email, values.password);
        const message = t('setPassword.errorFallback');
        setFormError(message);
        toast.error(message);
        return;
      }

      toast.success(t('setPassword.success'));
      setPendingPasswordChange(null);
      onSuccess(result);
    } catch (error) {
      if (isAbortError(error)) return;
      if (
        error instanceof ServiceError &&
        error.code.toUpperCase() === 'ACCOUNT_LOCKED'
      ) {
        const message = appT('chat.accountLocked');
        setFormError(message);
        toast.error(message);
        return;
      }
      if (showRateLimitError(error)) return;

      const message = t('setPassword.errorFallback');
      setFormError(message);
      toast.error(message);
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  });

  const newPasswordValue = setPasswordForm.watch('password') ?? '';
  const confirmNewPasswordValue = setPasswordForm.watch('confirmPassword') ?? '';
  const newPasswordRuleState = evaluatePasswordRules(newPasswordValue);
  const newPasswordChecklistRules: ChecklistRule[] = [
    ...PASSWORD_RULE_IDS.map((ruleId) => ({
      id: ruleId,
      label: t(`passwordRules.${ruleId}`),
      met: newPasswordRuleState[ruleId]
    })),
    {
      id: 'match',
      label: t('passwordRules.match'),
      met: passwordsMatch(newPasswordValue, confirmNewPasswordValue)
    }
  ];
  const passwordToggleClassName =
    'absolute inset-y-0 end-3 inline-flex items-center rounded-xl px-1 text-field-placeholder transition hover:text-field-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-focus';

  if (pendingPasswordChange) {
    return (
      <Form {...setPasswordForm}>
        <form onSubmit={onSubmitNewPassword} className="space-y-5" noValidate>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm font-bold text-sky-100">
              {t('setPassword.title')}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              {t('setPassword.description')}
            </p>
          </div>

          <FormField
            control={setPasswordForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-200/90">
                  {t('setPassword.newPasswordLabel')}
                </FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`${authInputClassName} pe-12`}
                    />
                  </FormControl>
                  <button
                    type="button"
                    className={passwordToggleClassName}
                    onClick={() => setShowNewPassword((previous) => !previous)}
                    aria-label={
                      showNewPassword ? t('common.hidePassword') : t('common.showPassword')
                    }
                    title={
                      showNewPassword ? t('common.hidePassword') : t('common.showPassword')
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={setPasswordForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-200/90">
                  {t('setPassword.confirmPasswordLabel')}
                </FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`${authInputClassName} pe-12`}
                    />
                  </FormControl>
                  <button
                    type="button"
                    className={passwordToggleClassName}
                    onClick={() => setShowConfirmNewPassword((previous) => !previous)}
                    aria-label={
                      showConfirmNewPassword ? t('common.hidePassword') : t('common.showPassword')
                    }
                    title={
                      showConfirmNewPassword ? t('common.hidePassword') : t('common.showPassword')
                    }
                  >
                    {showConfirmNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <ValidationChecklist
            title={t('passwordRules.title')}
            rules={newPasswordChecklistRules}
          />

          {formError ? (
            <p className="rounded-2xl border border-danger-border bg-danger-surface px-3 py-2 text-sm font-medium text-danger-text shadow-sm">
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            className="h-12 w-full rounded-2xl bg-primary text-sm font-bold shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.99]"
            disabled={busy || setPasswordForm.formState.isSubmitting}
          >
            {busy || setPasswordForm.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {t('setPassword.submit')}
          </Button>

          <button
            type="button"
            className="w-full text-center text-sm font-medium text-sky-100/85 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              setPendingPasswordChange(null);
              setFormError(null);
            }}
            disabled={busy || setPasswordForm.formState.isSubmitting}
          >
            {t('setPassword.back')}
          </button>
        </form>
      </Form>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-200/90">{t('login.emailLabel')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('login.emailPlaceholder')}
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={authInputClassName}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-200/90">{t('login.passwordLabel')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.passwordPlaceholder')}
                    autoComplete="current-password"
                    className={`${authInputClassName} pl-11`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-3 inline-flex items-center rounded-xl px-1 text-field-placeholder transition hover:text-field-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-focus"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? t('login.hidePassword') : t('login.showPassword')
                    }
                    title={
                      showPassword ? t('login.hidePassword') : t('login.showPassword')
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {formError ? (
          <p className="rounded-2xl border border-danger-border bg-danger-surface px-3 py-2 text-sm font-medium text-danger-text shadow-sm">{formError}</p>
        ) : null}

        <Button
          type="submit"
          className="h-12 w-full rounded-2xl bg-primary text-sm font-bold shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-[0.99]"
          disabled={busy || form.formState.isSubmitting}
        >
          {busy || form.formState.isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {t('login.submit')}
        </Button>

        <button
          type="button"
          className="w-full text-center text-sm font-medium text-sky-100/85 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onForgotPassword}
          disabled={busy || form.formState.isSubmitting}
        >
          {t('login.forgotPassword')}
        </button>
      </form>
    </Form>
  );
}
