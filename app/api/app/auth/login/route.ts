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
      student_id?: string | null;
      personnel_id?: string | null;
      full_name?: string | null;
      role?: string | null;
      is_profile_completed?: boolean | null;
    }>('/login/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    await setAuthCookies({ access: data.access, refresh: data.refresh });

    // `null` values (professors and staff have no student id) are dropped so the
    // client-side schema never sees a type it does not expect.
    const text = (value: unknown) =>
      typeof value === 'string' && value.length > 0 ? value : undefined;
    const flag = (value: unknown) =>
      typeof value === 'boolean' ? value : undefined;

    return NextResponse.json({
      user: {
        studentId: text(data.student_id),
        personnelId: text(data.personnel_id),
        fullName: text(data.full_name),
        role: text(data.role),
        isProfileCompleted: flag(data.is_profile_completed)
      },
      isProfileCompleted: flag(data.is_profile_completed)
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
