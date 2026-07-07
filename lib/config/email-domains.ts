// Central definition of the university email domains used for signup role
// detection. Override via NEXT_PUBLIC_* env vars so other deployments do not
// need code changes.
export const STUDENT_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN?.trim() || 'mail.sbu.ac.ir';

export const EMPLOYEE_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_EMPLOYEE_EMAIL_DOMAIN?.trim() || 'sbu.ac.ir';

export function isStudentEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${STUDENT_EMAIL_DOMAIN}`);
}

export function isEmployeeEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${EMPLOYEE_EMAIL_DOMAIN}`);
}
