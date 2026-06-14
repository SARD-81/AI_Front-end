'use client';

import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import {
  isAbortError,
  loginUser,
  ServiceError
} from '@/lib/services/auth-service';
import {
  createLoginSchema,
  type AuthSchemaTranslator,
  type LoginFormValues,
} from '@/lib/validation/auth-schemas';

const authInputClassName =
  'h-12 rounded-2xl border-white/10 bg-white/[0.08] text-white shadow-inner shadow-black/15 outline-none placeholder:text-slate-400/75 focus-visible:ring-primary/60 focus-visible:ring-offset-0';

type LoginFormProps = {
  onSuccess: () => void;
  busy?: boolean;
  setBusy: (busy: boolean) => void;
  abortRef: React.MutableRefObject<AbortController | null>;
  initialIdentifier?: string;
};

export function LoginForm({
  onSuccess,
  busy = false,
  setBusy,
  abortRef,
  initialIdentifier
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const t = useTranslations('auth');
  const schemaT: AuthSchemaTranslator = (key) => t(`validation.${key}`);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(createLoginSchema(schemaT)),
    defaultValues: {
      identifier: initialIdentifier ?? '',
      password: ''
    }
  });

  useEffect(() => {
    if (initialIdentifier !== undefined) {
      form.setValue('identifier', initialIdentifier, {
        shouldDirty: false,
        shouldTouch: false
      });
    }
  }, [form, initialIdentifier]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setFormError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await loginUser(values, { signal: controller.signal });
      toast.success(t('login.success'));
      onSuccess();
    } catch (error) {
      if (isAbortError(error)) return;
      const message =
        error instanceof ServiceError
          ? error.message
          : t('login.errorFallback');
      setFormError(message);
      toast.error(message);
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-200/90">{t('login.identifierLabel')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('login.identifierPlaceholder')}
                  dir="ltr"
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
                    className={`${authInputClassName} pl-11`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-3 inline-flex items-center rounded-xl px-1 text-slate-300/75 transition hover:text-white"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
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
          <p className="rounded-2xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">{formError}</p>
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
      </form>
    </Form>
  );
}
