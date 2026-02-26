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
    <div className={cn('flex items-center justify-center gap-2', className)} dir="ltr">
      {digits.map((digit, index) => (
        <Input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          className="h-11 w-11 text-center text-base"
          onChange={(event) => setDigit(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !digits[index] && index > 0) {
              refs.current[index - 1]?.focus();
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
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
