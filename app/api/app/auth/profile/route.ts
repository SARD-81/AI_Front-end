import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { callWithAutoRefresh } from '@/lib/server/with-refresh';
import type { AuthRoleDTO } from '@/lib/types/auth';

type BackendProfile = Record<string, unknown>;

type ProfileBody = {
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  student_id?: string;
  studentId?: string;
};

const AUTH_ROLES = ['student', 'professor', 'staff', 'admin'] as const;

function isRecord(value: unknown): value is BackendProfile {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isAuthRole(value: unknown): value is AuthRoleDTO {
  return typeof value === 'string' && AUTH_ROLES.includes(value as AuthRoleDTO);
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

function pickString(sources: BackendProfile[], ...keys: string[]): string | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string') {
        return value;
      }
    }
  }

  return undefined;
}

function pickRole(sources: BackendProfile[]): AuthRoleDTO | undefined {
  const roleKeys = [
    'role',
    'user_role',
    'userRole',
    'account_type',
    'accountType',
    'user_type',
    'userType'
  ];

  for (const source of sources) {
    for (const key of roleKeys) {
      const value = source[key];
      if (isAuthRole(value)) {
        return value;
      }
    }
  }

  return undefined;
}

function fallbackRole(sources: BackendProfile[]): AuthRoleDTO | undefined {
  const studentId = pickString(sources, 'student_id', 'studentId');
  const email = pickString(sources, 'email')?.trim().toLowerCase();
  const personnelId = pickString(sources, 'personnel_id', 'personnelId');
  const academicRank = pickString(sources, 'academic_rank', 'academicRank');
  const jobTitle = pickString(sources, 'job_title', 'jobTitle');
  const department = pickString(sources, 'department');

  if (studentId || email?.endsWith('@mail.sbu.ac.ir')) {
    return 'student';
  }

  if (personnelId && academicRank) {
    return 'professor';
  }

  if (personnelId && (jobTitle || department)) {
    return 'staff';
  }

  return undefined;
}

function normalizeProfile(profile: BackendProfile) {
  const sources = profileSources(profile);
  const role = pickRole(sources) ?? fallbackRole(sources);

  return {
    user: {
      studentId: pickString(sources, 'student_id', 'studentId') ?? '',
      fullName: pickString(sources, 'full_name', 'fullName') ?? '',
      firstName: pickString(sources, 'first_name', 'firstName') ?? '',
      lastName: pickString(sources, 'last_name', 'lastName') ?? '',
      email: pickString(sources, 'email') ?? '',
      faculty: pickString(sources, 'faculty') ?? '',
      major: pickString(sources, 'major') ?? '',
      degreeLevel: pickString(sources, 'degree_level', 'degreeLevel') ?? '',
      role,
      personnelId: pickString(sources, 'personnel_id', 'personnelId'),
      department: pickString(sources, 'department'),
      academicRank: pickString(sources, 'academic_rank', 'academicRank'),
      jobTitle: pickString(sources, 'job_title', 'jobTitle'),
      isProfileCompleted:
        typeof profile.is_profile_completed === 'boolean'
          ? profile.is_profile_completed
          : typeof profile.isProfileCompleted === 'boolean'
            ? profile.isProfileCompleted
            : undefined
    }
  };
}

function editableProfilePayload(body: ProfileBody) {
  const payload: Record<string, string> = {};
  const fields: Array<[keyof ProfileBody, keyof ProfileBody, string]> = [
    ['first_name', 'firstName', 'first_name'],
    ['last_name', 'lastName', 'last_name']
  ];

  for (const [snakeKey, camelKey, backendKey] of fields) {
    const value = body[snakeKey] ?? body[camelKey];
    if (typeof value === 'string') {
      payload[backendKey] = value;
    }
  }

  return payload;
}

async function requestProfile(method: 'PATCH' | 'PUT', request: Request) {
  const body = (await request.json()) as ProfileBody;
  const payload = editableProfilePayload(body);
  const profile = await callWithAutoRefresh((access) =>
    backendFetch<BackendProfile>('/profile/', {
      base: 'auth',
      accessToken: access,
      method,
      body: JSON.stringify(payload)
    })
  );

  return NextResponse.json(normalizeProfile(profile));
}

export async function GET() {
  try {
    const profile = await callWithAutoRefresh((access) =>
      backendFetch<BackendProfile>('/profile/', {
        base: 'auth',
        accessToken: access,
        method: 'GET'
      })
    );

    return NextResponse.json(normalizeProfile(profile));
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    return await requestProfile('PATCH', request);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    return await requestProfile('PUT', request);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
