// @vitest-environment jsdom

import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatShell } from './ChatShell';
import {
  createConversation,
  getConversationWindow,
  sendMessageWithWebSocket
} from '@/lib/services/chat-service';
import type { ChatMessage } from '@/lib/api/chat';
import fa from '@/messages/fa.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams()
}));
vi.mock('@/components/sidebar/ServicesRail', () => ({
  ServicesRail: () => null
}));
vi.mock('@/components/sidebar/ConversationsPanel', () => ({
  ConversationsPanel: () => null
}));
vi.mock('./MessageList', () => ({
  MessageList: ({
    messages,
    onRestoreMessage,
    onRegenerate
  }: {
    messages: ChatMessage[];
    onRestoreMessage: (message: ChatMessage) => void;
    onRegenerate: (message: ChatMessage) => void;
  }) => (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <p>{message.content}</p>
          {message.sendStatus === 'failed' && (
            <>
              <button onClick={() => onRestoreMessage(message)}>Restore</button>
            </>
          )}
          {message.role === 'assistant' && (
            <button onClick={() => onRegenerate(message)}>Regenerate</button>
          )}
        </div>
      ))}
    </div>
  )
}));
vi.mock('@/lib/services/chat-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/services/chat-service')>()),
  createConversation: vi.fn(),
  getConversationWindow: vi.fn(),
  sendMessageWithWebSocket: vi.fn()
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(chatId?: string, messages: ChatMessage[] = []) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: 3, retryDelay: 0 }
    }
  });
  if (chatId)
    client.setQueryData(['chat', chatId], {
      id: chatId,
      title: 'Test',
      messages
    });
  // Observe real invalidation behavior; mocking it hid post-send cache loss.
  vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider
        locale="fa"
        messages={fa as unknown as AbstractIntlMessages}
        timeZone="Asia/Tehran"
      >
        <ChatShell locale="fa" chatId={chatId} />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
  return client;
}

