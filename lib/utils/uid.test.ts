import {describe, expect, it} from 'vitest';
import {uid, uuid} from '@/lib/utils/uid';

const UUID_PATTERN =
  /^[0-9a-f]+-[0-9a-f]+-[0-9a-f]+-[0-9a-f]+-[0-9a-f]+$/i;

describe('uuid', () => {
  it('returns a value in UUID format', () => {
    expect(uuid()).toMatch(UUID_PATTERN);
  });

  it('returns unique values', () => {
    const values = new Set(Array.from(Array(100), () => uuid()));
    expect(values.size).toBe(100);
  });
});

describe('uid', () => {
  it('prepends the given prefix', () => {
    expect(uid('msg').startsWith('msg-')).toBe(true);
  });

  it('returns a non-empty id without a prefix', () => {
    expect(uid().length).toBeGreaterThan(0);
  });
});
