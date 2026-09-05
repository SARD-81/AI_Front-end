export function normalizeAuthErrorCode(code?: string | null) {
  return code?.trim().toLowerCase() ?? '';
}

export function isAuthRateLimitCode(code?: string | null) {
  const normalized = normalizeAuthErrorCode(code);
  return normalized === 'otp_rate_limited' || normalized === 'rate_limited';
}

export function formatAuthRateLimitMessage(
  locale: string,
  code?: string | null,
  retryAfter?: number | null
) {
  const isFa = locale.toLowerCase().startsWith('fa');
  const isOtp = normalizeAuthErrorCode(code) === 'otp_rate_limited';
  const seconds =
    typeof retryAfter === 'number' && Number.isFinite(retryAfter)
      ? Math.max(0, Math.ceil(retryAfter))
      : null;

  if (seconds !== null) {
    const formatted = new Intl.NumberFormat(isFa ? 'fa-IR' : 'en-US').format(seconds);
    if (isFa) {
      return isOtp
        ? `درخواست کد تأیید بیش از حد مجاز بوده است. لطفاً ${formatted} ثانیه دیگر دوباره تلاش کنید.`
        : `تعداد درخواست‌ها بیش از حد مجاز است. لطفاً ${formatted} ثانیه دیگر دوباره تلاش کنید.`;
    }
    return isOtp
      ? `Too many verification-code requests. Please try again in ${formatted} seconds.`
      : `Too many requests. Please try again in ${formatted} seconds.`;
  }

  if (isFa) {
    return isOtp
      ? 'درخواست کد تأیید بیش از حد مجاز بوده است. لطفاً کمی بعد دوباره تلاش کنید.'
      : 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.';
  }

  return isOtp
    ? 'Too many verification-code requests. Please try again later.'
    : 'Too many requests. Please try again later.';
}

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
