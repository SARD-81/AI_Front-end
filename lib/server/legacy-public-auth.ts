import { NextResponse } from 'next/server';

export function refuseLegacyPublicAuth(kind: 'login' | 'register' | 'reset') {
  const code =
    kind === 'register'
      ? 'legacy_registration_disabled'
      : 'phone_login_required';
  return NextResponse.json(
    {
      message:
        kind === 'register'
          ? 'ثبت‌نام عمومی با ایمیل در این قرارداد فعال نیست.'
          : 'ورود عمومی با ایمیل در این قرارداد فعال نیست. از شماره موبایل استفاده کنید.',
      code
    },
    { status: 410 }
  );
}
