import {NextResponse} from 'next/server';
import {clearAuthCookies} from '@/lib/server/auth-cookies';

export async function POST() {
  await clearAuthCookies();
  return new NextResponse(null, {status: 204});
}
