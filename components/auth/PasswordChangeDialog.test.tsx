// @vitest-environment jsdom

import React from 'react';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {NextIntlClientProvider, type AbstractIntlMessages} from 'next-intl';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import fa from '@/messages/fa.json';
import {ServiceError} from '@/lib/services/auth-service';
import {PasswordChangeDialog} from './PasswordChangeDialog';

const changeAccountPassword = vi.hoisted(() => vi.fn());
const closeActiveChatSockets = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());

vi.mock('@/lib/services/auth-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/auth-service')>('@/lib/services/auth-service');
  return {...actual, changeAccountPassword};
});

vi.mock('@/lib/services/chat-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/chat-service')>('@/lib/services/chat-service');
  return {...actual, closeActiveChatSockets};
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({replace})
}));

function renderDialog() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="fa" messages={fa as unknown as AbstractIntlMessages}>
        <PasswordChangeDialog open onOpenChange={vi.fn()} locale="fa" />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function fill() {
  fireEvent.change(screen.getByLabelText('رمز فعلی'), {target: {value: 'old-secret'}});
  fireEvent.change(screen.getByLabelText('رمز جدید'), {target: {value: 'new-secret'}});
  fireEvent.change(screen.getByLabelText('تکرار رمز جدید'), {target: {value: 'new-secret'}});
}

describe('password change form', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    changeAccountPassword.mockReset();
    closeActiveChatSockets.mockReset();
    replace.mockReset();
  });

  it('clears the session after password_changed', async () => {
    changeAccountPassword.mockResolvedValue({status: 'password_changed'});
    renderDialog();
    fill();
    fireEvent.click(screen.getByRole('button', {name: 'ثبت رمز جدید'}));
    expect(await screen.findByRole('button', {name: 'ثبت رمز جدید'})).toBeTruthy();
    expect(changeAccountPassword).toHaveBeenCalledWith({
      currentPassword: 'old-secret',
      newPassword: 'new-secret'
    });
    expect(closeActiveChatSockets).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith('/fa/auth?mode=login');
  });

  it('keeps the typed passwords beside contract field errors', async () => {
    changeAccountPassword
      .mockRejectedValueOnce(new ServiceError('رمز فعلی نادرست است.', 400, 'invalid_current_password'))
      .mockRejectedValueOnce(new ServiceError('ضعیف', 400, 'invalid_password', null, undefined, ['حداقل طول رعایت نشده.', 'رمز رایج است.']))
      .mockRejectedValueOnce(new ServiceError('همان رمز', 400, 'password_unchanged'));
    renderDialog();
    fill();
    fireEvent.click(screen.getByRole('button', {name: 'ثبت رمز جدید'}));
    expect(await screen.findByText('رمز فعلی نادرست است.')).toBeTruthy();
    expect((screen.getByLabelText('رمز جدید') as HTMLInputElement).value).toBe('new-secret');

    fireEvent.click(screen.getByRole('button', {name: 'ثبت رمز جدید'}));
    expect(await screen.findByText(/رمز رایج است/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', {name: 'ثبت رمز جدید'}));
    expect(await screen.findByText('همان رمز')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends the user to sign in on 401 and explains 403 without a session', async () => {
    changeAccountPassword.mockRejectedValueOnce(new ServiceError('نشست', 401, 'SESSION_EXPIRED'));
    renderDialog();
    fill();
    fireEvent.click(screen.getByRole('button', {name: 'ثبت رمز جدید'}));
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/fa/auth?mode=login'));
    cleanup();

    changeAccountPassword.mockRejectedValueOnce(new ServiceError('قفل', 403, 'account_unavailable'));
    renderDialog();
    fill();
    fireEvent.click(screen.getByRole('button', {name: 'ثبت رمز جدید'}));
    expect(await screen.findByText('قفل')).toBeTruthy();
  });

  it('shows a countdown only when retry_after is present', async () => {
    changeAccountPassword
      .mockRejectedValueOnce(new ServiceError('محدود', 429, 'rate_limited', 12))
      .mockRejectedValueOnce(new ServiceError('محدود', 429, 'rate_limited', null));
    renderDialog();
    fill();
    fireEvent.click(screen.getByRole('button', {name: 'ثبت رمز جدید'}));
    expect(await screen.findByText(/۱۲|12/)).toBeTruthy();
    expect(screen.getByRole('button', {name: 'ثبت رمز جدید'})).toHaveProperty('disabled', true);
    cleanup();

    renderDialog();
    fill();
    fireEvent.click(screen.getByRole('button', {name: 'ثبت رمز جدید'}));
    expect(await screen.findByText('تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.')).toBeTruthy();
  });
});
