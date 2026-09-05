import {describe, expect, it, vi} from 'vitest';

vi.mock('server-only', () => ({}));

import {ApiError} from '@/lib/server/backend-types';
import {normalizeBackendAuthContract} from '@/lib/server/auth-contract';

describe('backend auth contract normalization', () => {
  it('accepts top-level camelCase flags and identity fields', () => {
    const normalized = normalizeBackendAuthContract({
      access: 'access-token',
      refresh: 'refresh-token',
      identifier: '11229',
      personnelId: '11229',
      fullName: 'Professor Example',
      role: 'professor',
      isProfileCompleted: true,
      mustChangePassword: false,
      isLocked: false
    });

    expect(normalized).toEqual({
      access: 'access-token',
      refresh: 'refresh-token',
      result: {
        user: {
          identifier: '11229',
          studentId: undefined,
          personnelId: '11229',
          fullName: 'Professor Example',
          role: 'professor',
          isProfileCompleted: true,
          mustChangePassword: false,
          isLocked: false
        },
        isProfileCompleted: true,
        mustChangePassword: false,
        isLocked: false
      }
    });
  });

  it('fails fast when the backend omits a usable access token', () => {
    try {
      normalizeBackendAuthContract({
        refresh: 'refresh-token',
        must_change_password: false,
        is_locked: false
      });
      throw new Error('Expected contract normalization to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 502,
        code: 'AUTH_CONTRACT_INVALID'
      });
    }
  });
});
