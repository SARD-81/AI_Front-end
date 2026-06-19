import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { UNIVERSITY_EMAIL_HINT } from '@/lib/config/university-email';
import { isValidUniversityEmail } from '@/lib/server/university-config';

type CompleteBody = {
  email?: string;
  new_password?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CompleteBody;
    const email = body.email?.trim() ?? '';
    const newPassword = body.new_password ?? body.newPassword ?? '';

    if (!isValidUniversityEmail(email)) {
      return NextResponse.json(
        { message: UNIVERSITY_EMAIL_HINT },
        { status: 400 }
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
      body: JSON.stringify({ email, new_password: newPassword })
    });

    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
