// @vitest-environment jsdom

import React, { forwardRef, useImperativeHandle } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { ChatEmptyState } from './ChatEmptyState';
import fa from '@/messages/fa.json';
import en from '@/messages/en.json';
import type { ChatMessage } from '@/lib/api/chat';

// jsdom has no layout engine. Render every virtual row for content assertions;
// Actual row geometry requires separate browser verification.
vi.mock('react-virtuoso', () => ({
  Virtuoso: forwardRef(function TestList(
    {
      data,
      itemContent
    }: {
      data: { id: string }[];
      itemContent: (index: number, item: { id: string }) => React.ReactNode;
    },
    ref
  ) {
    useImperativeHandle(ref, () => ({ scrollToIndex: vi.fn() }));
    return (
      <div>
        {data.map((item, index) => (
          <div key={item.id}>{itemContent(index, item)}</div>
        ))}
      </div>
    );
  })
}));
vi.mock('./UserMessageRail', () => ({ UserMessageRail: () => null }));

beforeEach(() => {
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function Providers({
  children,
  locale = 'fa'
}: {
  children: React.ReactNode;
  locale?: string;
}) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <NextIntlClientProvider
        locale={locale}
        messages={
          (locale === 'fa' ? fa : en) as unknown as AbstractIntlMessages
        }
        timeZone="Asia/Tehran"
      >
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
const composerProps = {
  onChange: vi.fn(),
  onSubmit: vi.fn(),
  thinkLevel: 'low' as const,
  onThinkLevelChange: vi.fn()
};
const listProps = {
  onCopyMessage: vi.fn(),
  onEditMessage: vi.fn(),
  onRegenerate: vi.fn(),
  onRestoreMessage: vi.fn()
};

describe('chat presentation', () => {
  it('advances one pending status at 1, 2 and 3 minutes and resets for the next request', async () => {
    vi.useFakeTimers();
    const messages: ChatMessage[] = [
      {
        id: 'waiting',
        role: 'user',
        content: 'سؤال',
        createdAt: '2026-09-14T08:00:00Z',
        sendStatus: 'pending'
      }
    ];
    const view = render(
      <Providers>
        <MessageList {...listProps} messages={messages} typing />
      </Providers>
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_000);
    });
    expect(
      screen.queryByText(fa.app.message.pendingStatus.oneMinute)
    ).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(
      screen.getByText(fa.app.message.pendingStatus.oneMinute)
    ).toBeTruthy();
    view.rerender(
      <Providers>
        <MessageList {...listProps} messages={[...messages]} typing />
      </Providers>
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(
      screen.getByText(fa.app.message.pendingStatus.twoMinutes)
    ).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(
      screen.getByText(fa.app.message.pendingStatus.threeMinutes)
    ).toBeTruthy();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    view.rerender(
      <Providers>
        <MessageList {...listProps} messages={messages} typing={false} />
      </Providers>
    );
    expect(screen.queryByRole('status')).toBeNull();
    view.rerender(
      <Providers>
        <MessageList {...listProps} messages={messages} typing />
      </Providers>
    );
    expect(
      screen.queryByText(fa.app.message.pendingStatus.threeMinutes)
    ).toBeNull();
  });
  it.each([
    ['fa', 'rtl'],
    ['en', 'ltr']
  ])(
    'starts an empty %s composer in %s and detects typed content',
    (locale, direction) => {
      const view = render(
        <Providers locale={locale}>
          <Composer {...composerProps} value="" />
        </Providers>
      );
      expect(screen.getByRole('textbox').getAttribute('dir')).toBe(direction);
      expect(
        (screen.getByRole('textbox') as HTMLTextAreaElement).style.unicodeBidi
      ).toBe('normal');
      view.rerender(
        <Providers locale={locale}>
          <Composer {...composerProps} value="Hello سلام" />
        </Providers>
      );
      expect(screen.getByRole('textbox').getAttribute('dir')).toBe('auto');
      view.rerender(
        <Providers locale={locale}>
          <Composer {...composerProps} value="" />
        </Providers>
      );
      expect(screen.getByRole('textbox').getAttribute('dir')).toBe(direction);
    }
  );

  it('shows one stable pending status and no actions on the pending user message', () => {
    const messages: ChatMessage[] = [
      {
        id: 'user',
        role: 'user',
        createdAt: '2026-09-14T08:00:00Z',
        content: 'سؤال',
        sendStatus: 'pending'
      }
    ];
    const view = render(
      <Providers>
        <MessageList {...listProps} messages={messages} typing />
      </Providers>
    );
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByText(fa.app.message.pending)).toBeNull();
    expect(
      screen.queryByRole('button', { name: fa.app.messageActions.edit })
    ).toBeNull();
    const status = screen.getByRole('status').textContent;
    view.rerender(
      <Providers>
        <MessageList {...listProps} messages={[...messages]} typing />
      </Providers>
    );
    expect(screen.getByRole('status').textContent).toBe(status);
    view.rerender(
      <Providers>
        <MessageList
          {...listProps}
          messages={[
            ...messages,
            {
              id: 'streaming',
              role: 'assistant',
              createdAt: '2026-09-14T08:00:00Z',
              content: 'پاسخ'
            }
          ]}
          typing={false}
        />
      </Providers>
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps restore available without a retry control for a failed question', () => {
    render(
      <Providers>
        <MessageList
          {...listProps}
          messages={[
            {
              id: 'user',
              role: 'user',
              createdAt: '2026-09-14T08:00:00Z',
              content: 'سؤال',
              sendStatus: 'failed'
            }
          ]}
          typing={false}
        />
      </Providers>
    );
    expect(
      screen.queryByRole('button', { name: fa.app.chat.retryFailed })
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: fa.app.chat.restoreToInput })
    ).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it.each(['fa', 'en'])(
    'removes friendly-chat wording from the %s empty state',
    (locale) => {
      render(
        <Providers locale={locale}>
          <ChatEmptyState
            {...composerProps}
            value=""
            onPromptSelect={vi.fn()}
          />
        </Providers>
      );
      expect(screen.queryByText(/گفتگوی دوستانه|friendly chat/)).toBeNull();
      expect(screen.getByRole('img')).toBeTruthy();
    }
  );
});
