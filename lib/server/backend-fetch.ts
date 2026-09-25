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

export type BackendFetchResult<T> = {
  status: number;
  data: T;
};

/** Ordinary BFF HTTP budget. WebSocket lifetime and model generation are not this value. */
export const BACKEND_HTTP_TIMEOUT_MS = 15_000;
export const BACKEND_HISTORY_TIMEOUT_MS = 20_000;
export const BACKEND_MAX_RESPONSE_BYTES = 1_048_576;

type BackendFetchInit = RequestInit & {
  base: 'auth' | 'api';
  accessToken?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
};

async function readLimitedText(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel();
    throw new ApiError(
      'پاسخ سرور بزرگ‌تر از حد مجاز است.',
      502,
      'backend_response_too_large'
    );
  }

  if (!response.body) return '';

  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ApiError(
        'پاسخ سرور بزرگ‌تر از حد مجاز است.',
        502,
        'backend_response_too_large'
      );
    }
    parts.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return new TextDecoder().decode(merged);
}

function abortError(userSignal: AbortSignal | null | undefined, timeoutSignal: AbortSignal) {
  if (userSignal?.aborted) {
    return new ApiError('درخواست لغو شد.', 499, 'request_aborted');
  }
  if (timeoutSignal.aborted) {
    return new ApiError('پاسخ سرور در زمان مجاز نرسید.', 504, 'backend_timeout');
  }
  return null;
}

export async function backendFetchResult<T = unknown>(
  urlPath: string,
  init?: BackendFetchInit
): Promise<BackendFetchResult<T>> {
  const origin = getBackendOrigin();
  const basePath = init?.base === 'auth' ? '/api/auth' : '/api';
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  const url = `${origin}${basePath}${normalizedPath}`;
  const clientIp = await getTrustedClientIp();

  const outgoingHeaders = new Headers(init?.headers);
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

  const timeoutMs = init?.timeoutMs ?? BACKEND_HTTP_TIMEOUT_MS;
  const maxResponseBytes = init?.maxResponseBytes ?? BACKEND_MAX_RESPONSE_BYTES;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  const fetchInit: RequestInit & Partial<BackendFetchInit> = {...(init ?? {base: 'api'})};
  delete fetchInit.timeoutMs;
  delete fetchInit.maxResponseBytes;
  delete fetchInit.base;
  delete fetchInit.accessToken;

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchInit,
      signal,
      cache: 'no-store',
      headers: outgoingHeaders
    });
  } catch (error) {
    const aborted = abortError(init?.signal, timeoutSignal);
    if (aborted) throw aborted;
    throw error;
  }

  if (response.status === 204) {
    return {status: 204, data: null as T};
  }

  const rawText = await readLimitedText(response, maxResponseBytes);
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
    const code =
      extractCode(data) ?? (response.status === 429 ? 'rate_limited' : undefined);
    const retryAfter = extractRetryAfter(data, response);

    throw new ApiError(message, response.status, code, data, retryAfter);
  }

  return {status: response.status, data: data as T};
}

export async function backendFetch<T = unknown>(
  urlPath: string,
  init?: BackendFetchInit
): Promise<T> {
  const result = await backendFetchResult<T>(urlPath, init);
  return result.data;
}
