import { NextResponse } from 'next/server';
import { clearAuthCookies, setAuthCookies } from '@/lib/server/auth-cookies';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { normalizeBackendAuthContract, type BackendAuthContract } from '@/lib/server/auth-contract';
import { isValidUniversityEmail } from '@/lib/server/university-config';
import { UNIVERSITY_EMAIL_HINT } from '@/lib/config/university-email';

type SetInitialPasswordBody = {
  email?: string;
  temporary_password?: string;
  temporaryPassword?: string;
  new_password?: string;
  newPassword?: string;
  new_password_confirm?: string;
  newPasswordConfirm?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SetInitialPasswordBody;
    const email = body.email?.trim() ?? '';
    const temporaryPassword = body.temporary_password ?? body.temporaryPassword ?? '';
    const newPassword = body.new_password ?? body.newPassword ?? '';
    const newPasswordConfirm =
      body.new_password_confirm ?? body.newPasswordConfirm ?? '';

    if (!email || !isValidUniversityEmail(email)) {
      return NextResponse.json(
        { message: UNIVERSITY_EMAIL_HINT },
        { status: 400 }
      );
    }

    if (!temporaryPassword || !newPassword || !newPasswordConfirm) {
      return NextResponse.json(
        { message: 'اطلاعات تغییر رمز عبور کامل نیست.' },
        { status: 400 }
      );
    }

    const data = await backendFetch<BackendAuthContract>(
      '/set-initial-password/',
      {
        base: 'auth',
        method: 'POST',
        body: JSON.stringify({
          email,
          temporary_password: temporaryPassword,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm
        })
      }
    );

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
