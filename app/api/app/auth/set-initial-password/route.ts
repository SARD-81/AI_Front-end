import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/server/auth-cookies';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { parseMigratedPasswordResponse } from '@/lib/auth/migrated-password';
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

    const data = await backendFetch<unknown>('/set-initial-password/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({
        email,
        temporary_password: temporaryPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm
      })
    });

    const parsed = parseMigratedPasswordResponse(data);
    await clearAuthCookies();
    if (!parsed) {
      return NextResponse.json(
        {
          message: 'پاسخ تعیین رمز با قرارداد پایلوت هم‌خوان نیست.',
          code: 'AUTH_CONTRACT_INVALID'
        },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
