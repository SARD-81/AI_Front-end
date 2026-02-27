import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {isUniversityEmail, UNIVERSITY_EMAIL_HINT} from '@/lib/config/university-email';

type VerifyOtpPayload = {
  email?: string;
  otp_code?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyOtpPayload;
    const email = String(body.email ?? '').trim();

    if (!isUniversityEmail(email)) {
      return NextResponse.json({message: UNIVERSITY_EMAIL_HINT}, {status: 400});
    }

    const data = await backendFetch('/register/verify-otp/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({...body, email})
    });

    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
