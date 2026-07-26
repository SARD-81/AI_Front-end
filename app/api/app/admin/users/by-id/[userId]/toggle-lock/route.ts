import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

// Role-agnostic account lock toggle by primary key. Preferred over the legacy
// student-id route because it also covers professor/staff/admin accounts.
export async function POST(_request: Request, context: {params: Promise<{userId: string}>}) {
  try {
    const {userId} = await context.params;

    if (!/^\d+$/.test(userId)) {
      return NextResponse.json({message: 'شناسه کاربر نامعتبر است.'}, {status: 400});
    }

    const data = await callWithAutoRefresh((access) =>
      backendFetch(`/admin/users/by-id/${userId}/toggle-lock/`, {
        base: 'api',
        accessToken: access,
        method: 'POST'
      })
    );

    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
