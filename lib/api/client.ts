const DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown
  ) {
    super(message);
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
    const error = new ApiError(errorMessage, response.status, data);

    if (response.status === 401) {
      redirectToLogin();
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
