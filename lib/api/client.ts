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
    throw new ApiError(errorMessage, response.status, data);
  }
  return data as T;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || '/api/app';
  const requestUrl = `${baseUrl}${path}`;

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[apiFetch] request URL:', requestUrl);
  }

  const response = await fetch(requestUrl, {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...init?.headers
      // TODO: Add auth token/cookie strategy (Bearer, httpOnly cookie, refresh flow) when backend auth is defined.
    }
  });

  return parseResponse<T>(response);
}
