import {
  formatRateLimitMessage,
  isRateLimitCode,
  normalizeErrorCode
} from '@/lib/api/rate-limit';

export const normalizeAuthErrorCode = normalizeErrorCode;
export const isAuthRateLimitCode = isRateLimitCode;
export const formatAuthRateLimitMessage = formatRateLimitMessage;

export function getResetAntiEnumerationMessage(locale: string) {
  return locale.toLowerCase().startsWith('fa')
    ? 'اگر این ایمیل واجد شرایط باشد، کد بازیابی برای آن ارسال شده است.'
    : 'If this email is eligible, a password-reset code has been sent.';
}

export function getResetOtpInstruction(locale: string) {
  return locale.toLowerCase().startsWith('fa')
    ? 'اگر این ایمیل واجد شرایط باشد، کد ارسال‌شده را برای این نشانی وارد کنید:'
    : 'If this email is eligible, enter the code sent for:';
}
