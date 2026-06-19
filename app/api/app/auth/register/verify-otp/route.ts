import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { UNIVERSITY_EMAIL_HINT } from '@/lib/config/university-email';
import { isValidUniversityEmail } from '@/lib/server/university-config';

type VerifyBody = {
  email?: string;
  otp?: string;
  otpCode?: string;
  otp_code?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyBody;
    const email = body.email?.trim() ?? '';
    const submittedCode = body.otp ?? body.otpCode ?? body.otp_code ?? '';

    if (!isValidUniversityEmail(email)) {
      return NextResponse.json(
        { message: UNIVERSITY_EMAIL_HINT },
        { status: 400 }
      );
    }

    if (!submittedCode) {
      return NextResponse.json(
        { message: 'Verification code is required.' },
        { status: 400 }
      );
    }

    const data = await backendFetch('/register/verify-otp/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({ email, otp_code: submittedCode })
    });

    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
