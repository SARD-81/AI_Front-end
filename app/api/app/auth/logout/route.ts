import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {getAuthCookies, clearAuthCookies} from '@/lib/server/auth-cookies';

export async function POST() {
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
