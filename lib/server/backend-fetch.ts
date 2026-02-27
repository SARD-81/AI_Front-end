import 'server-only';
import {ApiError} from '@/lib/server/backend-types';

function getBackendOrigin() {
  const origin = process.env.BACKEND_ORIGIN?.trim();
  if (!origin) {
    throw new ApiError('تنظیمات سرور ناقص است.', 500, 'BACKEND_ORIGIN_MISSING');
  }
  return origin.replace(/\/+$/, '');
}

export async function backendFetch<T = unknown>(
  urlPath: string,
  init?: RequestInit & {base: 'auth' | 'api'; accessToken?: string}
): Promise<T> {
  const origin = getBackendOrigin();
  const basePath = init?.base === 'auth' ? '/api/auth' : '/api';
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  const url = `${origin}${basePath}${normalizedPath}`;

  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.accessToken ? {Authorization: `Bearer ${init.accessToken}`} : {}),
      ...init?.headers
    }
  });

  if (response.status === 204) {
    return null as T;
  }

  const rawText = await response.text();
  let data: Record<string, unknown> | undefined = undefined;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = undefined;
    }
  }

  if (!response.ok) {
    const message =
      (typeof data?.detail === 'string' && data.detail) ||
      (typeof data?.error === 'string' && data.error) ||
      (typeof data?.message === 'string' && data.message) ||
      'درخواست ناموفق بود.';
    const code = typeof data?.code === 'string' ? data.code : undefined;
    throw new ApiError(message, response.status, code);
  }

  return data as T;
}
