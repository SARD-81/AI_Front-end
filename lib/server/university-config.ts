import {isUniversityEmail} from '@/lib/config/university-email';

const defaultStudentTemplate = '{id}@sbu.ac.ir';
const configuredStudentTemplate = process.env.STUDENT_ID_EMAIL_TEMPLATE?.trim();

export function isLikelyEmail(identifier: string): boolean {
  return identifier.includes('@');
}

export function isValidUniversityEmail(email: string): boolean {
  return isUniversityEmail(email);
}

export function studentIdToEmail(studentId: string): string {
  const normalizedId = studentId.trim();

  if (configuredStudentTemplate) {
    const configuredEmail = configuredStudentTemplate.replace('{id}', normalizedId);
    if (isValidUniversityEmail(configuredEmail)) {
      return configuredEmail;
    }
  }

  return defaultStudentTemplate.replace('{id}', normalizedId);
}
