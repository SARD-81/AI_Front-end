// @vitest-environment jsdom
import React from 'react';
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { useOlderMessages } from './use-chat-data';
import { getHistoryPage } from '@/lib/services/chat-service';
import type { ChatDetail } from '@/lib/api/chat';
vi.mock('@/lib/services/chat-service', async (original) => ({
  ...(await original<typeof import('@/lib/services/chat-service')>()),
  getHistoryPage: vi.fn()
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const message = (id: string) => ({
  id,
  role: 'user' as const,
  content: id,
  createdAt: ''
});
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 3 } }
  });
  client.setQueryData(['chat', 'c'], {
    id: 'c',
    title: '',
    messages: [message('10')],
    olderCursor: 'cursor'
  });
  const hook = renderHook(() => useOlderMessages('c'), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
  });
  return { client, ...hook };
}
it('deduplicates concurrent page loads and keeps a new message appended while loading', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof getHistoryPage>>) => void;
  vi.mocked(getHistoryPage).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    })
  );
  const { client, result } = setup();
  let first!: Promise<void>, second!: Promise<void>;
  act(() => {
    first = result.current.mutateAsync();
    second = result.current.mutateAsync();
  });
  await waitFor(() => expect(getHistoryPage).toHaveBeenCalledTimes(1));
  client.setQueryData<ChatDetail>(['chat', 'c'], (current) => ({
    ...current!,
    messages: [...current!.messages, message('new')]
  }));
  await act(async () => {
    resolve({ messages: [message('9'), message('10')], olderCursor: null });
    await Promise.all([first, second]);
  });
  const data = client.getQueryData<ChatDetail>(['chat', 'c'])!;
  expect(data.messages.map((m) => m.id)).toEqual(['9', '10', 'new']);
  expect(data.historyStartIndex).toBe(999999);
});
it('keeps cached messages after a page failure without automatic retries', async () => {
  vi.mocked(getHistoryPage).mockRejectedValue(new Error('offline'));
  const { client, result } = setup();
  await act(async () => {
    await expect(result.current.mutateAsync()).rejects.toThrow('offline');
  });
  expect(getHistoryPage).toHaveBeenCalledTimes(1);
  expect(client.getQueryData<ChatDetail>(['chat', 'c'])?.messages).toEqual([
    message('10')
  ]);
});
