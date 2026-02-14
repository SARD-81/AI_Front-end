'use client';

import { useEffect, useState } from 'react';

const HEADLINE_STORAGE_KEY = 'chat-start-header-last-index';

const PERSIAN_HEADLINES = [
  '«چطور می‌تونم کمکت کنم؟»',
  '«امروز روی چی کار کنیم؟»',
  '«چه چیزی رو می‌خوای سریع‌تر حل کنیم؟»',
  '«می‌خوای یه ایده تازه بسازیم؟»',
  '«کمکت کنم کد رو تمیزتر کنی؟»',
  '«یه باگ داری؟ با هم دیباگش کنیم.»',
  '«می‌خوای برای پروژه‌ات معماری بچینیم؟»',
  '«چی رو می‌خوای به نسخهٔ پروداکشن برسونی؟»',
  '«کدوم بخش رو می‌خوای بهینه کنیم؟»',
  '«می‌خوای UI رو حرفه‌ای‌تر کنیم؟»',
  '«یه فیچر جدید اضافه کنیم؟»',
  '«می‌خوای استریم/چت رو بهتر کنیم؟»',
  '«روی تجربه کاربری تمرکز کنیم؟»',
  '«می‌خوای تست‌ها رو کامل کنیم؟»',
  '«از کجا شروع کنیم تا سریع‌تر جلو بریم؟»'
] as const;

const pickRandomHeadlineIndex = (lastIndex: number | null) => {
  if (PERSIAN_HEADLINES.length <= 1) return 0;

  let nextIndex = Math.floor(Math.random() * PERSIAN_HEADLINES.length);
  if (lastIndex === null) return nextIndex;

  while (nextIndex === lastIndex) {
    nextIndex = Math.floor(Math.random() * PERSIAN_HEADLINES.length);
  }

  return nextIndex;
};

const HeadlineIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 text-sky-400" fill="none" aria-hidden="true">
    <path d="M5 14.5C10.2 14 13.8 11.5 17 6.2c.2-.3.7-.2.7.2V11c0 3.6-3 6.5-6.6 6.5H7.2c-1.8 0-2.8-1.4-2.2-3Z" fill="currentColor" />
    <path d="M10 9.5c2 .2 3.8-.4 5.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
    <path d="m12 3 1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3Z" fill="currentColor" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
    <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const PaperclipIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path d="M8.5 12.5 14 7a3 3 0 0 1 4.2 4.2l-7.4 7.4a5 5 0 1 1-7.1-7.1L11 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path d="M12 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="m7 11 5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type ChatStartHeaderProps = {
  seedKey?: string;
};

export function ChatStartHeader({ seedKey }: ChatStartHeaderProps) {
  const [headlineIndex, setHeadlineIndex] = useState(0);

  useEffect(() => {
    const rawLastIndex = sessionStorage.getItem(HEADLINE_STORAGE_KEY);
    const lastIndex = rawLastIndex === null ? null : Number(rawLastIndex);
    const normalizedLastIndex = Number.isInteger(lastIndex) ? lastIndex : null;

    const nextIndex = pickRandomHeadlineIndex(normalizedLastIndex);
    sessionStorage.setItem(HEADLINE_STORAGE_KEY, String(nextIndex));
    setHeadlineIndex(nextIndex);
  }, [seedKey]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0b0b0f] px-4 py-10 sm:px-6 sm:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.16),rgba(11,11,15,0.95)_50%,rgba(5,5,9,1)_100%)]" />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-8">
        <div className="flex items-center gap-3 text-center">
          <HeadlineIcon />
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{PERSIAN_HEADLINES[headlineIndex]}</h1>
        </div>

        <div className="w-full max-w-[880px] rounded-[28px] border border-slate-700/80 bg-[#2f2f34] p-4 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.7)] sm:p-5">
          <div dir="rtl" className="flex flex-col gap-4">
            <span className="text-right text-sm text-slate-300 sm:text-[30px]">پیام خود را بنویسید…</span>

            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                <button className="inline-flex items-center gap-1 rounded-full border border-sky-500/60 px-3 py-1.5 text-xs text-sky-300 transition hover:border-sky-300 hover:text-sky-200">
                  <SparkIcon />
                  دیپ‌تینک
                </button>
                <button className="inline-flex items-center gap-1 rounded-full border border-sky-500/60 px-3 py-1.5 text-xs text-sky-300 transition hover:border-sky-300 hover:text-sky-200">
                  <SearchIcon />
                  جستجو
                </button>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-500 bg-transparent text-slate-200 transition hover:border-slate-300 hover:text-white">
                  <PaperclipIcon />
                </button>
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-400">
                  <SendIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
