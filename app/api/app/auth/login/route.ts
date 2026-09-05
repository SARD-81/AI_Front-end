import { NextResponse } from 'next/server';
import { clearAuthCookies, setAuthCookies } from '@/lib/server/auth-cookies';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { normalizeBackendAuthContract, type BackendAuthContract } from '@/lib/server/auth-contract';
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

    const data = await backendFetch<BackendAuthContract>('/login/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    const {access, refresh, result} = normalizeBackendAuthContract(data);

    if (result.isLocked === true || result.user?.isLocked === true) {
      await clearAuthCookies();
      return NextResponse.json(
        { message: 'Account is locked.', code: 'ACCOUNT_LOCKED' },
        { status: 423 }
      );
    }

    if (
      result.mustChangePassword === true ||
      result.user?.mustChangePassword === true
    ) {
      await clearAuthCookies();
    } else {
      await setAuthCookies({ access, refresh });
    }

    return NextResponse.json(result);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
