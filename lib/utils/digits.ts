const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toLatinDigits(value: string | number): string {
  return String(value)
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)));
}

export function formatDigitsForLocale(
  value: string | number,
  locale: string
): string {
  const text = String(value);
  return locale === 'en' ? toLatinDigits(text) : text;
}
