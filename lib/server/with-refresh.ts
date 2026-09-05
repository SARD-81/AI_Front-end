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
    throw new ApiError('توکن جدید دریافت نشد.', 401, 'REFRESH_ACCESS_MISSING');
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

function isRefreshAuthenticationFailure(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

async function clearAndRequireLogin(): Promise<never> {
  await clearAuthCookies();
  throw new ApiError('نیاز به ورود مجدد دارید.', 401, 'SESSION_EXPIRED');
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
      // The access token is stale. Only this case enters the refresh flow.
    }
  }

  if (!refresh) {
    throw new ApiError('نیاز به ورود مجدد دارید.', 401, 'SESSION_EXPIRED');
  }

  let tokens: RefreshedTokens;
  try {
    tokens = await getRefreshedTokens(refresh);
  } catch (error) {
    // Invalid/expired refresh credentials end the session. Transient failures
    // such as 429/5xx/network errors must retain their original semantics and
    // must not silently log the user out.
    if (isRefreshAuthenticationFailure(error)) {
      return clearAndRequireLogin();
    }
    throw error;
  }

  await setAuthCookies(tokens);

  try {
    // Keep this retry outside the refresh catch above. A valid refreshed
    // session can still receive a legitimate endpoint error such as 429, 403,
    // 404 or 503; those errors belong to the endpoint and must be propagated.
    return await fn(tokens.access);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return clearAndRequireLogin();
    }
    throw error;
  }
}