const answer: ChatMessage = {
  id: 'answer',
  role: 'assistant',
  createdAt: '2026-09-14T08:00:00Z',
  content: 'پاسخ کوتاه'
};
const question: ChatMessage = {
  id: 'question',
  role: 'user',
  createdAt: '2026-09-14T08:00:00Z',
  content: 'سؤال قبلی'
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getConversationWindow).mockResolvedValue({
    id: 'existing',
    title: 'Test',
    messages: []
  });
  window.localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('chat composer submission lifecycle', () => {
  it('keeps the committed question and answer without replacing them with a post-send snapshot', async () => {
    vi.mocked(sendMessageWithWebSocket).mockResolvedValue(answer);
    const client = setup('existing');
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'سؤال جدید' }
    });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    await waitFor(() =>
      expect(
        (screen.getByRole('textbox') as HTMLTextAreaElement).disabled
      ).toBe(false)
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('سؤال جدید')).toBeTruthy();
    expect(screen.getByText(answer.content)).toBeTruthy();
    expect(getConversationWindow).not.toHaveBeenCalled();
    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['chats']
    });
  });

  it('does not let a read started before sending overwrite a completed exchange', async () => {
    const read = deferred<Awaited<ReturnType<typeof getConversationWindow>>>();
    vi.mocked(getConversationWindow).mockReturnValue(read.promise);
    vi.mocked(sendMessageWithWebSocket).mockResolvedValue(answer);
    const client = setup('existing');
    let reading!: Promise<void>;
    await act(async () => {
      reading = client.refetchQueries({ queryKey: ['chat', 'existing'] });
    });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'سؤال تازه' }
    });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    await waitFor(() => expect(screen.getByText(answer.content)).toBeTruthy());
    await act(async () => {
      read.resolve({ id: 'existing', title: 'Test', messages: [] });
      await reading;
    });
    expect(screen.getByText('سؤال تازه')).toBeTruthy();
    expect(screen.getByText(answer.content)).toBeTruthy();
  });

  it.each([true, false])(
    'keeps the exchange when a mid-send read finishes before commit: %s',
    async (readFirst) => {
      const read = deferred<Awaited<ReturnType<typeof getConversationWindow>>>();
      const response = deferred<ChatMessage>();
      vi.mocked(getConversationWindow).mockReturnValue(read.promise);
      vi.mocked(sendMessageWithWebSocket).mockReturnValue(response.promise);
      const client = setup('existing');
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'سؤال همزمان' }
      });
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      await waitFor(() =>
        expect(sendMessageWithWebSocket).toHaveBeenCalledOnce()
      );
      let reading!: Promise<void>;
      await act(async () => {
        reading = client.refetchQueries({ queryKey: ['chat', 'existing'] });
      });
      if (readFirst)
        await act(async () => {
          read.resolve({ id: 'existing', title: 'Test', messages: [] });
          await reading;
        });
      await act(async () => {
        response.resolve(answer);
      });
      await waitFor(() =>
        expect(screen.getByText(answer.content)).toBeTruthy()
      );
      if (!readFirst)
        await act(async () => {
          read.resolve({ id: 'existing', title: 'Test', messages: [] });
          await reading;
        });
      expect(screen.getByText('سؤال همزمان')).toBeTruthy();
      expect(screen.getByText(answer.content)).toBeTruthy();
    }
  );

  it('clears immediately while the response is pending and preserves the selected thinking level', async () => {
    window.localStorage.setItem('soha:chat:thinking-level', 'high');
    const response = deferred<ChatMessage>();
    vi.mocked(sendMessageWithWebSocket).mockReturnValue(response.promise);
    setup('existing');
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'سؤال جدید' }
    });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
    await waitFor(() =>
      expect(sendMessageWithWebSocket).toHaveBeenCalledWith(
        'existing',
        expect.objectContaining({ content: 'سؤال جدید', thinkLevel: 'high' }),
        expect.any(Object)
      )
    );
    await act(async () => response.resolve(answer));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  });

  it('clears before lazy creation finishes and restores the question if creation fails', async () => {
    const creation = deferred<Awaited<ReturnType<typeof createConversation>>>();
    vi.mocked(createConversation).mockReturnValue(creation.promise);
    setup();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'سؤال اول' }
    });
    fireEvent.click(screen.getByRole('button', { name: fa.app.send }));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
    await act(async () => creation.reject(new Error('creation failed')));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
      'سؤال اول'
    );
    expect(sendMessageWithWebSocket).not.toHaveBeenCalled();
  });

  it('keeps a failed send recoverable using Restore', async () => {
    vi.mocked(sendMessageWithWebSocket).mockRejectedValue(
      new Error('send failed')
    );
    setup('existing');
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'سؤال ناموفق' }
    });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    const restore = await screen.findByRole('button', { name: 'Restore' });
    expect(sendMessageWithWebSocket).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    fireEvent.click(restore);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
      'سؤال ناموفق'
    );
  });

  it('creates a conversation only when a suggested prompt is submitted', async () => {
    const response = deferred<ChatMessage>();
    vi.mocked(createConversation).mockResolvedValue({
      id: 'created',
      title: 'New',
      updatedAt: '2026-09-14T08:00:00Z'
    });
    vi.mocked(sendMessageWithWebSocket).mockReturnValue(response.promise);
    setup();
    expect(createConversation).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', {
        name: fa.app.emptyState.suggestedPrompts[0]
      })
    );
    await waitFor(() =>
      expect(sendMessageWithWebSocket).toHaveBeenCalledWith(
        'created',
        expect.objectContaining({
          content: fa.app.emptyState.suggestedPrompts[0]
        }),
        expect.any(Object)
      )
    );
    expect(createConversation).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
    await act(async () => response.resolve(answer));
  });

  it('aborts the pending request without restoring the submitted text or showing retry', async () => {
    const response = deferred<ChatMessage>();
    vi.mocked(sendMessageWithWebSocket).mockImplementation(
      (_id, _payload, options) => {
        options?.signal?.addEventListener(
          'abort',
          () => response.reject(new Error('aborted')),
          { once: true }
        );
        return response.promise;
      }
    );
    setup('existing');
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'سؤال قابل توقف' }
    });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('button', { name: fa.app.stop }));
    await waitFor(() =>
      expect(
        (screen.getByRole('textbox') as HTMLTextAreaElement).disabled
      ).toBe(false)
    );
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('does not erase an unrelated draft on regenerate', async () => {
    const response = deferred<ChatMessage>();
    vi.mocked(sendMessageWithWebSocket).mockReturnValue(response.promise);
    setup('existing', [question, answer]);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'پیش‌نویس بعدی' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    await act(async () => response.resolve(answer));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
      'پیش‌نویس بعدی'
    );
  });

  it('ignores blank submissions and Shift+Enter', () => {
    setup();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
      '   '
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'سؤال' }
    });
    fireEvent.keyDown(screen.getByRole('textbox'), {
      key: 'Enter',
      shiftKey: true
    });
    expect(createConversation).not.toHaveBeenCalled();
    expect(sendMessageWithWebSocket).not.toHaveBeenCalled();
  });
});
