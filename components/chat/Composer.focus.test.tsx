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
        {...props}
      />
    </NextIntlClientProvider>
  );
}

function desktop() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

function mobile() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: /max-width:\s*767px|pointer:\s*coarse/.test(query),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

describe('composer focus and web search hint', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('does not focus the textarea when the chat first opens', () => {
    desktop();
    renderComposer();
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
        <Composer value="" onChange={vi.fn()} onSubmit={onSubmit} thinkLevel="low" onThinkLevelChange={vi.fn()} disabled />
      </NextIntlClientProvider>
    );
    view.rerender(
      <NextIntlClientProvider locale="fa" messages={fa as unknown as AbstractIntlMessages}>
        <Composer value="" onChange={vi.fn()} onSubmit={onSubmit} thinkLevel="low" onThinkLevelChange={vi.fn()} />
      </NextIntlClientProvider>
    );
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('does not steal focus after a click-send if the user moved to another control', () => {
    desktop();
    renderComposer();
    const box = screen.getByRole('textbox');
    const outside = document.createElement('button');
    document.body.append(outside);
    box.focus();
    fireEvent.blur(box, {relatedTarget: outside});
    outside.focus();
    expect(document.activeElement).toBe(outside);
  });

  it('shows the web-search hint to assistive technology without a payload field', () => {
    desktop();
    renderComposer();
    const toggle = screen.getByRole('button', {name: /جستجوی وب/});
    expect(toggle.getAttribute('aria-describedby')).toBe('web-search-hint');
    expect(document.getElementById('web-search-hint')?.textContent).toContain('به پاسخ وصل نیست');
    expect(toggle.className).not.toContain('sr-only');
  });
});
