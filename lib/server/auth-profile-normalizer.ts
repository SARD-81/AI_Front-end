import type { AuthRoleDTO } from '@/lib/types/auth';

type BackendProfile = Record<string, unknown>;

const AUTH_ROLES = ['student', 'professor', 'staff', 'admin'] as const;

function isRecord(value: unknown): value is BackendProfile {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function profileSources(profile: BackendProfile): BackendProfile[] {
  const user = profile.user;

  return [
    profile,
    isRecord(user) ? user : undefined,
    isRecord(profile.profile) ? profile.profile : undefined,
    isRecord(profile.data) ? profile.data : undefined,
    isRecord(user) && isRecord(user.profile) ? user.profile : undefined
  ].filter(isRecord);
}

function pickString(
  sources: BackendProfile[],
  ...keys: string[]
): string | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
  }

  return undefined;
}

function pickBoolean(
  sources: BackendProfile[],
  ...keys: string[]
): boolean | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'boolean') {
        return value;
      }
    }
  }

  return undefined;
}

function pickCanonicalRole(
  sources: BackendProfile[]
): AuthRoleDTO | undefined {
  for (const source of sources) {
    const value = source.role;
    if (typeof value !== 'string') continue;

    const normalized = value.trim().toLowerCase();
    if ((AUTH_ROLES as readonly string[]).includes(normalized)) {
      return normalized as AuthRoleDTO;
    }
  }

  return undefined;
}

export function normalizeAuthProfile(profile: BackendProfile) {
  const sources = profileSources(profile);
  const isProfileCompleted = pickBoolean(
    sources,
    'is_profile_completed',
    'isProfileCompleted'
  );
  const mustChangePassword = pickBoolean(
    sources,
    'must_change_password',
    'mustChangePassword'
  );
  const isLocked = pickBoolean(sources, 'is_locked', 'isLocked');

  return {
    user: {
      identifier: pickString(sources, 'identifier'),
      studentId: pickString(sources, 'student_id', 'studentId'),
      personnelId: pickString(sources, 'personnel_id', 'personnelId'),
      fullName: pickString(sources, 'full_name', 'fullName') ?? '',
      firstName: pickString(sources, 'first_name', 'firstName') ?? '',
      lastName: pickString(sources, 'last_name', 'lastName') ?? '',
      email: pickString(sources, 'email') ?? '',
      faculty: pickString(sources, 'faculty') ?? '',
      major: pickString(sources, 'major') ?? '',
      degreeLevel: pickString(sources, 'degree_level', 'degreeLevel') ?? '',
      department: pickString(sources, 'department'),
      academicRank: pickString(sources, 'academic_rank', 'academicRank'),
      jobTitle: pickString(sources, 'job_title', 'jobTitle'),
      role: pickCanonicalRole(sources),
      isProfileCompleted,
      mustChangePassword,
      isLocked
    },
    isProfileCompleted,
    mustChangePassword,
    isLocked
  };
}

export type { BackendProfile };
