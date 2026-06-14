export const UNIVERSITY_EMAIL_REGEX = /^\S+@\S+$/i;

export const UNIVERSITY_EMAIL_HINT = 'ایمیل دانشگاهی معتبر وارد کنید.';

export function isUniversityEmail(email: string): boolean {
  const normalized = String(email ?? '').trim().toLowerCase();
  return UNIVERSITY_EMAIL_REGEX.test(normalized);
}
