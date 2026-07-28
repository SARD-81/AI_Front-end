import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { callWithAutoRefresh } from '@/lib/server/with-refresh';

type BackendProfile = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function normalizeProfile(profile: BackendProfile) {
  return {
    user: {
      studentId: text(profile.student_id ?? profile.studentId),
      personnelId: text(profile.personnel_id ?? profile.personnelId),
      fullName: text(profile.full_name ?? profile.fullName),
      firstName: text(profile.first_name ?? profile.firstName),
      lastName: text(profile.last_name ?? profile.lastName),
      email: text(profile.email),
      faculty: text(profile.faculty),
      major: text(profile.major),
      degreeLevel: text(profile.degree_level ?? profile.degreeLevel),
      // Employment side of the profile (professors and staff).
      department: text(profile.department),
      academicRank: text(profile.academic_rank ?? profile.academicRank),
      jobTitle: text(profile.job_title ?? profile.jobTitle),
      role: optionalText(profile.role),
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
