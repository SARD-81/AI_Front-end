import type { AuthProvider } from "@/domain/ports/AuthProvider";
import type { ApiError } from "@/domain/types/api";
import { API_BASE_URL } from "./endpoints";

export class HttpClient {
  constructor(private readonly authProvider: AuthProvider) {}

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.authProvider.getAccessToken();
    const url = `${API_BASE_URL}${path}`;
    // TODO(BE): confirm CORS and whether browser can directly call API_BASE_URL from frontend origin.
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const error: ApiError = {
        code:
          response.status === 401
            ? "UNAUTHORIZED"
            : response.status === 429
              ? "RATE_LIMIT"
              : "UNKNOWN",
        message: `HTTP ${response.status}`,
        status: response.status,
      };
      throw error;
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}
