import type { Message, ModelInfo, PromptTemplate, Thread } from '@/domain/types/chat';

const now = Date.now();

export const mockModels: ModelInfo[] = [
  { id: 'deepseek-lite-demo', name: 'DeepSeek Lite (Demo)', contextWindow: 32000, provider: 'DemoLab' },
  { id: 'reasoner-pro-demo', name: 'Reasoner Pro (Demo)', contextWindow: 128000, provider: 'DemoLab' },
];

export const mockPrompts: PromptTemplate[] = [
  { id: 'p1', title: 'تحلیل باگ', content: 'این خطا را تحلیل کن و راه‌حل مرحله‌ای بده:', category: 'باگ' },
  { id: 'p2', title: 'برنامه پروژه', content: 'برای پروژه زیر یک برنامه اجرایی ۲ هفته‌ای بنویس:', category: 'کار' },
  { id: 'p3', title: 'یادگیری شخصی', content: 'برای من برنامه یادگیری شخصی‌سازی‌شده ایجاد کن:', category: 'شخصی' },
];

export const mockThreads: Thread[] = [
  {
    id: 't-1',
    title: 'درخواست پاسخ تست‌های چندرسانه‌ای برای نسخه جدید پروژه',
    updatedAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
    preview: 'بررسی سناریوهای اجرای تست و گزارش خطا',
    tags: ['کار'],
    model: 'deepseek-lite-demo',
  },
  {
    id: 't-2',
    title: 'اخلاق جنسی در اسلام و جهان غرب',
    updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
    preview: 'جمع‌بندی دیدگاه‌ها با منابع معتبر',
    tags: ['تحقیق'],
    model: 'reasoner-pro-demo',
  },
  {
    id: 't-3',
    title: 'سوالات درباره امام خمینی و سیاست',
    updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 9).toISOString(),
    preview: 'پاسخ‌گویی مرحله‌ای با ارجاع تاریخی',
    tags: ['تحقیق'],
    model: 'deepseek-lite-demo',
  },
  {
    id: 't-4',
    title: 'کمک در اصلاح استایل و زبان Angular',
    updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 16).toISOString(),
    preview: 'بهبود RTL و کدنویسی تمیز',
    tags: ['باگ'],
    model: 'deepseek-lite-demo',
  },
  {
    id: 't-5',
    title: 'تغییرات ظاهری برای بهبود کامپوننت ناوبری در نسخه موبایل',
    updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 22).toISOString(),
    preview: 'اصلاح فاصله‌ها و تایپوگرافی',
    tags: ['کار'],
    model: 'reasoner-pro-demo',
  },
  {
    id: 't-6',
    title: 'Vite React Project Navigation Slow Render Investigation',
    updatedAt: '2026-01-18T09:20:00.000Z',
    preview: 'trace for slow mount and router transitions',
    tags: ['باگ'],
    model: 'reasoner-pro-demo',
  },
  {
    id: 't-7',
    title: 'شناسایی و متوقف کردن برنامه با یوزر ناشناس در سرور لینوکسی',
    updatedAt: '2026-01-07T12:30:00.000Z',
    preview: 'دستورات مانیتورینگ و امن‌سازی',
    tags: ['کار'],
    model: 'deepseek-lite-demo',
  },
  {
    id: 't-8',
    title: 'نمایش داده‌های JSON با جدول گسترش‌پذیر در React',
    updatedAt: '2025-12-19T16:00:00.000Z',
    preview: 'طراحی ستون‌ها و تعاملات کاربر',
    tags: ['کار'],
    model: 'deepseek-lite-demo',
  },
  {
    id: 't-9',
    title: 'طراحی مسیر مهاجرت از REST به GraphQL در اپلیکیشن سازمانی',
    updatedAt: '2025-12-05T11:10:00.000Z',
    preview: 'مقایسه هزینه و ریسک',
    tags: ['تحقیق'],
    model: 'reasoner-pro-demo',
  },
  {
    id: 't-10',
    title: 'بازنویسی ماژول احراز هویت با الگوی Adapter و DIP',
    updatedAt: '2025-11-25T08:00:00.000Z',
    preview: 'تفکیک مسئولیت‌ها و پورت‌ها',
    tags: ['کار'],
    model: 'reasoner-pro-demo',
  },
  {
    id: 't-11',
    title: 'راهنمای ساخت داشبورد لاگینگ برای تیم پشتیبانی',
    updatedAt: '2025-11-12T09:45:00.000Z',
    preview: 'تعیین شاخص‌ها و اولویت هشدارها',
    tags: ['شخصی'],
    model: 'deepseek-lite-demo',
  },
];

export const mockMessages: Record<string, Message[]> = Object.fromEntries(
  mockThreads.map((thread, threadIndex) => {
    const messages = Array.from({ length: 18 }).map((_, messageIndex) => {
      const isUser = messageIndex % 2 === 0;
      return {
        id: `m-${threadIndex + 1}-${messageIndex + 1}`,
        threadId: thread.id,
        role: isUser ? 'user' : 'assistant',
        content: isUser
          ? `پیام کاربر شماره ${messageIndex + 1} برای ${thread.title}`
          : `پاسخ دستیار شماره ${messageIndex + 1} با جزئیات فنی و ساختارمند.`,
        createdAt: new Date(now - 1000 * 30 * (messageIndex + 1)).toISOString(),
        model: thread.model,
        metrics: { latencyMs: 300 + messageIndex * 3, tokensIn: 120, tokensOut: 260 },
        pinned: thread.pinnedMessageIds?.includes(`m-${threadIndex + 1}-${messageIndex + 1}`),
      } as Message;
    });

    messages.splice(3, 0, {
      id: `tool-${thread.id}`,
      threadId: thread.id,
      role: 'tool',
      content: 'Tool execution result',
      createdAt: new Date(now - 1000 * 60).toISOString(),
      toolCall: { name: 'search', payload: { query: 'enterprise ui', hits: 5 } },
      rawToolCalls: { callId: 'tc-1', status: 'success' },
    });

    return [thread.id, messages];
  }),
);
