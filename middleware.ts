import createMiddleware from 'next-intl/middleware';
import {NextResponse, type NextRequest} from 'next/server';
import {defaultLocale, locales} from './lib/i18n/config';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: false
});

// Route sections that require an authenticated session.
const PROTECTED_SEGMENTS = new Set(['chat', 'chats', 'profile', 'settings']);

const ACCESS_COOKIE = 'sbu_access';
const REFRESH_COOKIE = 'sbu_refresh';

export default function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const hasLocalePrefix = (locales as readonly string[]).includes(segments[0] ?? '');
  const locale = hasLocalePrefix ? (segments[0] as string) : defaultLocale;
  const section = hasLocalePrefix ? segments[1] : segments[0];

  const hasSession = Boolean(
    request.cookies.get(ACCESS_COOKIE)?.value ||
      request.cookies.get(REFRESH_COOKIE)?.value
  );

  if (section && PROTECTED_SEGMENTS.has(section) && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/auth`;
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
