// @vitest-environment jsdom

import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen
} from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fa from '@/messages/fa.json';
import { ServiceError } from '@/lib/services/auth-service';
import { PhoneAuthExperience } from './PhoneAuthExperience';

const identifyPhone = vi.hoisted(() => vi.fn());
const requestRegistrationOtp = vi.hoisted(() => vi.fn());
const loginWithPhone = vi.hoisted(() => vi.fn());
const requestPhonePasswordReset = vi.hoisted(() => vi.fn());
const verifyPhonePasswordReset = vi.hoisted(() => vi.fn());
const completePhonePasswordReset = vi.hoisted(() => vi.fn());
const completeMigratedPassword = vi.hoisted(() => vi.fn());
const registerWithPhone = vi.hoisted(() => vi.fn());
const verifyRegistrationOtp = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const authSearch = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  usePathname: () => '/fa/auth',
  useSearchParams: () => authSearch.params
}));

vi.mock('next/image', () => ({
  default: (props: { alt?: string; className?: string }) => (
    <span role="img" aria-label={props.alt ?? ''} className={props.className} />
  )
}));

vi.mock('@/lib/services/phone-auth-service', () => ({
  identifyPhone,
  requestRegistrationOtp,
  loginWithPhone,
  requestPhonePasswordReset,
  verifyPhonePasswordReset,
  completePhonePasswordReset,
  completeMigratedPassword,
  registerWithPhone,
  resendActivationOtp: vi.fn(),
  verifyActivationOtp: vi.fn(),
  verifyRegistrationOtp
}));

function renderAuth() {
  return render(
    <NextIntlClientProvider
      locale="fa"
      messages={fa as unknown as AbstractIntlMessages}
    >
      <PhoneAuthExperience locale="fa" />
    </NextIntlClientProvider>
  );
}

async function openRegistration() {
  identifyPhone.mockResolvedValue({
    next: 'register',
    verificationRequired: true
  });
  fireEvent.change(screen.getByPlaceholderText('09123456789'), {
    target: { value: '09120000000' }
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: 'ادامه با شماره موبایل' })
    );
  });
  expect(
    await screen.findByRole('heading', { name: 'ساخت حساب کاربری جدید' })
  ).toBeTruthy();
}

