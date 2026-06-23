import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {ApiError} from '@/lib/server/backend-types';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

export async function GET(_request: Request, context: {params: Promise<{id: string}>}) {
  try {
    const {id} = await context.params;

    const data = await callWithAutoRefresh((access) =>
      backendFetch(`/conversations/${id}/`, {
        base: 'api',
        accessToken: access,
        method: 'GET'
      })
    );

    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

function getBackendOrigin() {
  const origin = process.env.BACKEND_ORIGIN?.trim();
  if (!origin) {
    throw new ApiError('تنظیمات سرور ناقص است.', 500, 'BACKEND_ORIGIN_MISSING');
  }
  return origin.replace(/\/+$/, '');
}

function getStringValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(getStringValue).find(Boolean) ?? '';
  return '';
}

function getBackendTitleError(data: Record<string, unknown> | undefined) {
  if (!data) return '';

  const directTitle = getStringValue(data.title);
  if (directTitle) return directTitle;

  if (typeof data.error === 'object' && data.error !== null) {
    const nestedTitle = getStringValue((data.error as Record<string, unknown>).title);
    if (nestedTitle) return nestedTitle;
  }

  return '';
}

async function updateConversationTitle(id: string, accessToken: string, method: 'PATCH' | 'PUT', title: unknown) {
  const response = await fetch(`${getBackendOrigin()}/api/conversations/${id}/`, {
    method,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({title})
  });

  const rawText = await response.text();
  let data: Record<string, unknown> | undefined;
  if (rawText) {
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      data = undefined;
    }
  }

  if (!response.ok) {
    const titleMessage = getBackendTitleError(data);
    const message =
      titleMessage ||
      (typeof data?.detail === 'string' && data.detail) ||
      (typeof data?.error === 'string' && data.error) ||
      (typeof data?.message === 'string' && data.message) ||
      'درخواست ناموفق بود.';
    const code = typeof data?.code === 'string' ? data.code : undefined;
    throw new ApiError(message, response.status, code);
  }

  return data;
}

async function handleTitleUpdate(request: Request, context: {params: Promise<{id: string}>}, method: 'PATCH' | 'PUT') {
  try {
    const {id} = await context.params;
    const body = await request.json();

    const data = await callWithAutoRefresh((access) => updateConversationTitle(id, access, method, body.title));

    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: {params: Promise<{id: string}>}) {
  return handleTitleUpdate(request, context, 'PATCH');
}

export async function PUT(request: Request, context: {params: Promise<{id: string}>}) {
  return handleTitleUpdate(request, context, 'PUT');
}

export async function DELETE(_request: Request, context: {params: Promise<{id: string}>}) {
  try {
    const {id} = await context.params;

    await callWithAutoRefresh((access) =>
      backendFetch(`/conversations/${id}/`, {
        base: 'api',
        accessToken: access,
        method: 'DELETE'
      })
    );

    return new NextResponse(null, {status: 204});
  } catch (error) {
    return routeErrorResponse(error);
  }
}
