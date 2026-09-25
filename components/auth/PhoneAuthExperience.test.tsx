// @vitest-environment jsdom

import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {NextIntlClientProvider, type AbstractIntlMessages} from 'next-intl';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import fa from '@/messages/fa.json';
import {ServiceError} from '@/lib/services/auth-service';
import {PhoneAuthExperience} from './PhoneAuthExperience';

const identifyPhone = vi.hoisted(() => vi.fn());
const requestRegistrationOtp = vi.hoisted(() => vi.fn());
const loginWithPhone = vi.hoisted(() => vi.fn());
const requestPhonePasswordReset = vi.hoisted(() => vi.fn());
const verifyPhonePasswordReset = vi.hoisted(() => vi.fn());
const completePhonePasswordReset = vi.hoisted(() => vi.fn());
const registerWithPhone = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({replace: vi.fn(), refresh: vi.fn(), push: vi.fn()}),
  usePathname: () => '/fa/auth',
  useSearchParams: () => new URLSearchParams()
}));

vi.mock('next/image', () => ({
  default: (props: {alt?: string}) => <span role="img" aria-label={props.alt ?? ''} />
}));

vi.mock('@/lib/services/phone-auth-service', () => ({
  identifyPhone,
  requestRegistrationOtp,
  loginWithPhone,
  requestPhonePasswordReset,
  verifyPhonePasswordReset,
  completePhonePasswordReset,
  registerWithPhone,
  resendActivationOtp: vi.fn(),
  verifyActivationOtp: vi.fn(),
  verifyRegistrationOtp: vi.fn()
}));

function renderAuth() {
  return render(
    <NextIntlClientProvider locale="fa" messages={fa as unknown as AbstractIntlMessages}>
      <PhoneAuthExperience locale="fa" />
    </NextIntlClientProvider>
  );
}

async function openRegistration() {
  identifyPhone.mockResolvedValue('register');
  fireEvent.change(screen.getByPlaceholderText('09123456789'), {
    target: {value: '09120000000'}
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', {name: 'ادامه'}));
  });
  expect(await screen.findByRole('heading', {name: 'ساخت حساب تازه'})).toBeTruthy();
}

describe('phone auth OTP countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({toFake: ['Date', 'setInterval', 'clearInterval']});
    vi.setSystemTime(new Date('2026-09-25T00:00:00Z'));
    identifyPhone.mockReset();
    requestRegistrationOtp.mockReset();
    loginWithPhone.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('restarts the registration countdown after a second success with the same retry_after', async () => {
    requestRegistrationOtp.mockResolvedValue({status: 'accepted', retry_after: 60});
    renderAuth();
    await openRegistration();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'درخواست کد'}));
    });
    const waiting = await screen.findByRole('button', {name: 'درخواست دوباره تا 60 ثانیه'});
    expect((waiting as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    const ready = screen.getByRole('button', {name: 'درخواست کد'});
    expect((ready as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      fireEvent.click(ready);
    });
    const restarted = await screen.findByRole('button', {name: 'درخواست دوباره تا 60 ثانیه'});
    expect((restarted as HTMLButtonElement).disabled).toBe(true);
    expect(requestRegistrationOtp).toHaveBeenCalledTimes(2);
    expect(localStorage.length).toBe(0);
  });

  it('disables the same button from a 429 retry_after', async () => {
    requestRegistrationOtp.mockRejectedValue(
      new ServiceError('تعداد ارسال پیامک برای این شماره بیش از حد مجاز است.', 429, 'sms_rate_limited', 60)
    );
    renderAuth();
    await openRegistration();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'درخواست کد'}));
    });
    const waiting = await screen.findByRole('button', {name: 'درخواست دوباره تا 60 ثانیه'});
    expect((waiting as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('بیش از حد مجاز');
  });

  it('shows imported-password guidance and does not store a session token', async () => {
    identifyPhone.mockResolvedValue('password');
    loginWithPhone.mockRejectedValue(
      new ServiceError(
        'برای این حساب باید ابتدا رمز عبور تنظیم شود. از مسیر set-initial-password استفاده کنید.',
        403,
        'password_change_required'
      )
    );
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText('09123456789'), {
      target: {value: '09120000000'}
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'ادامه'}));
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {target: {value: 'Temp-Pass-123'}});
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'ورود'}));
    });

    expect(await screen.findByRole('heading', {name: 'اول باید رمز موقت عوض شود'})).toBeTruthy();
    expect(screen.getAllByText(/set-initial-password/).length).toBeGreaterThan(0);
    expect(screen.getByText(/پشتیبانی یا روند مهاجرت/)).toBeTruthy();
    expect(screen.getByRole('button', {name: 'ایمیل و رمز موقت را دارم'})).toBeTruthy();
    expect(setItem).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('sbu_access');
    setItem.mockRestore();
  });

  it('returns a taken registration number to password login for that same number', async () => {
    requestRegistrationOtp.mockRejectedValue(
      new ServiceError('این شماره قبلاً ثبت شده است. با رمز عبور وارد شوید.', 409, 'phone_already_registered')
    );
    renderAuth();
    await openRegistration();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'درخواست کد'}));
    });
    expect(await screen.findByRole('heading', {name: 'رمز همین شماره'})).toBeTruthy();
    expect(screen.getByDisplayValue('09120000000')).toBeTruthy();
  });

  it('offers a fresh recovery code after invalid_reset_token without storing the token', async () => {
    identifyPhone.mockResolvedValue('password');
    requestPhonePasswordReset.mockResolvedValue({status: 'accepted', retry_after: 60});
    verifyPhonePasswordReset.mockResolvedValue({resetToken: 'reset-secret'});
    completePhonePasswordReset.mockRejectedValue(
      new ServiceError('درخواست بازیابی نامعتبر است.', 400, 'invalid_reset_token')
    );
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText('09123456789'), {
      target: {value: '09120000000'}
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'ادامه'}));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'فراموشی رمز این شماره'}));
    });
    fireEvent.change(screen.getByLabelText('کد پیامک'), {target: {value: '12345'}});
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'تأیید کد'}));
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {target: {value: 'N3w-Pass-456'}});
    fireEvent.change(screen.getByLabelText('تکرار رمز'), {target: {value: 'N3w-Pass-456'}});
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'ثبت رمز جدید'}));
    });
    expect(await screen.findByRole('heading', {name: 'بازیابی رمز این شماره'})).toBeTruthy();
    expect(screen.getByText('این درخواست بازیابی دیگر قابل استفاده نیست. کد تازه بگیرید.')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'درخواست دوباره تا 60 ثانیه'})).toBeTruthy();
    expect(document.body.textContent).not.toContain('reset-secret');
    expect(localStorage.length).toBe(0);
  });
});
