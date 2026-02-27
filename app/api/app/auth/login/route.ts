import {NextResponse} from 'next/server';
import {setAuthCookies} from '@/lib/server/auth-cookies';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {isLikelyEmail, isValidUniversityEmail, studentIdToEmail} from '@/lib/server/university-config';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {identifier?: string; password?: string};
    const identifier = body.identifier?.trim() ?? '';
    const password = body.password ?? '';

    const email = /^\d+$/.test(identifier)
      ? studentIdToEmail(identifier)
      : isLikelyEmail(identifier)
        ? identifier.toLowerCase()
        : '';

    if (!email || !isValidUniversityEmail(email)) {
      return NextResponse.json({message: 'ایمیل دانشگاهی معتبر نیست.'}, {status: 400});
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
