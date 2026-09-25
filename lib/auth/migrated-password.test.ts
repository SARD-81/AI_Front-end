import { describe, expect, it } from 'vitest';
import { parseMigratedPasswordResponse } from '@/lib/auth/migrated-password';

describe('migrated password contract', () => {
  it('accepts password_updated with exactly one destination and no JWT', () => {
    expect(
      parseMigratedPasswordResponse({
        status: 'password_updated',
        phone_login_required: true
      })
    ).toEqual({
      status: 'password_updated',
      phone_login_required: true,
      phone_setup_required: false
    });
    expect(
      parseMigratedPasswordResponse({
        status: 'password_updated',
        phone_setup_required: true
      })
    ).toEqual({
      status: 'password_updated',
      phone_login_required: false,
      phone_setup_required: true
    });
  });

  it.each([
    {},
    { status: 'password_updated' },
    {
      status: 'password_updated',
      phone_login_required: true,
      phone_setup_required: true
    },
    { status: 'ok', phone_login_required: true },
    {
      status: 'password_updated',
      phone_login_required: true,
      access: 'jwt'
    },
    {
      status: 'password_updated',
      phone_setup_required: true,
      refresh: 'jwt'
    }
  ])('rejects an incomplete or contradictory body %#', (body) => {
    expect(parseMigratedPasswordResponse(body)).toBeNull();
  });
});
