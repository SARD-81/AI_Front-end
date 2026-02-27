import 'server-only';
import {getAuthCookies, setAuthCookies, clearAuthCookies} from '@/lib/server/auth-cookies';
import {backendFetch} from '@/lib/server/backend-fetch';
import {ApiError} from '@/lib/server/backend-types';

export async function callWithAutoRefresh<T>(fn: (accessToken: string) => Promise<T>): Promise<T> {
  const {access, refresh} = await getAuthCookies();

  if (!access) {
    throw new ApiError('نیاز به ورود مجدد دارید.', 401);
  }

  try {
    return await fn(access);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !refresh) {
      throw error;
    }

    try {
      const refreshResult = await backendFetch<{access?: string; refresh?: string}>('/refresh/', {
        base: 'auth',
        method: 'POST',
        body: JSON.stringify({refresh})
      });

      if (!refreshResult?.access) {
        throw new ApiError('توکن جدید دریافت نشد.', 401);
      }

      await setAuthCookies({access: refreshResult.access, refresh: refreshResult.refresh});
      return await fn(refreshResult.access);
    } catch {
      await clearAuthCookies();
      throw new ApiError('نیاز به ورود مجدد دارید.', 401);
    }
  }
}
