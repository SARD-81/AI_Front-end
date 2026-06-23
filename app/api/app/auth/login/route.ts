import { NextResponse } from 'next/server';
import { setAuthCookies } from '@/lib/server/auth-cookies';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { isValidUniversityEmail } from '@/lib/server/university-config';
import { UNIVERSITY_EMAIL_HINT } from '@/lib/config/university-email';

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const password = body.password ?? '';
    const email = body.email?.trim() ?? '';

    if (!email || !isValidUniversityEmail(email)) {
      return NextResponse.json(
        { message: UNIVERSITY_EMAIL_HINT },
        { status: 400 }
      );
    }

    const data = await backendFetch<{
      access: string;
      refresh?: string;
      student_id?: string;
      full_name?: string;
      role?: string;
      is_profile_completed?: boolean;
    }>('/login/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    await setAuthCookies({ access: data.access, refresh: data.refresh });

    return NextResponse.json({
      user: {
        studentId: data.student_id,
        fullName: data.full_name,
        role: data.role,
        isProfileCompleted: data.is_profile_completed
      },
      isProfileCompleted: data.is_profile_completed
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
