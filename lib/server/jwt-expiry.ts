const ACCESS_FALLBACK_SECONDS = 60 * 60;
const REFRESH_FALLBACK_SECONDS = 60 * 60 * 12;
const EXPIRY_SKEW_SECONDS = 30;

export function readJwtExp(token: string): number | null {
  const segment = token.split('.')[1];
  if (!segment) return null;

  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as {
      exp?: unknown;
    };
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
      ? payload.exp
      : null;
  } catch {
    return null;
  }
}

export function cookieMaxAgeFromToken(
  token: string,
  fallbackSeconds: number,
  nowMs = Date.now()
): number {
  const exp = readJwtExp(token);
  if (exp == null) return fallbackSeconds;

  const remaining = Math.floor(exp - nowMs / 1000) - EXPIRY_SKEW_SECONDS;
  if (!Number.isFinite(remaining) || remaining <= 0) return 0;
  return remaining;
}

export const AUTH_COOKIE_FALLBACK = {
  access: ACCESS_FALLBACK_SECONDS,
  refresh: REFRESH_FALLBACK_SECONDS
};
