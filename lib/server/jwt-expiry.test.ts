import {describe, expect, it} from 'vitest';
import {cookieMaxAgeFromToken, readJwtExp} from '@/lib/server/jwt-expiry';

function jwt(exp: number) {
  const payload = Buffer.from(JSON.stringify({exp})).toString('base64url');
  return `header.${payload}.sig`;
}

describe('jwt expiry cookie lifetime', () => {
  it('does not treat a non-jwt as a contractual 60 minute token', () => {
    expect(readJwtExp('access-token')).toBeNull();
    expect(cookieMaxAgeFromToken('access-token', 3600)).toBe(3600);
  });

  it('sets the cookie from exp minus skew instead of a fixed hour', () => {
    const now = 1_700_000_000_000;
    const exp = 1_700_000_000 + 15 * 60;
    expect(cookieMaxAgeFromToken(jwt(exp), 3600, now)).toBe(15 * 60 - 30);
  });

  it('expires an already-due token immediately', () => {
    const now = 1_700_000_000_000;
    expect(cookieMaxAgeFromToken(jwt(1_700_000_000), 3600, now)).toBe(0);
  });
});
