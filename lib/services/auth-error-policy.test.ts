import {describe, expect, it} from 'vitest';
import {
  formatAuthRateLimitMessage,
  getResetAntiEnumerationMessage,
  isAuthRateLimitCode
} from '@/lib/services/auth-error-policy';

describe('auth error policy', () => {
  it('recognizes both OTP-specific and generic rate-limit codes', () => {
    expect(isAuthRateLimitCode('otp_rate_limited')).toBe(true);
    expect(isAuthRateLimitCode('RATE_LIMITED')).toBe(true);
    expect(isAuthRateLimitCode('invalid_otp')).toBe(false);
  });

  it('uses retry metadata when available and a generic message when it is null', () => {
    expect(
      formatAuthRateLimitMessage('en', 'otp_rate_limited', 12)
    ).toContain('12');
    expect(
      formatAuthRateLimitMessage('en', 'rate_limited', null)
    ).toBe('Too many requests. Please try again later.');
  });

  it('keeps password-reset success wording anti-enumeration safe', () => {
    expect(getResetAntiEnumerationMessage('en')).toBe(
      'If this email is eligible, a password-reset code has been sent.'
    );
    expect(getResetAntiEnumerationMessage('fa')).toContain('اگر این ایمیل');
  });
});
