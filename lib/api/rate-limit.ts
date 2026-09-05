export function normalizeErrorCode(code?: string | null) {
  return code?.trim().toLowerCase() ?? '';
}

export function isRateLimitCode(code?: string | null) {
  const normalized = normalizeErrorCode(code);
  return normalized === 'otp_rate_limited' || normalized === 'rate_limited';
}

export function formatRateLimitMessage(
  locale: string,
  code?: string | null,
  retryAfter?: number | null
) {
  const isFa = locale.toLowerCase().startsWith('fa');
  const isOtp = normalizeErrorCode(code) === 'otp_rate_limited';
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
