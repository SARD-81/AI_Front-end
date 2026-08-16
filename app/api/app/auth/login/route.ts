import { NextResponse } from 'next/server';
import { clearAuthCookies, setAuthCookies } from '@/lib/server/auth-cookies';
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
      identifier?: string | null;
      student_id?: string | null;
      personnel_id?: string | null;
      full_name?: string | null;
      role?: string | null;
      is_profile_completed?: boolean | null;
      must_change_password?: boolean | null;
      is_locked?: boolean | null;
    }>('/login/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    const text = (value: unknown) =>
      typeof value === 'string' && value.length > 0 ? value : undefined;
    const flag = (value: unknown) =>
      typeof value === 'boolean' ? value : undefined;

    const isProfileCompleted = flag(data.is_profile_completed);
    const mustChangePassword = flag(data.must_change_password);
    const isLocked = flag(data.is_locked);

    if (isLocked === true) {
      await clearAuthCookies();
      return NextResponse.json(
        { message: 'Account is locked.', code: 'ACCOUNT_LOCKED' },
        { status: 423 }
      );
    }

    // A temporary-password login is authenticated by Django, but it must not
    // create a browser session that can reach protected pages before the
    // permanent password is set. The canonical state is still returned below.
    if (mustChangePassword === true) {
      await clearAuthCookies();
    } else {
      await setAuthCookies({ access: data.access, refresh: data.refresh });
    }

    return NextResponse.json({
      user: {
        identifier: text(data.identifier),
        studentId: text(data.student_id),
        personnelId: text(data.personnel_id),
        fullName: text(data.full_name),
        role: text(data.role),
        isProfileCompleted,
        mustChangePassword,
        isLocked
      },
      isProfileCompleted,
      mustChangePassword,
      isLocked
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
