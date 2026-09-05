import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {UNIVERSITY_EMAIL_HINT} from '@/lib/config/university-email';
import {isValidUniversityEmail} from '@/lib/server/university-config';

type EmailBody = {email?: string};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EmailBody;
    const email = body.email?.trim() ?? '';

    if (!isValidUniversityEmail(email)) {
      return NextResponse.json({message: UNIVERSITY_EMAIL_HINT}, {status: 400});
    }

    await backendFetch('/password-reset/request-otp/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({email})
    });

    // Preserve reset anti-enumeration at the BFF boundary: the browser never
    // receives a backend success payload that could vary by account existence.
    return NextResponse.json({ok: true});
  } catch (error) {
    return routeErrorResponse(error);
  }
}
