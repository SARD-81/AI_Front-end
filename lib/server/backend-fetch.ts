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
    const joinStrings = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string').join(' ')
        : '';
    const message =
      (typeof data?.detail === 'string' && data.detail) ||
      joinStrings(data?.detail) ||
      (typeof data?.error === 'string' && data.error) ||
      joinStrings(data?.error) ||
      (typeof data?.message === 'string' && data.message) ||
      'درخواست ناموفق بود.';
    const rawCode = data?.code;
    const code =
      typeof rawCode === 'string'
        ? rawCode
        : Array.isArray(rawCode) && typeof rawCode[0] === 'string'
          ? rawCode[0]
          : undefined;
    // Rate-limit responses carry `retry_after` in the body and the same value
    // in the `Retry-After` header. Edge (Nginx/CDN) 429s may carry neither a
    // JSON body nor `retry_after`, so the header is used as a fallback.
    const rawRetryAfter = data?.retry_after;
    const headerRetryAfter = Number(response.headers.get('Retry-After'));
    const retryAfter =
      typeof rawRetryAfter === 'number' && Number.isFinite(rawRetryAfter)
        ? rawRetryAfter
        : Number.isFinite(headerRetryAfter) && headerRetryAfter > 0
          ? headerRetryAfter
          : undefined;
    throw new ApiError(message, response.status, code, data, retryAfter);
  }

  return data as T;
}
