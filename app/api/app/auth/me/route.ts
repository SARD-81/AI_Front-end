import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { callWithAutoRefresh } from '@/lib/server/with-refresh';

type BackendProfile = Record<string, unknown>;

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
      isProfileCompleted:
        typeof profile.is_profile_completed === 'boolean'
          ? profile.is_profile_completed
          : typeof profile.isProfileCompleted === 'boolean'
            ? profile.isProfileCompleted
            : undefined
    }
  };
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