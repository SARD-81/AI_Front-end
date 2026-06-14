import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {UNIVERSITY_EMAIL_HINT} from '@/lib/config/university-email';
import {isValidUniversityEmail} from '@/lib/server/university-config';

type RegisterCompleteBody = {
  email?: string;
  otp_token?: string;
  otpToken?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  student_id?: string;
  studentId?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterCompleteBody;
    const email = body.email?.trim() ?? '';
    const otpToken = body.otp_token ?? body.otpToken ?? '';
    const firstName = body.first_name ?? body.firstName ?? '';
    const lastName = body.last_name ?? body.lastName ?? '';
    const studentId = body.student_id ?? body.studentId ?? '';
    const password = body.password ?? '';

    if (!isValidUniversityEmail(email)) {
      return NextResponse.json({message: UNIVERSITY_EMAIL_HINT}, {status: 400});
    }

    if (!otpToken || !firstName || !lastName || !studentId || !password) {
      return NextResponse.json({message: 'اطلاعات ثبت‌نام کامل نیست.'}, {status: 400});
    }

    const data = await backendFetch('/register/complete/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({
        email,
        otp_token: otpToken,
        first_name: firstName,
        last_name: lastName,
        student_id: studentId,
        password
      })
    });

    return NextResponse.json(data, {status: 201});
  } catch (error) {
    return routeErrorResponse(error);
  }
}
