// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { afterEach, expect, it, vi } from 'vitest';
import { SourcesDialog } from './SourcesDialog';
import fa from '@/messages/fa.json';
import en from '@/messages/en.json';
afterEach(cleanup);
it.each(['fa', 'en'])(
  'supports search, grouped excerpts and keyboard close in %s',
  (locale) => {
    const messages = locale === 'fa' ? fa : en;
    const close = vi.fn();
    render(
      <NextIntlClientProvider
        locale={locale}
        messages={messages as unknown as AbstractIntlMessages}
        timeZone="UTC"
      >
        <SourcesDialog
          open
          onOpenChange={close}
          resources={[
            { documentId: 'one', documentName: 'ثبت نام', content: 'بخش اول' },
            { documentId: 'one', documentName: 'ثبت نام', content: 'بخش دوم' },
            { documentId: 'two', documentName: 'تقویم', content: 'زمان امتحان' }
          ]}
        />
      </NextIntlClientProvider>
    );
    expect(screen.getAllByRole('article')).toHaveLength(2);
    const search = screen.getByRole('textbox', {
      name: messages.app.sources.search
    });
    fireEvent.change(search, { target: { value: 'بخش دوم' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    const details = screen
      .getByText(messages.app.sources.readExcerpts)
      .closest('details')!;
    expect(details.querySelectorAll('section')).toHaveLength(2);
    fireEvent.change(search, { target: { value: 'missing' } });
    expect(screen.getByText(messages.app.sources.noResults)).toBeTruthy();
    fireEvent.change(search, { target: { value: '' } });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(close).toHaveBeenCalledWith(false);
  }
);
