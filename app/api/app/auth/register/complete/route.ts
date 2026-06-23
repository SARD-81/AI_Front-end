import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { UNIVERSITY_EMAIL_HINT } from '@/lib/config/university-email';

type RegisterRole = 'professor' | 'staff';

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
  entry_year?: number | string;
  entryYear?: number | string;
  role?: RegisterRole | 'student' | 'admin' | string;
  personnel_id?: string;
  personnelId?: string;
  department?: string;
  academic_rank?: string;
  academicRank?: string;
  job_title?: string;
  jobTitle?: string;
};

function isStudentEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@mail.sbu.ac.ir');
}

function isEmployeeEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@sbu.ac.ir');
}

function parseEntryYear(value: number | string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const year = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(year) ? year : undefined;
}

function addOptionalString(
  payload: Record<string, unknown>,
  key: string,
  value: string | undefined
): Record<string, unknown> {
  if (value?.trim()) {
    payload[key] = value.trim();
  }
  return payload;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterCompleteBody;
    const email = body.email?.trim() ?? '';
    const firstName = body.first_name ?? body.firstName ?? '';
    const lastName = body.last_name ?? body.lastName ?? '';
    const password = body.password ?? '';
    const faculty = body.faculty ?? '';

    if (!isStudentEmail(email) && !isEmployeeEmail(email)) {
      return NextResponse.json(
        { message: UNIVERSITY_EMAIL_HINT },
        { status: 400 }
      );
    }

    if (!firstName || !lastName || !password || !faculty) {
      return NextResponse.json(
        { message: 'اطلاعات ثبت‌نام کامل نیست.' },
        { status: 400 }
      );
    }

    const basePayload = {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      faculty
    };

    let backendPayload: Record<string, unknown>;

    if (isStudentEmail(email)) {
      const studentId = body.student_id ?? body.studentId ?? '';
      const major = body.major ?? '';
      const degreeLevel = body.degree_level ?? body.degreeLevel ?? '';
      const entryYear = parseEntryYear(body.entry_year ?? body.entryYear);

      if (!studentId || !major || !degreeLevel || entryYear === undefined) {
        return NextResponse.json(
          { message: 'اطلاعات ثبت‌نام کامل نیست.' },
          { status: 400 }
        );
      }

      backendPayload = {
        ...basePayload,
        student_id: studentId,
        major,
        degree_level: degreeLevel,
        entry_year: entryYear
      };
    } else {
      const role = body.role;
      const personnelId = body.personnel_id ?? body.personnelId ?? '';
      const department = body.department ?? '';

      if (role !== 'professor' && role !== 'staff') {
        return NextResponse.json(
          { message: 'برای ایمیل sbu.ac.ir نقش استاد یا کارمند را انتخاب کنید.' },
          { status: 400 }
        );
      }

      if (!personnelId || !department) {
        return NextResponse.json(
          { message: 'اطلاعات ثبت‌نام کامل نیست.' },
          { status: 400 }
        );
      }

      backendPayload = {
        ...basePayload,
        role,
        personnel_id: personnelId,
        department
      };

      if (role === 'professor') {
        addOptionalString(backendPayload, 'academic_rank', body.academic_rank ?? body.academicRank);
      } else {
        addOptionalString(backendPayload, 'job_title', body.job_title ?? body.jobTitle);
      }
    }

    const data = await backendFetch('/register/complete/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify(backendPayload)
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
