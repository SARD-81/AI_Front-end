import {NextResponse} from 'next/server';
import {setAuthCookies} from '@/lib/server/auth-cookies';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {isUniversityEmail, UNIVERSITY_EMAIL_HINT} from '@/lib/config/university-email';

type LoginPayload = {
  identifier?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginPayload;
    const identifier = String(body.identifier ?? '').trim();
    const emailInput = String(body.email ?? '').trim();
    const password = body.password ?? '';

    let email = '';

    if (emailInput) {
      if (!isUniversityEmail(emailInput)) {
        return NextResponse.json({message: UNIVERSITY_EMAIL_HINT}, {status: 400});
      }
      email = emailInput;
    } else if (identifier) {
      if (identifier.includes('@')) {
        if (!isUniversityEmail(identifier)) {
          return NextResponse.json({message: UNIVERSITY_EMAIL_HINT}, {status: 400});
        }
        email = identifier;
      } else {
        if (!/^\d+$/.test(identifier)) {
          return NextResponse.json({message: 'شناسه ورود معتبر نیست.'}, {status: 400});
        }

        const template = process.env.STUDENT_ID_EMAIL_TEMPLATE ?? '{id}@sbu.ac.ir';
        const studentEmail = template.replace('{id}', identifier.trim());

        if (!isUniversityEmail(studentEmail)) {
          return NextResponse.json(
            {message: 'ایمیل دانشگاهی معتبر نیست. لطفاً با پشتیبانی تماس بگیرید.'},
            {status: 400}
          );
        }

        email = studentEmail;
      }
    } else {
      return NextResponse.json({message: 'شناسه ورود یا ایمیل الزامی است.'}, {status: 400});
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
