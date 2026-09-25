// @vitest-environment jsdom

import React from 'react';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {NextIntlClientProvider, type AbstractIntlMessages} from 'next-intl';
import {afterEach, describe, expect, it, vi} from 'vitest';
import fa from '@/messages/fa.json';
import {Composer} from './Composer';

function renderComposer(props: Partial<React.ComponentProps<typeof Composer>> = {}) {
  return render(
    <NextIntlClientProvider locale="fa" messages={fa as unknown as AbstractIntlMessages}>
      <Composer
        value="سلام"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        thinkLevel="low"
        onThinkLevelChange={vi.fn()}
        webSearchOn={false}
        onWebSearchChange={vi.fn()}
        {...props}
      />
    </NextIntlClientProvider>
  );
}

function desktop() {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null
  }));
}

function mobile() {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null
  }));
}

describe('composer focus and web search hint', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not focus the textarea when the chat first opens', () => {
    desktop();
    renderComposer({focusTrigger: 0});
    expect(document.activeElement).not.toBe(screen.getByRole('textbox'));
  });

  it('does not open the mobile keyboard for an explicit focus request', () => {
    mobile();
    renderComposer({autoFocus: true});
    expect(document.activeElement).not.toBe(screen.getByRole('textbox'));
  });

  it('returns desktop focus after send by Enter when the user stayed in the composer', () => {
    desktop();
    const onSubmit = vi.fn();
    const view = renderComposer({onSubmit});
    const box = screen.getByRole('textbox');
    box.focus();
    fireEvent.keyDown(box, {key: 'Enter'});
    expect(onSubmit).toHaveBeenCalledOnce();
    view.rerender(
      <NextIntlClientProvider locale="fa" messages={fa as unknown as AbstractIntlMessages}>
        <Composer value="" onChange={vi.fn()} onSubmit={onSubmit} thinkLevel="low" onThinkLevelChange={vi.fn()} webSearchOn={false} onWebSearchChange={vi.fn()} disabled />
      </NextIntlClientProvider>
    );
    view.rerender(
      <NextIntlClientProvider locale="fa" messages={fa as unknown as AbstractIntlMessages}>
        <Composer value="" onChange={vi.fn()} onSubmit={onSubmit} thinkLevel="low" onThinkLevelChange={vi.fn()} webSearchOn={false} onWebSearchChange={vi.fn()} />
      </NextIntlClientProvider>
    );
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  function cycleSend(view: ReturnType<typeof renderComposer>, onSubmit: () => void, mobileView = false) {
    const box = screen.getByRole('textbox');
    const send = screen.getByRole('button', {name: 'ارسال'});
    if (!mobileView) box.focus();
    fireEvent.click(send);
    expect(onSubmit).toHaveBeenCalledOnce();
    const frame = (disabled: boolean) => (
      <NextIntlClientProvider locale="fa" messages={fa as unknown as AbstractIntlMessages}>
        <Composer
          value=""
          onChange={vi.fn()}
          onSubmit={onSubmit}
          onStop={vi.fn()}
          thinkLevel="low"
          onThinkLevelChange={vi.fn()}
          webSearchOn={false}
          onWebSearchChange={vi.fn()}
          disabled={disabled}
          isSending={disabled}
        />
      </NextIntlClientProvider>
    );
    view.rerender(frame(true));
    expect(screen.getByRole('button', {name: 'توقف تولید پاسخ'})).toBeTruthy();
    if (!mobileView) fireEvent.blur(screen.getByRole('textbox'));
    view.rerender(frame(false));
    const textarea = screen.getByRole('textbox');
    if (mobileView) expect(document.activeElement).not.toBe(textarea);
    else expect(document.activeElement).toBe(textarea);
  }

  it('restores desktop focus after a real click send, pending state, and reply end', () => {
    desktop();
    const onSubmit = vi.fn();
    cycleSend(renderComposer({onSubmit}), onSubmit);
  });

  it('does not reopen the mobile keyboard after click send ends', () => {
    mobile();
    const onSubmit = vi.fn();
    cycleSend(renderComposer({onSubmit}), onSubmit, true);
  });

  it('does not steal focus when the user left the composer during the pending reply', () => {
    desktop();
    const onSubmit = vi.fn();
    const view = renderComposer({onSubmit});
    const box = screen.getByRole('textbox');
    const outside = document.createElement('button');
    outside.textContent = 'elsewhere';
    document.body.append(outside);
    box.focus();
    fireEvent.click(screen.getByRole('button', {name: 'ارسال'}));
    view.rerender(
      <NextIntlClientProvider locale="fa" messages={fa as unknown as AbstractIntlMessages}>
        <Composer value="" onChange={vi.fn()} onSubmit={onSubmit} onStop={vi.fn()} thinkLevel="low" onThinkLevelChange={vi.fn()} webSearchOn={false} onWebSearchChange={vi.fn()} disabled isSending />
      </NextIntlClientProvider>
    );
    const pendingBox = screen.getByRole('textbox');
    fireEvent.blur(pendingBox, {relatedTarget: outside});
    outside.focus();
    view.rerender(
      <NextIntlClientProvider locale="fa" messages={fa as unknown as AbstractIntlMessages}>
        <Composer value="" onChange={vi.fn()} onSubmit={onSubmit} thinkLevel="low" onThinkLevelChange={vi.fn()} webSearchOn={false} onWebSearchChange={vi.fn()} />
      </NextIntlClientProvider>
    );
    expect(document.activeElement).toBe(outside);
  });

  it('shows the web-search hint to assistive technology', () => {
    desktop();
    renderComposer();
    const toggle = screen.getByRole('button', {name: /جستجوی وب/});
    expect(toggle.getAttribute('aria-describedby')).toBe('web-search-hint');
    expect(document.getElementById('web-search-hint')?.textContent).toContain('همراه پیام ارسال می‌شود');
    expect(toggle.className).not.toContain('sr-only');
  });
});
