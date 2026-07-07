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

function getStringValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(getStringValue).find(Boolean) ?? '';
  return '';
}

function getBackendTitleError(payload: unknown) {
  if (typeof payload !== 'object' || payload === null) return '';

  const record = payload as Record<string, unknown>;
  const directTitle = getStringValue(record.title);
  if (directTitle) return directTitle;

  if (typeof record.error === 'object' && record.error !== null) {
    const nestedTitle = getStringValue((record.error as Record<string, unknown>).title);
    if (nestedTitle) return nestedTitle;
  }

  return '';
}

async function handleTitleUpdate(
  request: Request,
  context: {params: Promise<{id: string}>},
  method: 'PATCH' | 'PUT'
) {
  try {
    const {id} = await context.params;
    const body = await request.json();

    const data = await callWithAutoRefresh((access) =>
      backendFetch(`/conversations/${id}/`, {
        base: 'api',
        accessToken: access,
        method,
        body: JSON.stringify({title: body.title})
      })
    );

    return NextResponse.json(data);
  } catch (error) {
    // Surface field-level title validation errors with their original text.
    if (error instanceof ApiError) {
      const titleMessage = getBackendTitleError(error.payload);
      if (titleMessage) {
        return NextResponse.json({message: titleMessage}, {status: error.status});
      }
    }
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
