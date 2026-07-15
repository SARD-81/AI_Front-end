import { NextResponse } from 'next/server';
import { setAuthCookies } from '@/lib/server/auth-cookies';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
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

    const data = await backendFetch<{ access: string; refresh?: string }>(
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

    await setAuthCookies({ access: data.access, refresh: data.refresh });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
