import {describe, expect, it, vi} from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({headers: vi.fn()}));

import {parseTrustedProxyClientIp} from '@/lib/server/client-ip';

describe('trusted proxy client IP parsing', () => {
  const headersWith = (value: string | null) => ({
    get: (name: string) =>
      name.toLowerCase() === 'x-real-ip' ? value : null
  });

  it('ignores proxy headers when trust is disabled', () => {
    expect(
      parseTrustedProxyClientIp(headersWith('203.0.113.7'), false)
    ).toBeUndefined();
  });

  it('accepts a single valid IP only when trust is explicitly enabled', () => {
    expect(
      parseTrustedProxyClientIp(headersWith('203.0.113.7'), true)
    ).toBe('203.0.113.7');
    expect(
      parseTrustedProxyClientIp(headersWith('2001:db8::7'), true)
    ).toBe('2001:db8::7');
  });

  it('rejects forged chains and malformed X-Real-IP values', () => {
    expect(
      parseTrustedProxyClientIp(
        headersWith('203.0.113.7, 198.51.100.2'),
        true
      )
    ).toBeUndefined();
    expect(
      parseTrustedProxyClientIp(headersWith('not-an-ip'), true)
    ).toBeUndefined();
  });
});
