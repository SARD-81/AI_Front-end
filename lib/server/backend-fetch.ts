import 'server-only';
import {ApiError} from '@/lib/server/backend-types';
import {getTrustedClientIp} from '@/lib/server/client-ip';

function getBackendOrigin() {
  const origin = process.env.BACKEND_ORIGIN?.trim();
  if (!origin) {
    throw new ApiError('تنظیمات سرور ناقص است.', 500, 'BACKEND_ORIGIN_MISSING');
  }
  return origin.replace(/\/+$/, '');
}

function extractCode(data: Record<string, unknown> | undefined) {
  if (!data) return undefined;

  const rawCode = data.code;
  if (typeof rawCode === 'string' && rawCode.trim()) {
    return rawCode.trim();
  }
  if (Array.isArray(rawCode) && typeof rawCode[0] === 'string') {
    const code = rawCode[0].trim();
    return code || undefined;
  }

  const nestedError = data.error;
  if (
    nestedError &&
    typeof nestedError === 'object' &&
    !Array.isArray(nestedError)
  ) {
    const nestedCode = (nestedError as Record<string, unknown>).code;
    if (typeof nestedCode === 'string' && nestedCode.trim()) {
      return nestedCode.trim();
    }
  }

  return undefined;
}

function extractRetryAfter(
  data: Record<string, unknown> | undefined,
  response: Response
): number | null {
  const rawRetryAfter = data?.retry_after;
  if (
    typeof rawRetryAfter === 'number' &&
    Number.isFinite(rawRetryAfter) &&
    rawRetryAfter >= 0
  ) {
    return rawRetryAfter;
  }

  const headerValue = response.headers.get('Retry-After');
  if (headerValue) {
    const parsed = Number(headerValue);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

export async function backendFetch<T = unknown>(
  urlPath: string,
  init?: RequestInit & {base: 'auth' | 'api'; accessToken?: string}
): Promise<T> {
  const origin = getBackendOrigin();
  const basePath = init?.base === 'auth' ? '/api/auth' : '/api';
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  const url = `${origin}${basePath}${normalizedPath}`;
  const clientIp = await getTrustedClientIp();

  const outgoingHeaders = new Headers(init?.headers);
  // Never relay forwarding headers supplied by the caller/browser. The BFF
  // owns these headers and creates them only from a trusted proxy signal.
  outgoingHeaders.delete('x-forwarded-for');
  outgoingHeaders.delete('x-real-ip');
  outgoingHeaders.set('Accept', 'application/json');
  if (!outgoingHeaders.has('Content-Type')) {
    outgoingHeaders.set('Content-Type', 'application/json');
  }
  if (init?.accessToken) {
    outgoingHeaders.set('Authorization', `Bearer ${init.accessToken}`);
  }
  if (clientIp) {
    outgoingHeaders.set('X-Real-IP', clientIp);
    outgoingHeaders.set('X-Forwarded-For', clientIp);
  }

  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: outgoingHeaders
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
    const code = extractCode(data);
    const retryAfter = extractRetryAfter(data, response);

    throw new ApiError(message, response.status, code, data, retryAfter);
  }

  return data as T;
}
