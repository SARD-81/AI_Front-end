const DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly payload?: unknown,
    public readonly retryAfter: number | null = null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function joinUrl(baseUrl: string, path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!baseUrl) {
    return normalizedPath;
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  return `${normalizedBase}${normalizedPath}`;
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? '';
}

export function resolveApiUrl(path: string) {
  return joinUrl(getApiBaseUrl(), path);
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;

  const {pathname, search} = window.location;
  const locale = pathname.split('/').filter(Boolean)[0] || 'fa';
  const isAuthPage = pathname.includes('/auth');

  if (isAuthPage) return;

  const next = `${pathname}${search}`;
  const target = `/${locale}/auth?mode=login&next=${encodeURIComponent(next)}`;
  if (window.location.href.includes(target)) return;
  window.location.assign(target);
}

function redirectToProfile() {
  if (typeof window === 'undefined') return;

  const {pathname} = window.location;
  if (pathname.includes('/auth')) return;

  const locale = pathname.split('/').filter(Boolean)[0] || 'fa';
  const target = `/${locale}/profile`;

  if (pathname === target) return;
  window.location.assign(target);
}

function getErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.code === 'string' && record.code.trim()) {
    return record.code.trim();
  }

  const nestedError = record.error;
  if (
    nestedError &&
    typeof nestedError === 'object' &&
    !Array.isArray(nestedError) &&
    typeof (nestedError as Record<string, unknown>).code === 'string'
  ) {
    const code = String((nestedError as Record<string, unknown>).code).trim();
    return code || undefined;
  }

  return undefined;
}

function getRetryAfter(payload: unknown, response: Response): number | null {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const value = (payload as Record<string, unknown>).retry_after;
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
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

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => undefined);
  if (!response.ok) {
    const payloadMessage =
      typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
        ? data.message.trim()
        : typeof data === 'object' &&
            data !== null &&
            'error' in data &&
            typeof data.error === 'object' &&
            data.error !== null &&
            'message' in data.error &&
            typeof data.error.message === 'string'
          ? data.error.message.trim()
          : '';
    const errorMessage = payloadMessage || 'API request failed';
    const errorCode = getErrorCode(data);
    const retryAfter = getRetryAfter(data, response);
    const error = new ApiError(
      errorMessage,
      response.status,
      errorCode,
      data,
      retryAfter
    );

    if (response.status === 401) {
      redirectToLogin();
    } else if (
      response.status === 403 &&
      errorCode?.toUpperCase() === 'PROFILE_INCOMPLETE'
    ) {
      redirectToProfile();
    }

    throw error;
  }
  return data as T;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...DEFAULT_HEADERS,
      ...init?.headers
    }
  });

  return parseResponse<T>(response);
}
