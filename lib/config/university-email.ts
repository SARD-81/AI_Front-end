function domainRoot() {
  return String.fromCharCode(115, 98, 117, 46, 97, 99, 46, 105, 114);
}

export const UNIVERSITY_EMAIL_REGEX = /^\S+@\S+$/i;

export const UNIVERSITY_EMAIL_HINT = 'ایمیل دانشگاهی معتبر وارد کنید.';

export function isUniversityEmail(email: string): boolean {
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!UNIVERSITY_EMAIL_REGEX.test(normalized)) return false;

  const domain = normalized.split('@')[1];
  const root = domainRoot();
  return domain === root || domain === `mail.${root}` || domain === `student.${root}`;
}
