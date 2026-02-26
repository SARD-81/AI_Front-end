'use client';

import {useEffect, useMemo, useRef} from 'react';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  idPrefix?: string;
  autoFocus?: boolean;
};

const OTP_LENGTH = 6;

export function OtpInput({
  value,
  onChange,
  disabled = false,
  error,
  idPrefix = 'otp',
  autoFocus = false
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = useMemo(() => {
    const normalized = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    return Array.from({length: OTP_LENGTH}, (_, index) => normalized[index] ?? '');
  }, [value]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  const updateDigits = (nextDigits: string[]) => {
    onChange(nextDigits.join(''));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-row-reverse justify-between gap-2" dir="ltr">
        {digits.map((digit, index) => (
          <Input
            key={`${idPrefix}-${index}`}
            id={`${idPrefix}-${index}`}
            ref={el => {
              inputRefs.current[index] = el;
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            className={cn(
              'h-12 w-12 text-center text-lg tracking-widest',
              error ? 'border-destructive focus-visible:ring-destructive' : ''
            )}
            value={digit}
            maxLength={1}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${idPrefix}-error` : undefined}
            onChange={event => {
              const nextValue = event.target.value.replace(/\D/g, '');
              if (!nextValue) {
                const nextDigits = [...digits];
                nextDigits[index] = '';
                updateDigits(nextDigits);
                return;
              }

              const nextDigits = [...digits];
              nextDigits[index] = nextValue[0];
              updateDigits(nextDigits);

              if (index < OTP_LENGTH - 1) {
                inputRefs.current[index + 1]?.focus();
              }
            }}
            onKeyDown={event => {
              if (event.key === 'Backspace' && !digits[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
              }

              if (event.key === 'ArrowLeft' && index > 0) {
                event.preventDefault();
                inputRefs.current[index - 1]?.focus();
              }

              if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
                event.preventDefault();
                inputRefs.current[index + 1]?.focus();
              }
            }}
            onPaste={event => {
              event.preventDefault();
              const pasteData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
              if (!pasteData) {
                return;
              }

              const nextDigits = Array.from({length: OTP_LENGTH}, (_, i) => pasteData[i] ?? '');
              updateDigits(nextDigits);
              const focusIndex = Math.min(pasteData.length, OTP_LENGTH - 1);
              inputRefs.current[focusIndex]?.focus();
            }}
          />
        ))}
      </div>
      {error ? (
        <p id={`${idPrefix}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
