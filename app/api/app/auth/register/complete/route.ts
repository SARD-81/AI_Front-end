import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {UNIVERSITY_EMAIL_HINT} from '@/lib/config/university-email';
import {isValidUniversityEmail} from '@/lib/server/university-config';

type RegisterEmailBody = {email?: string};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterEmailBody;
    const email = body.email?.trim() ?? '';

    if (!isValidUniversityEmail(email)) {
      return NextResponse.json({message: UNIVERSITY_EMAIL_HINT}, {status: 400});
    }

    const data = await backendFetch('/register/complete/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify(body)
    });

    return NextResponse.json(data, {status: 201});
  } catch (error) {
    return routeErrorResponse(error);
  }
}
