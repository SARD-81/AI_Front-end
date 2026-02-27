const domains = (process.env.UNIVERSITY_EMAIL_DOMAINS ?? 'sbu.ac.ir,student.sbu.ac.ir,mail.sbu.ac.ir')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const studentTemplate = process.env.STUDENT_ID_EMAIL_TEMPLATE?.trim() || '{id}@student.sbu.ac.ir';

export function isLikelyEmail(identifier: string): boolean {
  return identifier.includes('@');
}

export function studentIdToEmail(studentId: string): string {
  return studentTemplate.replace('{id}', studentId.trim());
}

export function isValidUniversityEmail(email: string): boolean {
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) {
    return false;
  }
  return domains.includes(parts[1]);
}
