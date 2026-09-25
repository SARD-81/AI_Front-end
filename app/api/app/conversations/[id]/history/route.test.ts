import {beforeEach, afterEach, expect, it, vi} from 'vitest';
const backend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/backend-fetch', () => ({
  backendFetch: backend,
  BACKEND_HISTORY_TIMEOUT_MS: 20_000
}));
vi.mock('@/lib/server/with-refresh', () => ({callWithAutoRefresh: (callback: (token: string) => Promise<unknown>) => callback('session-token')}));
import {GET} from './route';
beforeEach(() => {backend.mockReset(); vi.stubEnv('CHAT_HISTORY_MODE', 'latest-first');});
afterEach(() => vi.unstubAllEnvs());
it('forwards ownership authentication and native paging through a fixed backend path', async () => {
  backend.mockResolvedValue({results: [], next: null});
  const request = new Request('https://app.test/api/app/conversations/chat/history');
  const response = await GET(request, {params: Promise.resolve({id: 'chat'})});
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({results: [], olderCursor: null});
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(backend).toHaveBeenCalledWith('/conversations/chat/messages/?page_size=10&ordering=-created_at', expect.objectContaining({accessToken: 'session-token', signal: request.signal, method: 'GET'}));
});
