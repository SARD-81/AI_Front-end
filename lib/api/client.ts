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
    throw new ApiError('API request failed', response.status, data);
  }
  return data as T;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // TODO: Set BASE_URL from environment (e.g., process.env.NEXT_PUBLIC_API_BASE_URL) once backend URL is available.
  const baseUrl = '';
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...init?.headers
      // TODO: Add auth token/cookie strategy (Bearer, httpOnly cookie, refresh flow) when backend auth is defined.
    }
  });

  return parseResponse<T>(response);
}
