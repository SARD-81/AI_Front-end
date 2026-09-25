import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/server/auth-cookies';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { UNIVERSITY_EMAIL_HINT } from '@/lib/config/university-email';
import { isValidUniversityEmail } from '@/lib/server/university-config';
import { crossSiteRejection } from '@/lib/server/request-origin';
import { readJsonBody } from '@/lib/server/limited-body';

type CompleteBody = {
  email?: string;
  flow_token?: string;
  flowToken?: string;
  otpToken?: string;
  new_password?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;

  try {
    const body = await readJsonBody<CompleteBody>(request);
    const email = body.email?.trim() ?? '';
    const newPassword = body.new_password ?? body.newPassword ?? '';
    const flowToken = (body.flow_token ?? body.flowToken ?? body.otpToken ?? '').trim();

    if (!isValidUniversityEmail(email)) {
      return NextResponse.json(
        { message: UNIVERSITY_EMAIL_HINT },
        { status: 400 }
      );
    }

    if (!flowToken) {
      // The single-use verification token is required by the backend contract.
      return NextResponse.json(
        { message: 'نشست تأیید ایمیل منقضی شده است. لطفاً کد تأیید را دوباره دریافت کنید.' },
        { status: 403 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        { message: 'اطلاعات بازیابی رمز عبور کامل نیست.' },
        { status: 400 }
      );
    }

    const data = await backendFetch('/password-reset/complete/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({ email, flow_token: flowToken, new_password: newPassword })
    });

    await clearAuthCookies();
    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}