describe('phone auth OTP countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-09-25T00:00:00Z'));
    identifyPhone.mockReset();
    requestRegistrationOtp.mockReset();
    loginWithPhone.mockReset();
    requestPhonePasswordReset.mockReset();
    completePhonePasswordReset.mockReset();
    completeMigratedPassword.mockReset();
    registerWithPhone.mockReset();
    verifyRegistrationOtp.mockReset();
    replace.mockReset();
    refresh.mockReset();
    localStorage.clear();
    authSearch.params = new URLSearchParams();
    window.history.replaceState({}, '', '/fa/auth');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('restarts the registration countdown after a second success with the same retry_after', async () => {
    requestRegistrationOtp.mockResolvedValue({
      status: 'accepted',
      retry_after: 60
    });
    renderAuth();
    await openRegistration();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'درخواست کد' }));
    });
    const waiting = await screen.findByRole('button', {
      name: 'درخواست دوباره تا 60 ثانیه'
    });
    expect((waiting as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    const ready = screen.getByRole('button', { name: 'درخواست دوبارهٔ کد' });
    expect((ready as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      fireEvent.click(ready);
    });
    const restarted = await screen.findByRole('button', {
      name: 'درخواست دوباره تا 60 ثانیه'
    });
    expect((restarted as HTMLButtonElement).disabled).toBe(true);
    expect(requestRegistrationOtp).toHaveBeenCalledTimes(2);
    expect(localStorage.length).toBe(0);
  });

  it('disables the same button from a 429 retry_after', async () => {
    requestRegistrationOtp.mockRejectedValue(
      new ServiceError(
        'تعداد ارسال پیامک برای این شماره بیش از حد مجاز است.',
        429,
        'sms_rate_limited',
        60
      )
    );
    renderAuth();
    await openRegistration();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'درخواست کد' }));
    });
    const waiting = await screen.findByRole('button', {
      name: 'درخواست دوباره تا 60 ثانیه'
    });
    expect((waiting as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('بیش از حد مجاز');
  });

  it('shows imported-password guidance and does not store a session token', async () => {
    identifyPhone.mockResolvedValue({
      next: 'password',
      verificationRequired: false
    });
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
      target: { value: '09120000000' }
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'ادامه با شماره موبایل' })
      );
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'Temp-Pass-123' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ورود' }));
    });

    expect(
      await screen.findByRole('heading', { name: 'اول باید رمز موقت عوض شود' })
    ).toBeTruthy();
    expect(screen.getByLabelText('ایمیل حساب مهاجرتی')).toBeTruthy();
    expect(screen.getByLabelText('رمز موقت')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'ایمیل و رمز موقت را دارم' })
    ).toBeNull();
    expect(setItem).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('sbu_access');
    setItem.mockRestore();
  });

  it('returns a taken registration number to password login for that same number', async () => {
    requestRegistrationOtp.mockRejectedValue(
      new ServiceError(
        'این شماره قبلاً ثبت شده است. با رمز عبور وارد شوید.',
        409,
        'phone_already_registered'
      )
    );
    renderAuth();
    await openRegistration();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'درخواست کد' }));
    });
    expect(
      await screen.findByRole('heading', { name: 'رمز همین شماره' })
    ).toBeTruthy();
    expect(screen.getByDisplayValue('09120000000')).toBeTruthy();
  });

  it('offers a fresh recovery code after invalid_reset_token without storing the token', async () => {
    identifyPhone.mockResolvedValue({
      next: 'password',
      verificationRequired: true
    });
    requestPhonePasswordReset.mockResolvedValue({
      status: 'accepted',
      retry_after: 60
    });
    verifyPhonePasswordReset.mockResolvedValue({ resetToken: 'reset-secret' });
    completePhonePasswordReset.mockRejectedValue(
      new ServiceError(
        'درخواست بازیابی نامعتبر است.',
        400,
        'invalid_reset_token'
      )
    );
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText('09123456789'), {
      target: { value: '09120000000' }
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'ادامه با شماره موبایل' })
      );
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'فراموشی رمز این شماره' })
      );
    });
    fireEvent.change(screen.getByLabelText('کد تأیید'), {
      target: { value: '12345' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تأیید کد' }));
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'N3w-Pass-456' }
    });
    fireEvent.change(screen.getByLabelText('تکرار رمز'), {
      target: { value: 'N3w-Pass-456' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ثبت رمز جدید' }));
    });
    expect(
      await screen.findByRole('heading', { name: 'بازیابی رمز این شماره' })
    ).toBeTruthy();
    expect(
      screen.getByText(
        'این درخواست بازیابی دیگر قابل استفاده نیست. کد تازه بگیرید.'
      )
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'درخواست دوباره تا 60 ثانیه' })
    ).toBeTruthy();
    expect(document.body.textContent).not.toContain('reset-secret');
    expect(localStorage.length).toBe(0);
  });

  it('continues from phone setup without clearing phoneSetupRequired', async () => {
    const result = {
      phoneSetupRequired: true,
      isProfileCompleted: true,
      user: { phoneSetupRequired: true, isProfileCompleted: true }
    };
    identifyPhone.mockResolvedValue({
      next: 'password',
      verificationRequired: false
    });
    loginWithPhone.mockResolvedValue({ kind: 'session', result });
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText('09123456789'), {
      target: { value: '09120000000' }
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'ادامه با شماره موبایل' })
      );
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'secret' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ورود' }));
    });
    expect(replace).toHaveBeenCalledWith('/fa/chat');
  });

  it('keeps the university mark colored when the document theme is dark', () => {
    document.documentElement.classList.add('dark');
    renderAuth();
    const logos = screen.getAllByRole('img', {
      name: 'لوگوی دانشگاه شهید بهشتی'
    });
    expect(logos.length).toBeGreaterThan(0);
    for (const logo of logos) {
      expect(logo.className).not.toContain('dark:invert');
      expect(logo.className).not.toContain('dark:brightness-0');
      expect(logo.className).toContain('invert-0');
      expect(logo.className).toContain('brightness-100');
    }
    document.documentElement.classList.remove('dark');
  });

  it('keeps a fresh number on registration until the code is accepted, and only 201 enters the app', async () => {
    requestRegistrationOtp.mockResolvedValue({
      status: 'accepted',
      retry_after: 45
    });
    verifyRegistrationOtp.mockResolvedValue({
      registrationToken: 'reg-secret',
      expiresIn: 600
    });
    registerWithPhone.mockResolvedValue({
      isProfileCompleted: true,
      phoneSetupRequired: false,
      user: { isProfileCompleted: true, phoneSetupRequired: false }
    });
    renderAuth();
    await openRegistration();

    expect(screen.queryByLabelText('کد تأیید')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'قبلاً با ایمیل حساب داشتم' })
    ).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'درخواست کد' }));
    });
    expect(await screen.findByLabelText('کد تأیید')).toBeTruthy();
    expect(
      screen.getByText('کد تأیید ارسال‌شده به تلفن همراهتان را وارد کنید.')
    ).toBeTruthy();
    expect(screen.queryByText(/رسیدن پیامک قطعی نیست/)).toBeNull();
    expect(replace).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('کد تأیید'), {
      target: { value: '12345' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تأیید کد' }));
    });
    expect(
      await screen.findByRole('heading', { name: 'ساخت حساب کاربری جدید' })
    ).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('reg-secret');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    fireEvent.change(screen.getByLabelText('نام'), {
      target: { value: 'علی' }
    });
    fireEvent.change(screen.getByLabelText('نام خانوادگی'), {
      target: { value: 'رضایی' }
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'N3w-Pass-456' }
    });
    fireEvent.change(screen.getByLabelText('تکرار رمز'), {
      target: { value: 'N3w-Pass-456' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ساخت حساب و ورود' }));
    });
    expect(registerWithPhone).toHaveBeenCalledWith(
      expect.objectContaining({
        registrationToken: 'reg-secret',
        firstName: 'علی',
        lastName: 'رضایی',
        password: 'N3w-Pass-456',
        role: 'student',
        staffCategory: null,
        email: ''
      }),
      expect.any(AbortSignal)
    );
    expect(replace).toHaveBeenCalledWith('/fa/chat');
  });

  it('keeps an existing number on password login', async () => {
    identifyPhone.mockResolvedValue({
      next: 'password',
      verificationRequired: false
    });
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText('09123456789'), {
      target: { value: '۰۹۱۲۰۰۰۰۰۰۰' }
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'ادامه با شماره موبایل' })
      );
    });
    expect(
      await screen.findByRole('heading', { name: 'رمز همین شماره' })
    ).toBeTruthy();
    expect(screen.getByText('09120000000')).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'ساخت حساب کاربری جدید' })
    ).toBeNull();
    expect(identifyPhone).toHaveBeenCalledWith(
      '۰۹۱۲۰۰۰۰۰۰۰',
      expect.any(AbortSignal)
    );
  });

  it('keeps account help off the main phone step and opens support instead of email login', () => {
    renderAuth();
    expect(
      screen.queryByRole('button', { name: 'قبلاً با ایمیل حساب داشتم' })
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'بازیابی از پشتیبانی' })
    );
    expect(
      screen.getByRole('heading', { name: 'بازیابی از پشتیبانی' })
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'حساب ندارید؟ ثبت‌نام' })
    ).toBeNull();
  });

  it('shows an invalid code beside the field and returns a taken number to login', async () => {
    verifyRegistrationOtp
      .mockRejectedValueOnce(
        new ServiceError('کد تایید نامعتبر است.', 400, 'invalid_otp')
      )
      .mockRejectedValueOnce(
        new ServiceError(
          'این شماره قبلاً ثبت شده است.',
          409,
          'phone_already_registered'
        )
      );
    requestRegistrationOtp.mockResolvedValue({
      status: 'accepted',
      retry_after: 30
    });
    renderAuth();
    await openRegistration();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'درخواست کد' }));
    });
    fireEvent.change(await screen.findByLabelText('کد تأیید'), {
      target: { value: '00000' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تأیید کد' }));
    });
    const codeField = screen.getByLabelText('کد تأیید');
    expect(codeField.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('کد تایید نامعتبر است.')).toBeTruthy();
    expect(screen.queryByText(/تلاش/)).toBeNull();

    fireEvent.change(codeField, { target: { value: '11111' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تأیید کد' }));
    });
    expect(
      await screen.findByRole('heading', { name: 'رمز همین شماره' })
    ).toBeTruthy();
  });

  it('keeps the profile and token after invalid_password and offers the old email account', async () => {
    requestRegistrationOtp.mockResolvedValue({
      status: 'accepted',
      retry_after: 20
    });
    verifyRegistrationOtp.mockResolvedValue({
      registrationToken: 'kept-token'
    });
    registerWithPhone
      .mockRejectedValueOnce(
        new ServiceError(
          'رمز رد شد',
          400,
          'invalid_password',
          null,
          undefined,
          ['حداقل طول رعایت نشده.', 'رمز رایج است.']
        )
      )
      .mockRejectedValueOnce(
        new ServiceError(
          'این ایمیل قبلاً ثبت شده است.',
          409,
          'email_already_registered'
        )
      );
    renderAuth();
    await openRegistration();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'درخواست کد' }));
    });
    fireEvent.change(await screen.findByLabelText('کد تأیید'), {
      target: { value: '12345' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تأیید کد' }));
    });
    fireEvent.change(await screen.findByLabelText('نام'), {
      target: { value: 'علی' }
    });
    fireEvent.change(screen.getByLabelText('نام خانوادگی'), {
      target: { value: 'رضایی' }
    });
    fireEvent.change(screen.getByLabelText('ایمیل (اختیاری)'), {
      target: { value: 'old@sbu.ac.ir' }
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'short' }
    });
    fireEvent.change(screen.getByLabelText('تکرار رمز'), {
      target: { value: 'short' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ساخت حساب و ورود' }));
    });
    expect(screen.getByText('حداقل طول رعایت نشده.')).toBeTruthy();
    expect(screen.getByText('رمز رایج است.')).toBeTruthy();
    expect((screen.getByLabelText('نام') as HTMLInputElement).value).toBe(
      'علی'
    );
    expect((screen.getByLabelText('رمز عبور') as HTMLInputElement).value).toBe(
      'short'
    );
    expect(document.body.textContent).not.toContain('kept-token');
    expect(replace).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'Better-Pass-456' }
    });
    fireEvent.change(screen.getByLabelText('تکرار رمز'), {
      target: { value: 'Better-Pass-456' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ساخت حساب و ورود' }));
    });
    expect(
      screen.getByText(/ثبت‌نام تازه آن حساب را به این شماره وصل نمی‌کند/)
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'ورود به حساب ایمیلی' })
    ).toBeNull();
    const emailField = screen.getByLabelText(
      'ایمیل (اختیاری)'
    ) as HTMLInputElement;
    expect(emailField.value).toBe('old@sbu.ac.ir');
    fireEvent.change(emailField, { target: { value: '' } });
    expect(emailField.value).toBe('');
  });

  it('sends staff category only for staff and restarts a blocked registration without claiming expiry', async () => {
    requestRegistrationOtp.mockResolvedValue({
      status: 'accepted',
      retry_after: 12
    });
    verifyRegistrationOtp.mockResolvedValue({
      registrationToken: 'staff-token'
    });
    registerWithPhone.mockRejectedValue(
      new ServiceError(
        'درخواست ثبت‌نام نامعتبر است.',
        400,
        'invalid_registration'
      )
    );
    renderAuth();
    await openRegistration();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'درخواست کد' }));
    });
    fireEvent.change(await screen.findByLabelText('کد تأیید'), {
      target: { value: '12345' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تأیید کد' }));
    });
    expect(screen.queryByLabelText('دستهٔ کارکنان')).toBeNull();
    fireEvent.change(screen.getByLabelText('نقش'), {
      target: { value: 'professor' }
    });
    expect(screen.queryByLabelText('دستهٔ کارکنان')).toBeNull();
    fireEvent.change(screen.getByLabelText('نام'), {
      target: { value: 'مینا' }
    });
    fireEvent.change(screen.getByLabelText('نام خانوادگی'), {
      target: { value: 'کریمی' }
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'Staff-Pass-456' }
    });
    fireEvent.change(screen.getByLabelText('تکرار رمز'), {
      target: { value: 'Staff-Pass-456' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ساخت حساب و ورود' }));
    });
    expect(registerWithPhone).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'professor',
        staffCategory: null,
        email: ''
      }),
      expect.any(AbortSignal)
    );
    fireEvent.change(screen.getByLabelText('نقش'), {
      target: { value: 'staff' }
    });
    expect(screen.getByLabelText('دستهٔ کارکنان')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('دستهٔ کارکنان'), {
      target: { value: 'vice_presidency' }
    });
    fireEvent.change(screen.getByLabelText('نام'), {
      target: { value: 'مینا' }
    });
    fireEvent.change(screen.getByLabelText('نام خانوادگی'), {
      target: { value: 'کریمی' }
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'Staff-Pass-456' }
    });
    fireEvent.change(screen.getByLabelText('تکرار رمز'), {
      target: { value: 'Staff-Pass-456' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ساخت حساب و ورود' }));
    });
    expect(registerWithPhone).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'staff',
        staffCategory: 'vice_presidency',
        email: ''
      }),
      expect.any(AbortSignal)
    );
    expect(screen.getByText('درخواست ثبت‌نام نامعتبر است.')).toBeTruthy();
    expect(screen.queryByText(/منقضی/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'دریافت کد تازه' }));
    expect(
      await screen.findByRole('heading', { name: 'ساخت حساب کاربری جدید' })
    ).toBeTruthy();
    expect(screen.queryByLabelText('نام')).toBeNull();
  });

  it('restarts submit waiting from each 429 and keeps the form after sms_unavailable', async () => {
    requestRegistrationOtp.mockResolvedValue({
      status: 'accepted',
      retry_after: 5
    });
    verifyRegistrationOtp.mockResolvedValue({
      registrationToken: 'again-token'
    });
    registerWithPhone
      .mockRejectedValueOnce(
        new ServiceError('کمی بعد دوباره تلاش کنید.', 429, 'rate_limited', 15)
      )
      .mockRejectedValueOnce(
        new ServiceError(
          'ارسال پیامک در حال حاضر ممکن نیست.',
          503,
          'sms_unavailable'
        )
      );
    renderAuth();
    await openRegistration();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'درخواست کد' }));
    });
    fireEvent.change(await screen.findByLabelText('کد تأیید'), {
      target: { value: '12345' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تأیید کد' }));
    });
    fireEvent.change(await screen.findByLabelText('نام'), {
      target: { value: 'علی' }
    });
    fireEvent.change(screen.getByLabelText('نام خانوادگی'), {
      target: { value: 'رضایی' }
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'N3w-Pass-456' }
    });
    fireEvent.change(screen.getByLabelText('تکرار رمز'), {
      target: { value: 'N3w-Pass-456' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ساخت حساب و ورود' }));
    });
    const waiting = screen.getByRole('button', {
      name: 'درخواست دوباره تا 15 ثانیه'
    });
    expect((waiting as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('نام') as HTMLInputElement).value).toBe(
      'علی'
    );

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ساخت حساب و ورود' }));
    });
    expect(screen.getByText('ارسال پیامک در حال حاضر ممکن نیست.')).toBeTruthy();
    expect((screen.getByLabelText('نام') as HTMLInputElement).value).toBe(
      'علی'
    );
    expect(
      (
        screen.getByRole('button', {
          name: 'ساخت حساب و ورود'
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
  });

  it('holds verification after a 429 without freezing resend or sending another verify', async () => {
    requestRegistrationOtp.mockResolvedValue({
      status: 'accepted',
      retry_after: 5
    });
    verifyRegistrationOtp.mockRejectedValue(
      new ServiceError(
        'تعداد درخواست‌ها بیش از حد مجاز است.',
        429,
        'rate_limited',
        120
      )
    );
    renderAuth();
    await openRegistration();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'درخواست کد' }));
    });
    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });
    fireEvent.change(await screen.findByLabelText('کد تأیید'), {
      target: { value: '12345' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تأیید کد' }));
    });

    const held = screen.getByRole('button', {
      name: 'تأیید دوباره تا 120 ثانیه'
    }) as HTMLButtonElement;
    const resend = screen.getByRole('button', {
      name: 'درخواست دوبارهٔ کد'
    }) as HTMLButtonElement;
    expect(held.disabled).toBe(true);
    expect(resend.disabled).toBe(false);
    expect(
      screen.queryByText('درخواست ارسال پیامک ثبت شد. رسیدن پیامک قطعی نیست.')
    ).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('بیش از حد مجاز');

    await act(async () => {
      fireEvent.click(held);
    });
    expect(verifyRegistrationOtp).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });
    const ready = screen.getByRole('button', {
      name: 'تأیید کد'
    }) as HTMLButtonElement;
    expect(ready.disabled).toBe(false);
    await act(async () => {
      fireEvent.click(ready);
    });
    expect(verifyRegistrationOtp).toHaveBeenCalledTimes(2);
  });

  it('restarts only the verify hold when a later 429 repeats the same retry_after', async () => {
    requestRegistrationOtp.mockResolvedValue({
      status: 'accepted',
      retry_after: 1
    });
    verifyRegistrationOtp.mockRejectedValue(
      new ServiceError(
        'تعداد درخواست‌ها بیش از حد مجاز است.',
        429,
        'rate_limited',
        120
      )
    );
    renderAuth();
    await openRegistration();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'درخواست کد' }));
    });
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    fireEvent.change(await screen.findByLabelText('کد تأیید'), {
      target: { value: '12345' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تأیید کد' }));
    });
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(
      screen.getByRole('button', { name: 'تأیید دوباره تا 90 ثانیه' })
    ).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(90_000);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تأیید کد' }));
    });
    expect(
      screen.getByRole('button', { name: 'تأیید دوباره تا 120 ثانیه' })
    ).toBeTruthy();
    expect(verifyRegistrationOtp).toHaveBeenCalledTimes(2);
  });

  it('keeps the start screen free of registration steps and reveals the password', async () => {
    renderAuth();
    expect(
      screen.queryByRole('list', { name: 'مراحل ساخت حساب تازه' })
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'ادامه با شماره موبایل' })
    ).toBeTruthy();
    identifyPhone.mockResolvedValue({
      next: 'password',
      verificationRequired: false
    });
    fireEvent.change(screen.getByPlaceholderText('09123456789'), {
      target: { value: '09120000000' }
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'ادامه با شماره موبایل' })
      );
    });
    const passwordField = screen.getByLabelText('رمز عبور') as HTMLInputElement;
    expect(passwordField.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'نمایش رمز' }));
    expect(passwordField.type).toBe('text');
    expect(
      screen.queryByRole('list', { name: 'مراحل ساخت حساب تازه' })
    ).toBeNull();
  });

  it('shows registration progress only after a new account is chosen', async () => {
    renderAuth();
    await openRegistration();
    const heading = screen.getByRole('heading', {
      name: 'ساخت حساب کاربری جدید'
    });
    const progress = screen.getByRole('list', { name: 'مراحل ساخت حساب تازه' });
    expect(heading.nextElementSibling).toBe(progress);
    expect(progress.textContent).toContain('شماره تلفن');
    expect(progress.textContent).toContain('کد تأیید');
    expect(progress.textContent).toContain('ساخت حساب کاربری');
    expect(screen.queryByText('حساب ایمیلی قدیمی دارید؟')).toBeNull();
    expect(
      screen.getByRole('listitem', { current: 'step' }).textContent
    ).toContain('شماره');
  });

  it('ignores a second registration request while the first is in flight', async () => {
    let release: (value: {
      status: string;
      retry_after: number;
    }) => void = () => undefined;
    requestRegistrationOtp.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderAuth();
    await openRegistration();
    const send = screen.getByRole('button', { name: 'درخواست کد' });
    await act(async () => {
      fireEvent.click(send);
      fireEvent.click(send);
    });
    expect(requestRegistrationOtp).toHaveBeenCalledTimes(1);
    await act(async () => {
      release({ status: 'accepted', retry_after: 9 });
    });
  });

  it('starts on the phone number and does not ask which account type', () => {
    renderAuth();
    expect(screen.getByLabelText('شماره موبایل')).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'قبلاً در سها حساب داشته‌اید؟' })
    ).toBeNull();
  });

  it('offers support instead of an SMS reset while verification is off', async () => {
    identifyPhone.mockResolvedValue({
      next: 'password',
      verificationRequired: false
    });
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText('09123456789'), {
      target: { value: '09120000000' }
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'ادامه با شماره موبایل' })
      );
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'فراموشی رمز این شماره' })
    );
    expect(
      screen.getByRole('heading', { name: 'بازیابی از پشتیبانی' })
    ).toBeTruthy();
    expect(requestPhonePasswordReset).not.toHaveBeenCalled();
    expect(screen.getByText(/از راه پشتیبانی همان حساب/)).toBeTruthy();
    expect(screen.queryByText(/صاحب محصول/)).toBeNull();
    expect(screen.queryByText(/09\d{9}/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'بازگشت' }));
    expect(
      screen.getByRole('heading', { name: 'شروع با شماره موبایل' })
    ).toBeTruthy();
  });

  it('restarts a pilot registration from the number step and never requests a code', async () => {
    identifyPhone.mockResolvedValue({
      next: 'register',
      verificationRequired: false
    });
    registerWithPhone.mockRejectedValue(
      new ServiceError(
        'درخواست ثبت‌نام نامعتبر است.',
        400,
        'invalid_registration'
      )
    );
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText('09123456789'), {
      target: { value: '09120000000' }
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'ادامه با شماره موبایل' })
      );
    });
    expect(
      await screen.findByRole('heading', { name: 'ساخت حساب کاربری جدید' })
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'درخواست کد' })).toBeNull();
    expect(screen.queryByLabelText('کد تأیید')).toBeNull();
    fireEvent.change(screen.getByLabelText('نام'), {
      target: { value: 'علی' }
    });
    fireEvent.change(screen.getByLabelText('نام خانوادگی'), {
      target: { value: 'رضایی' }
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'N3w-Pass-456' }
    });
    fireEvent.change(screen.getByLabelText('تکرار رمز'), {
      target: { value: 'N3w-Pass-456' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ساخت حساب و ورود' }));
    });
    expect(screen.getByText('درخواست ثبت‌نام نامعتبر است.')).toBeTruthy();
    expect(screen.getByText(/از شماره دوباره شروع کنید/)).toBeTruthy();
    expect(screen.queryByText(/کد را دوباره بگیرید/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'بازگشت' }));
    expect(
      screen.getByRole('heading', { name: 'شروع با شماره موبایل' })
    ).toBeTruthy();
    expect(requestRegistrationOtp).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'درخواست کد' })).toBeNull();
  });

  it('returns a migrated password to phone login or support without a session', async () => {
    identifyPhone.mockResolvedValue({
      next: 'password',
      verificationRequired: false
    });
    loginWithPhone.mockRejectedValue(
      new ServiceError(
        'رمز موقت باید عوض شود.',
        403,
        'password_change_required'
      )
    );
    completeMigratedPassword.mockResolvedValueOnce({
      kind: 'phone_login_required'
    });
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText('09123456789'), {
      target: { value: '09120000000' }
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'ادامه با شماره موبایل' })
      );
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'Temp-Pass-123' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ورود' }));
    });
    fireEvent.change(await screen.findByLabelText('ایمیل حساب مهاجرتی'), {
      target: { value: 'professor@sbu.ac.ir' }
    });
    fireEvent.change(screen.getByLabelText('رمز موقت'), {
      target: { value: 'Temp-Pass-123' }
    });
    fireEvent.change(screen.getByLabelText('رمز جدید'), {
      target: { value: 'N3w-Pass-456' }
    });
    fireEvent.change(screen.getByLabelText('تکرار رمز'), {
      target: { value: 'N3w-Pass-456' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ثبت رمز جدید' }));
    });
    expect(
      screen.getByRole('heading', { name: 'شروع با شماره موبایل' })
    ).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('sbu_access');

    loginWithPhone.mockRejectedValue(
      new ServiceError(
        'رمز موقت باید عوض شود.',
        403,
        'password_change_required'
      )
    );
    completeMigratedPassword.mockResolvedValueOnce({
      kind: 'phone_setup_required'
    });
    fireEvent.change(screen.getByPlaceholderText('09123456789'), {
      target: { value: '09120000000' }
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'ادامه با شماره موبایل' })
      );
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'Temp-Pass-123' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ورود' }));
    });
    fireEvent.change(await screen.findByLabelText('ایمیل حساب مهاجرتی'), {
      target: { value: 'professor@sbu.ac.ir' }
    });
    fireEvent.change(screen.getByLabelText('رمز موقت'), {
      target: { value: 'Temp-Pass-123' }
    });
    fireEvent.change(screen.getByLabelText('رمز جدید'), {
      target: { value: 'N3w-Pass-456' }
    });
    fireEvent.change(screen.getByLabelText('تکرار رمز'), {
      target: { value: 'N3w-Pass-456' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ثبت رمز جدید' }));
    });
    expect(
      screen.getByRole('heading', { name: 'بازیابی از پشتیبانی' })
    ).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows the migrated-password error and stays on the form', async () => {
    identifyPhone.mockResolvedValue({
      next: 'password',
      verificationRequired: false
    });
    loginWithPhone.mockRejectedValue(
      new ServiceError(
        'رمز موقت باید عوض شود.',
        403,
        'password_change_required'
      )
    );
    completeMigratedPassword.mockRejectedValue(
      new ServiceError('رمز موقت نادرست است.', 400, 'invalid_credentials')
    );
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText('09123456789'), {
      target: { value: '09120000000' }
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'ادامه با شماره موبایل' })
      );
    });
    fireEvent.change(screen.getByLabelText('رمز عبور'), {
      target: { value: 'Temp-Pass-123' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ورود' }));
    });
    fireEvent.change(await screen.findByLabelText('ایمیل حساب مهاجرتی'), {
      target: { value: 'professor@sbu.ac.ir' }
    });
    fireEvent.change(screen.getByLabelText('رمز موقت'), {
      target: { value: 'wrong' }
    });
    fireEvent.change(screen.getByLabelText('رمز جدید'), {
      target: { value: 'N3w-Pass-456' }
    });
    fireEvent.change(screen.getByLabelText('تکرار رمز'), {
      target: { value: 'N3w-Pass-456' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ثبت رمز جدید' }));
    });
    expect(screen.getByRole('alert').textContent).toContain(
      'رمز موقت نادرست است.'
    );
    expect(
      screen.getByRole('heading', { name: 'اول باید رمز موقت عوض شود' })
    ).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('ignores an email entry and keeps public sign-in on the phone number', () => {
    window.history.replaceState({}, '', '/fa/auth?entry=email');
    renderAuth();
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(
      screen.getByRole('heading', { name: 'شروع با شماره موبایل' })
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'تغییر روش ورود' })).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'قبلاً در سها حساب داشته‌اید؟' })
    ).toBeNull();
    expect(screen.queryByLabelText('ایمیل دانشگاهی')).toBeNull();
  });
});
