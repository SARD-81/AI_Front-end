import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

// Legacy lookup: resolves STUDENT accounts by `student_id`. The static
// `by-id` segment takes precedence over this dynamic segment, so
// /admin/users/by-id/<pk>/toggle-lock still hits the role-agnostic route.
export async function POST(_request: Request, context: {params: Promise<{studentId: string}>}) {
  try {
    const {studentId} = await context.params;
    const normalized = studentId.trim();

    if (!normalized) {
      return NextResponse.json({message: 'شماره دانشجویی نامعتبر است.'}, {status: 400});
    }

    const data = await callWithAutoRefresh((access) =>
      backendFetch(`/admin/users/${encodeURIComponent(normalized)}/toggle-lock/`, {
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
