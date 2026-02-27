'use client';

import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
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
  type LoginFormValues,
  loginSchema
} from '@/lib/validation/auth-schemas';

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

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
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
      toast.success('ورود با موفقیت انجام شد.');
      onSuccess();
    } catch (error) {
      if (isAbortError(error)) return;
      const message =
        error instanceof ServiceError
          ? error.message
          : 'خطا در ورود به سامانه.';
      setFormError(message);
      toast.error(message);
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>شماره دانشجویی یا ایمیل دانشگاهی</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="مثال: 401123456 یا user@student.sbu.ac.ir"
                  dir="ltr"
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
              <FormLabel>رمز عبور</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="رمز عبور"
                    className="pl-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-2 inline-flex items-center text-muted-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? 'پنهان‌سازی رمز عبور' : 'نمایش رمز عبور'
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
          <p className="text-sm text-destructive">{formError}</p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={busy || form.formState.isSubmitting}
        >
          {busy || form.formState.isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          ورود به سامانه
        </Button>
      </form>
    </Form>
  );
}
