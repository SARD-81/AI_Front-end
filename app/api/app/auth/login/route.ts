import {NextResponse} from 'next/server';
import {setAuthCookies} from '@/lib/server/auth-cookies';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {isLikelyEmail, isValidUniversityEmail, studentIdToEmail} from '@/lib/server/university-config';
import {UNIVERSITY_EMAIL_HINT} from '@/lib/config/university-email';

type LoginBody = {
  identifier?: string;
  email?: string;
  password?: string;
};

function resolveLoginEmail(body: LoginBody): string {
  const explicitEmail = body.email?.trim();
  if (explicitEmail) {
    return explicitEmail;
  }

  const identifier = body.identifier?.trim() ?? '';
  if (!identifier) {
    return '';
  }

  if (isLikelyEmail(identifier)) {
    return identifier;
  }

  if (/^\d+$/.test(identifier)) {
    return studentIdToEmail(identifier);
  }

  return '';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const password = body.password ?? '';
    const email = resolveLoginEmail(body);

    if (!email || !isValidUniversityEmail(email)) {
      return NextResponse.json({message: UNIVERSITY_EMAIL_HINT}, {status: 400});
    }

    const data = await backendFetch<{access: string; refresh?: string; student_id?: string; full_name?: string}>('/login/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({email, password})
    });

    await setAuthCookies({access: data.access, refresh: data.refresh});

    return NextResponse.json({
      user: {
        studentId: data.student_id,
        fullName: data.full_name
      }
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
