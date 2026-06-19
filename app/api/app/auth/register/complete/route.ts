import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { UNIVERSITY_EMAIL_HINT } from '@/lib/config/university-email';
import { isValidUniversityEmail } from '@/lib/server/university-config';

type RegisterCompleteBody = {
  email?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  student_id?: string;
  studentId?: string;
  password?: string;
  faculty?: string;
  major?: string;
  degree_level?: string;
  degreeLevel?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterCompleteBody;
    const email = body.email?.trim() ?? '';
    const firstName = body.first_name ?? body.firstName ?? '';
    const lastName = body.last_name ?? body.lastName ?? '';
    const studentId = body.student_id ?? body.studentId ?? '';
    const password = body.password ?? '';
    const faculty = body.faculty ?? '';
    const major = body.major ?? '';
    const degreeLevel = body.degree_level ?? body.degreeLevel ?? '';

    if (!isValidUniversityEmail(email)) {
      return NextResponse.json(
        { message: UNIVERSITY_EMAIL_HINT },
        { status: 400 }
      );
    }

    if (
      !firstName ||
      !lastName ||
      !studentId ||
      !password ||
      !faculty ||
      !major ||
      !degreeLevel
    ) {
      return NextResponse.json(
        { message: 'اطلاعات ثبت‌نام کامل نیست.' },
        { status: 400 }
      );
    }

    const data = await backendFetch('/register/complete/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        student_id: studentId,
        faculty,
        major,
        degree_level: degreeLevel
      })
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
