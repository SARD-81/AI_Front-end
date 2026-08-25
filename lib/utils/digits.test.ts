import { describe, expect, it } from 'vitest';
import { formatDigitsForLocale, toLatinDigits } from './digits';

describe('digit normalization', () => {
  it('converts Persian and Arabic-Indic digits to Latin digits', () => {
    expect(toLatinDigits('شماره ۱۲۳٤٥')).toBe('شماره 12345');
  });

  it('normalizes identifiers when the UI locale is English', () => {
    expect(formatDigitsForLocale('۴۰۱۲۳۴۵۶۷', 'en')).toBe('401234567');
  });

  it('does not alter digits when the UI locale is Persian', () => {
    expect(formatDigitsForLocale('۴۰۱۲۳۴۵۶۷', 'fa')).toBe('۴۰۱۲۳۴۵۶۷');
  });
});
