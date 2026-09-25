import { NextResponse } from 'next/server';
import { clearAuthCookies, setAuthCookies } from '@/lib/server/auth-cookies';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import {
  normalizeBackendAuthContract,
  type BackendAuthContract
} from '@/lib/server/auth-contract';
import { isValidUniversityEmail } from '@/lib/server/university-config';
import { UNIVERSITY_EMAIL_HINT } from '@/lib/config/university-email';
import { crossSiteRejection } from '@/lib/server/request-origin';
import { readJsonBody } from '@/lib/server/limited-body';

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
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;

  try {
    const body = await readJsonBody<SetInitialPasswordBody>(request);
    const email = body.email?.trim() ?? '';
    const temporaryPassword =
      body.temporary_password ?? body.temporaryPassword ?? '';
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

    const data = await backendFetch<
      BackendAuthContract & {
        status?: string;
        phone_login_required?: boolean;
        phone_setup_required?: boolean;
      }
    >('/set-initial-password/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({
        email,
        temporary_password: temporaryPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm
      })
    });

    const access = typeof data.access === 'string' ? data.access : '';
    if (!access) {
      await clearAuthCookies();
      return NextResponse.json({
        status:
          typeof data.status === 'string' ? data.status : 'password_updated',
        phone_login_required: data.phone_login_required === true,
        phone_setup_required: data.phone_setup_required === true
      });
    }

    const {
      access: token,
      refresh,
      result
    } = normalizeBackendAuthContract(data as BackendAuthContract);

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
      await setAuthCookies({ access: token, refresh });
    }

    return NextResponse.json(result);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
