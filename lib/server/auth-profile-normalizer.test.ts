import {describe, expect, it} from 'vitest';
import {normalizeAuthProfile} from '@/lib/server/auth-profile-normalizer';

describe('normalizeAuthProfile', () => {
  it('keeps a professor as professor when academic_rank is null', () => {
    const result = normalizeAuthProfile({
      identifier: '11229',
      personnel_id: '11229',
      full_name: 'Professor Example',
      role: 'professor',
      department: 'Computer Science',
      job_title: 'Faculty member',
      academic_rank: null,
      is_profile_completed: true,
      must_change_password: false,
      is_locked: false
    });

    expect(result.user.identifier).toBe('11229');
    expect(result.user.role).toBe('professor');
    expect(result.user.academicRank).toBeUndefined();
    expect(result.user.isProfileCompleted).toBe(true);
    expect(result.user.mustChangePassword).toBe(false);
    expect(result.user.isLocked).toBe(false);
  });

  it.each([
    {
      role: 'student' as const,
      profile: {
        identifier: '401234567',
        student_id: '401234567',
        major: 'Computer Engineering'
      }
    },
    {
      role: 'staff' as const,
      profile: {
        identifier: '77881',
        personnel_id: '77881',
        department: 'IT',
        academic_rank: 'Unexpected legacy value'
      }
    }
  ])('keeps the canonical $role role regardless of profile fields', ({role, profile}) => {
    const result = normalizeAuthProfile({
      ...profile,
      role,
      is_profile_completed: true,
      must_change_password: false,
      is_locked: false
    });

    expect(result.user.role).toBe(role);
    expect(result.user.identifier).toBe(profile.identifier);
  });

  it('normalizes canonical auth state from nested backend wrappers', () => {
    const result = normalizeAuthProfile({
      user: {
        identifier: '11229',
        role: 'PROFESSOR',
        is_profile_completed: true,
        must_change_password: true,
        is_locked: false
      }
    });

    expect(result).toMatchObject({
      user: {
        identifier: '11229',
        role: 'professor',
        isProfileCompleted: true,
        mustChangePassword: true,
        isLocked: false
      },
      isProfileCompleted: true,
      mustChangePassword: true,
      isLocked: false
    });
  });
});
