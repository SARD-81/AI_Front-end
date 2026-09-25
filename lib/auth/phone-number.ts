import {toLatinDigits} from '@/lib/utils/digits';

export function phoneDisplayValue(value: string): string {
  return toLatinDigits(value);
}

export function isAcceptedPhoneInput(value: string): boolean {
  if (!value || /\s/.test(value)) return false;
  const normalized = toLatinDigits(value);
  return /^(?:09\d{9}|\+989\d{9}|989\d{9})$/.test(normalized);
}
