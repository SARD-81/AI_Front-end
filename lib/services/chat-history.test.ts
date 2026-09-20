import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({
  apiFetch,
  ApiError: class extends Error {},
  getApiBaseUrl: () => ''
}));
import { getConversation, getConversationWindow } from './chat-service';

const message = (id: string) => ({
  id,
  role: 'user',
  content: id,
  created_at: '2026-09-19T09:00:00Z'
});
beforeEach(() => {
  apiFetch.mockReset();
});

describe('complete conversation history', () => {
  it('includes recent exchanges on later cursor pages, without duplicating overlapping IDs', async () => {
    apiFetch.mockImplementation(async (url: string) => {
      if (!url.includes('/messages')) return { id: 'chat', title: 'History' };
      if (url.includes('cursor='))
        return { nextCursor: null, results: [message('old'), message('new')] };
      return { nextCursor: 'next/page==', results: [message('old')] };
    });
    const result = await getConversation('chat');
    expect(result.messages.map((m) => m.id)).toEqual(['old', 'new']);
    expect(
      apiFetch.mock.calls.some(([url]) =>
        url.includes('cursor=next%2Fpage%3D%3D')
      )
    ).toBe(true);
  });

  it('rejects a failed later page instead of returning a truncated successful snapshot', async () => {
    apiFetch.mockImplementation(async (url: string) => {
      if (!url.includes('/messages')) return { id: 'chat' };
      if (url.includes('cursor=')) throw new Error('page failed');
      return { nextCursor: 'next', results: [message('old')] };
    });
    await expect(getConversation('chat')).rejects.toThrow('page failed');
  });

  it('rejects repeated cursors instead of looping forever', async () => {
    apiFetch.mockImplementation(async (url: string) =>
      url.includes('/messages')
        ? { nextCursor: 'loop', results: [message('old')] }
        : { id: 'chat' }
    );
    await expect(getConversation('chat')).rejects.toThrow(
      'Repeated message cursor'
    );
  });
  it('passes cancellation to history requests and stops following cursors', async () => {
    const controller = new AbortController();
    apiFetch.mockImplementation(
      async (url: string, opts: { signal?: AbortSignal }) => {
        expect(opts.signal).toBe(controller.signal);
        if (!url.includes('/messages')) return { id: 'chat' };
        controller.abort();
        return { nextCursor: 'next', results: [message('old')] };
      }
    );
    await expect(
      getConversation('chat', { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});


it('loads just one ten-message history window and metadata on initial open', async () => {
  apiFetch.mockImplementation(async (url: string) => url.endsWith('/history')
    ? {results: Array.from({length: 10}, (_, i) => message(String(i))), olderCursor: 'older'}
    : {id: 'chat', title: 'Conversation'});
  const result = await getConversationWindow('chat');
  expect(result.messages).toHaveLength(10);
  expect(result.olderCursor).toBe('older');
  expect(apiFetch).toHaveBeenCalledTimes(2);
  expect(apiFetch.mock.calls.some(([url]) => url.includes('/messages'))).toBe(false);
});
