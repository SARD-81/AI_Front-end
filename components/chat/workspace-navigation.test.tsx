// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationsPanel } from '@/components/sidebar/ConversationsPanel';
import { ServicesRail } from '@/components/sidebar/ServicesRail';
import { ChatShell } from './ChatShell';
import fa from '@/messages/fa.json';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => '/fa/chat',
  useSearchParams: () => new URLSearchParams()
}));

vi.mock('@/lib/services/auth-service', () => ({
  getMe: vi.fn().mockResolvedValue({ user: { fullName: 'کاربر آزمایشی' } }),
  logout: vi.fn()
}));

vi.mock('@/lib/services/chat-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/chat-service')>();
  return {
    ...actual,
    listConversations: vi.fn().mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'گفتگوی خیلی طولانی دربارهٔ انتخاب واحد و زمان‌بندی کلاس‌های دانشکده',
        updatedAt: new Date().toISOString()
      }
    ]),
    getConversationWindow: vi.fn().mockResolvedValue({
      id: 'existing',
      title: 'گفتگو',
      messages: []
    }),
    sendMessageWithWebSocket: vi.fn()
  };
});

function renderWorkspace(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider
        locale="fa"
        messages={fa as unknown as AbstractIntlMessages}
        timeZone="Asia/Tehran"
      >
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: /max-width:\s*(767|1279)px/.test(query),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('chat workspace navigation', () => {
  it('keeps conversation actions out of the services column and denies management sections', () => {
    renderWorkspace(
      <ServicesRail
        locale="fa"
        collapsed={false}
        mobileOpen
        onClose={vi.fn()}
        onToggleCollapsed={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'گفت‌وگوی جدید' })).toBeNull();
    expect(screen.queryByRole('link', { name: /admin/i })).toBeNull();

    const memory = screen.getByRole('button', { name: 'مدیریت حافظه — به‌زودی' });
    expect(memory.getAttribute('aria-disabled')).toBe('true');
    expect(memory.getAttribute('title')).toBe('به‌زودی');
    fireEvent.click(memory);
    expect(screen.queryByText('دسترسی محدود')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'مدیریت اسناد' }));
    expect(
      screen.getByText('حساب کاربری شما دسترسی به مدیریت اسناد را ندارد.')
    ).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('opens one mobile panel at a time and keeps a single composer', () => {
    renderWorkspace(<ChatShell locale="fa" />);

    fireEvent.click(screen.getByRole('button', { name: 'باز کردن گفتگوها' }));
    expect(screen.getByRole('button', { name: 'گفت‌وگوی جدید' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'باز کردن خدمات' }));
    expect(document.getElementById('conversations-panel')?.getAttribute('aria-hidden')).toBe(
      'true'
    );
    expect(document.getElementById('services-panel')?.getAttribute('aria-hidden')).toBe(
      'false'
    );
    expect(screen.getAllByRole('textbox')).toHaveLength(1);

    const composer = screen.getByRole('textbox');
    fireEvent.change(composer, { target: { value: 'پیش‌نویس' } });
    expect((composer as HTMLTextAreaElement).value).toBe('پیش‌نویس');
  });

  it('shows grouped history, rename and delete without leaving the conversation panel', async () => {
    renderWorkspace(
      <ConversationsPanel
        locale="fa"
        mobileOpen
        desktopOpen
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByText('امروز')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'گفت‌وگوی جدید' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'گزینه‌های گفتگو' }));
    expect(screen.getByText('تغییر نام')).toBeTruthy();
    expect(screen.getByText('حذف')).toBeTruthy();
  });
});
