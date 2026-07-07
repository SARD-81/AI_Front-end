import 'server-only';
import {getAuthCookies, setAuthCookies, clearAuthCookies} from '@/lib/server/auth-cookies';
import {backendFetch} from '@/lib/server/backend-fetch';
import {ApiError} from '@/lib/server/backend-types';

type RefreshedTokens = {access: string; refresh?: string};

// Deduplicate concurrent refresh calls per refresh token so that several
// parallel requests hitting a 401 at the same time trigger only a single
// refresh round-trip instead of racing each other (which can invalidate
// rotated refresh tokens).
const inflightRefreshes = new Map<string, Promise<RefreshedTokens>>();

async function requestNewTokens(refresh: string): Promise<RefreshedTokens> {
  const refreshResult = await backendFetch<{access?: string; refresh?: string}>('/refresh/', {
    base: 'auth',
    method: 'POST',
    body: JSON.stringify({refresh})
  });

  if (!refreshResult?.access) {
    throw new ApiError('توکن جدید دریافت نشد.', 401);
  }

  return {access: refreshResult.access, refresh: refreshResult.refresh};
}

function getRefreshedTokens(refresh: string): Promise<RefreshedTokens> {
  const existing = inflightRefreshes.get(refresh);
  if (existing) return existing;

  const promise = requestNewTokens(refresh).finally(() => {
    inflightRefreshes.delete(refresh);
  });
  inflightRefreshes.set(refresh, promise);
  return promise;
}

export async function callWithAutoRefresh<T>(fn: (accessToken: string) => Promise<T>): Promise<T> {
  const {access, refresh} = await getAuthCookies();

  if (access) {
    try {
      return await fn(access);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
      // Fall through to the refresh flow below.
    }
  }

  if (!refresh) {
    throw new ApiError('نیاز به ورود مجدد دارید.', 401);
  }

  try {
    const tokens = await getRefreshedTokens(refresh);
    await setAuthCookies(tokens);
    return await fn(tokens.access);
  } catch {
    await clearAuthCookies();
    throw new ApiError('نیاز به ورود مجدد دارید.', 401);
  }
}
