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
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? ((data as {error?: {message?: string}}).error?.message ?? 'API request failed')
        : 'API request failed';
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...init?.headers
    }
  });

  return parseResponse<T>(response);
}
