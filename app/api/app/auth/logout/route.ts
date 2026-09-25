import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {getAuthCookies, clearAuthCookies} from '@/lib/server/auth-cookies';
import {crossSiteRejection} from '@/lib/server/request-origin';

export async function POST(request: Request) {
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;

  const {access, refresh} = await getAuthCookies();

  try {
    if (access && refresh) {
      await backendFetch('/logout/', {
        base: 'auth',
        accessToken: access,
        method: 'POST',
        body: JSON.stringify({refresh})
      });
    }
  } finally {
    await clearAuthCookies();
  }

  return new NextResponse(null, {status: 204});
}