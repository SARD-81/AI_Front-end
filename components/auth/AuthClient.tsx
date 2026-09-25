'use client';

import { UniversityLogo } from '@/components/branding/UniversityLogo';
import { PhoneAuthExperience } from '@/components/auth/PhoneAuthExperience';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

function replaceLocaleInPath(pathname: string, nextLocale: string) {
  const segments = pathname.split('/');
  if (segments[1] === 'fa' || segments[1] === 'en') {
    segments[1] = nextLocale;
    return segments.join('/');
  }
  return `/${nextLocale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

export function AuthClient({
  locale,
  phoneAuthEnabled = false
}: {
  locale: string;
  phoneAuthEnabled?: boolean;
}) {
  if (phoneAuthEnabled) return <PhoneAuthExperience locale={locale} />;
  return <AuthClosed locale={locale} />;
}

function AuthClosed({ locale }: { locale: string }) {
  const t = useTranslations('auth.closed');
  const router = useRouter();
  const pathname = usePathname();

  return (
    <main
      id="main-content"
      className="flex min-h-[100dvh] items-center justify-center bg-[#031c28] px-4 py-8 text-[#f4fbfb]"
    >
      <section className="w-full max-w-md rounded-3xl bg-[#f3f8f8] p-6 text-[#042838]">
        <UniversityLogo alt="" onLight className="mb-4 h-12 w-12" />
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-3 text-sm leading-7">{t('body')}</p>
        <div className="mt-5 flex gap-2" dir="ltr">
          {(['fa', 'en'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={locale === option}
              className="min-h-11 min-w-11 rounded-full border border-[#075373] px-3 text-sm font-bold text-[#075373]"
              onClick={() => {
                if (option !== locale) {
                  router.replace(replaceLocaleInPath(pathname, option));
                }
              }}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
