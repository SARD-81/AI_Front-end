/**
 * Shared, UI-facing password rule evaluation.
 *
 * The zod schema in `auth-schemas.ts` stays the single source of truth for
 * *blocking* validation. This helper mirrors the same rules so the UI can show
 * live, per-keystroke progress without waiting for a submit attempt.
 */

export type PasswordRuleId = 'min' | 'uppercase' | 'lowercase' | 'number' | 'symbol';

export const PASSWORD_RULE_IDS: PasswordRuleId[] = [
  'min',
  'uppercase',
  'lowercase',
  'number',
  'symbol'
];

export const PASSWORD_MIN_LENGTH = 8;

export function evaluatePasswordRules(value: string): Record<PasswordRuleId, boolean> {
  const password = value ?? '';

  return {
    min: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password)
  };
}

export function isPasswordStrong(value: string): boolean {
  return Object.values(evaluatePasswordRules(value)).every(Boolean);
}

export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return Boolean(password) && password === confirmPassword;
}
