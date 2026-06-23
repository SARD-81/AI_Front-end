import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { callWithAutoRefresh } from '@/lib/server/with-refresh';

type BackendProfile = Record<string, unknown>;

type ProfileBody = {
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  student_id?: string;
  studentId?: string;
};

function normalizeProfile(profile: BackendProfile) {
  return {
    user: {
      studentId:
        typeof (profile.student_id ?? profile.studentId) === 'string'
          ? (profile.student_id ?? profile.studentId)
          : '',
      fullName:
        typeof (profile.full_name ?? profile.fullName) === 'string'
          ? (profile.full_name ?? profile.fullName)
          : '',
      firstName:
        typeof (profile.first_name ?? profile.firstName) === 'string'
          ? (profile.first_name ?? profile.firstName)
          : '',
      lastName:
        typeof (profile.last_name ?? profile.lastName) === 'string'
          ? (profile.last_name ?? profile.lastName)
          : '',
      email: typeof profile.email === 'string' ? profile.email : '',
      faculty: typeof profile.faculty === 'string' ? profile.faculty : '',
      major: typeof profile.major === 'string' ? profile.major : '',
      degreeLevel:
        typeof (profile.degree_level ?? profile.degreeLevel) === 'string'
          ? (profile.degree_level ?? profile.degreeLevel)
          : '',
      role: typeof profile.role === 'string' ? profile.role : undefined,
      personnelId:
        typeof (profile.personnel_id ?? profile.personnelId) === 'string'
          ? (profile.personnel_id ?? profile.personnelId)
          : undefined,
      department: typeof profile.department === 'string' ? profile.department : undefined,
      academicRank:
        typeof (profile.academic_rank ?? profile.academicRank) === 'string'
          ? (profile.academic_rank ?? profile.academicRank)
          : undefined,
      jobTitle:
        typeof (profile.job_title ?? profile.jobTitle) === 'string'
          ? (profile.job_title ?? profile.jobTitle)
          : undefined,
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
