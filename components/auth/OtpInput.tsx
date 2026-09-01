'use client';

import {useRef} from 'react';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function OtpInput({value, onChange, disabled, className}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({length: 6}, (_, idx) => value[idx] ?? '');

  const setDigit = (index: number, next: string) => {
    const clean = next.replace(/\D/g, '').slice(-1);
    const cloned = [...digits];
    cloned[index] = clean;
    onChange(cloned.join(''));

    if (clean && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <div
      className={cn(
        'mx-auto grid w-full max-w-[20rem] grid-cols-6 gap-1.5 sm:flex sm:w-auto sm:max-w-none sm:items-center sm:justify-center sm:gap-2',
        className
      )}
      dir="ltr"
    >
      {digits.map((digit, index) => (
        <Input
          key={index}
          aria-label={`${index + 1}`}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          className="h-10 min-w-0 w-full px-0 text-center text-base sm:h-11 sm:w-11 sm:flex-none"
          onChange={(event) => setDigit(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !digits[index] && index > 0) {
              refs.current[index - 1]?.focus();
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData
              .getData('text')
              .replace(/\D/g, '')
              .slice(0, 6);
            if (!pasted) {
              return;
            }
            event.preventDefault();
            onChange(pasted);
            refs.current[Math.min(pasted.length, 6) - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}
