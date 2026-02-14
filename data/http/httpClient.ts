import type { AuthProvider } from '@/domain/ports/AuthProvider';
import type { ApiError } from '@/domain/types/api';

export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly authProvider: AuthProvider,
    private readonly timeoutMs = 30000,
  ) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const auth = await this.authProvider.getAuthContext();

      const headers = new Headers(init.headers);
      headers.set('Content-Type', 'application/json');

      // TODO(BE): Adjust to cookie-based auth if backend expects credentials instead of bearer token.
      if (typeof window !== 'undefined') {
        headers.set('x-demo-scenario', localStorage.getItem('demo-scenario') || 'normal');
      }
      if (auth.token) {
        headers.set('Authorization', `Bearer ${auth.token}`);
      }

      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: init.signal ?? controller.signal,
        // TODO(BE): If cookie auth is required, set credentials: 'include'.
      });

      if (!response.ok) {
        let details: unknown = undefined;
        try {
          details = await response.json();
        } catch {
          details = await response.text();
        }
        throw this.toApiError(response.status, details);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw <ApiError>{
          code: 'TIMEOUT',
          message: 'درخواست به دلیل زمان‌بر بودن لغو شد.',
          status: 408,
        };
      }
      if (this.isApiError(error)) {
        throw error;
      }
      throw <ApiError>{
        code: 'NETWORK_ERROR',
        message: 'خطای شبکه رخ داد. اتصال اینترنت را بررسی کنید.',
        status: 0,
        details: error,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private toApiError(status: number, details?: unknown): ApiError {
    const defaultMessage =
      status === 401 || status === 403
        ? 'دسترسی نامعتبر است. لطفاً دوباره وارد شوید.'
        : status === 429
          ? 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد تلاش کنید.'
          : 'خطا در پردازش درخواست.';

    return {
      code: `HTTP_${status}`,
      status,
      message: defaultMessage,
      details,
    };
  }

  private isApiError(error: unknown): error is ApiError {
    return Boolean(error && typeof error === 'object' && 'code' in error && 'status' in error);
  }
}
