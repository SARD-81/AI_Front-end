'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { changeAccountPassword, ServiceError } from '@/lib/services/auth-service';
import { closeActiveChatSockets } from '@/lib/services/chat-service';
import { formatDigitsForLocale } from '@/lib/utils/digits';

type FieldKey = 'current' | 'next' | 'confirm';

export function PasswordChangeDialog({
  open,
  onOpenChange,
  locale
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
}) {
  const t = useTranslations('auth.passwordChange');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!waitUntil || waitUntil <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [waitUntil]);

  const secondsLeft =
    waitUntil && waitUntil > now ? Math.ceil((waitUntil - now) / 1000) : 0;

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShown(false);
    setFields({});
    setFormError(null);
    setWaitUntil(null);
  };

  const leaveForSignIn = (message: string) => {
    closeActiveChatSockets();
    queryClient.clear();
    toast.success(message);
    onOpenChange(false);
    resetForm();
    router.replace(`/${locale}/auth?mode=login`);
  };

  const submit = async () => {
    const nextFields: Partial<Record<FieldKey, string>> = {};
    if (newPassword !== confirmPassword) nextFields.confirm = t('mismatch');
    setFields(nextFields);
    setFormError(null);
    if (Object.keys(nextFields).length > 0 || secondsLeft > 0) return;

    setBusy(true);
    try {
      const result = await changeAccountPassword({
        currentPassword,
        newPassword
      });
      if (result.status === 'password_changed') {
        leaveForSignIn(t('success'));
      } else {
        setFormError(t('generic'));
      }
    } catch (error) {
      const service = error instanceof ServiceError ? error : null;
      const code = service?.code ?? '';
      const detailLines = service?.details?.filter(Boolean) ?? [];
      const detailText = detailLines.join('\n') || service?.message;

      if (service?.status === 401 || code === 'SESSION_EXPIRED') {
        closeActiveChatSockets();
        queryClient.clear();
        toast.error(t('signInAgain'));
        onOpenChange(false);
        resetForm();
        router.replace(`/${locale}/auth?mode=login`);
        return;
      }

      if (service?.status === 403 || code === 'account_unavailable') {
        setFormError(detailText || t('unavailable'));
        return;
      }

      if (service && (service.status === 429 || code === 'rate_limited')) {
        if (typeof service.retryAfter === 'number' && service.retryAfter > 0) {
          setWaitUntil(Date.now() + service.retryAfter * 1000);
          setFormError(
            t('rateLimitedWait', {
              seconds: formatDigitsForLocale(Math.ceil(service.retryAfter), locale)
            })
          );
        } else {
          setFormError(t('rateLimited'));
        }
        return;
      }

      if (code === 'invalid_current_password') {
        setFields({ current: detailText || t('currentInvalid') });
        return;
      }

      if (code === 'invalid_password') {
        setFields({ next: detailText || t('generic') });
        return;
      }

      if (code === 'password_unchanged') {
        setFields({ next: detailText || t('unchanged') });
        return;
      }

      setFormError(detailText || t('generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) {
          resetForm();
          onOpenChange(false);
        }
      }}
    >
      <DialogContent
        className="max-w-md"
        dir={locale === 'fa' ? 'rtl' : 'ltr'}
      >
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogDescription>{t('description')}</DialogDescription>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <PasswordRow
            id="current-password"
            label={t('current')}
            value={currentPassword}
            shown={shown}
            autoComplete="current-password"
            error={fields.current}
            onChange={(value) => {
              setCurrentPassword(value);
              setFields((current) => ({ ...current, current: undefined }));
            }}
          />
          <PasswordRow
            id="new-password"
            label={t('next')}
            value={newPassword}
            shown={shown}
            autoComplete="new-password"
            error={fields.next}
            onChange={(value) => {
              setNewPassword(value);
              setFields((current) => ({ ...current, next: undefined }));
            }}
          />
          <PasswordRow
            id="confirm-password"
            label={t('confirm')}
            value={confirmPassword}
            shown={shown}
            autoComplete="new-password"
            error={fields.confirm}
            onChange={(value) => {
              setConfirmPassword(value);
              setFields((current) => ({ ...current, confirm: undefined }));
            }}
          />
          <button
            type="button"
            className="text-sm font-medium text-primary"
            onClick={() => setShown((value) => !value)}
          >
            {shown ? t('hide') : t('show')}
          </button>
          {formError ? (
            <p role="alert" className="whitespace-pre-line text-sm text-danger-text">
              {secondsLeft > 0 ? t('rateLimitedWait', { seconds: formatDigitsForLocale(secondsLeft, locale) }) : formError}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy || secondsLeft > 0 || !currentPassword || !newPassword || !confirmPassword}>
            {busy ? t('submitting') : t('submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordRow({
  id,
  label,
  value,
  shown,
  autoComplete,
  error,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  shown: boolean;
  autoComplete: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="whitespace-pre-line text-sm text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
