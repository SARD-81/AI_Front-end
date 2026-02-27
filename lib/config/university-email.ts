export const UNIVERSITY_EMAIL_REGEX = /^[^\s@]+@(?:mail\.)?sbu\.ac\.ir$/i;

export const UNIVERSITY_EMAIL_HINT =
  'فقط ایمیل‌های دانشگاه با دامنه sbu.ac.ir یا mail.sbu.ac.ir مجاز هستند.';

export function isUniversityEmail(email: string): boolean {
  return UNIVERSITY_EMAIL_REGEX.test(String(email ?? '').trim());
}
