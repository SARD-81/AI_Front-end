import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

export async function GET() {
  try {
    const profile = await callWithAutoRefresh((access) =>
      backendFetch<Record<string, string>>('/profile/', {base: 'auth', accessToken: access, method: 'GET'})
    );

    return NextResponse.json({
      user: {
        studentId: profile.student_id ?? profile.studentId ?? '',
        fullName: profile.full_name ?? profile.fullName ?? '',
        firstName: profile.first_name ?? profile.firstName ?? '',
        lastName: profile.last_name ?? profile.lastName ?? '',
        email: profile.email ?? '',
        faculty: profile.faculty ?? '',
        major: profile.major ?? '',
        degreeLevel: profile.degree_level ?? profile.degreeLevel ?? ''
      }
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
