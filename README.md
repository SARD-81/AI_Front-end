# DeepSeek-Style Persian Chat UI (Frontend Only)

اپلیکیشن حاضر یک کلون فرانت‌اندی از تجربه‌ی `chat.deepseek.com` با تمرکز روی RTL و زبان فارسی است.

## 1) نصب و اجرا

```bash
pnpm install
pnpm dev
```

برای بیلد تولید:

```bash
pnpm build
pnpm start
```

## 2) معماری

- **Next.js App Router + TypeScript**
- **Tailwind + CSS variables tokens** در `styles/tokens.css`
- **Theme system** با `next-themes` در `components/providers/app-providers.tsx`
- **i18n** با `next-intl` و پیام‌های فارسی در `messages/fa.json`
- **Server-state** با `@tanstack/react-query`
- **Markdown rendering** با `react-markdown + remark-gfm`
- **Virtualized messages** با `react-virtuoso`

ساختار اصلی:

- `app/[locale]/page.tsx` صفحه‌ی خالی
- `app/[locale]/chat/[chatId]/page.tsx` صفحه‌ی چت
- `components/sidebar/Sidebar.tsx` سایدبار
- `components/chat/*` لیست پیام، پیام، کامپوزر
- `lib/api/*` لایه‌ی API و DTO

## 3) محل دقیق TODOهای اتصال بک‌اند

> این پروژه عمداً backend-free است و هیچ endpoint قطعی حدس زده نشده است.

- `lib/api/client.ts`
  - TODO برای `BASE_URL`
  - TODO برای استراتژی auth (token/cookie)
- `lib/api/chat-service.ts`
  - TODO برای `GET /chats`
  - TODO برای `GET /chats/:id`
  - TODO برای `POST /chats`
  - TODO برای `POST /chats/:id/messages`
  - TODO برای `PATCH /chats/:id`
  - TODO برای `DELETE /chats/:id`
  - TODO برای پروتکل استریم (SSE/JSONL/plain text) و end-of-stream
- `components/chat/Composer.tsx`
  - TODO برای اتصال آپلود فایل
- `lib/api/chat.ts`
  - TODO برای metadata ضمیمه‌ها

## 4) تغییر توکن‌های رنگ/تم

- توکن‌های رنگ، spacing، radius در `styles/tokens.css` تعریف شده‌اند.
- نگاشت Tailwind به variables در `tailwind.config.ts` انجام شده است.
- برای شخصی‌سازی تم:
  1. متغیرهای `:root` و `.dark` را تغییر دهید.
  2. در صورت نیاز shadow/border radius را در Tailwind extend تنظیم کنید.

## 5) RTL و LTR برای code blocks

- جهت کل اپ در `app/[locale]/layout.tsx` روی `dir="rtl"` تنظیم شده.
- برای جلوگیری از بهم‌ریختگی کد:
  - در `MessageBubble` روی `<pre dir="ltr">` و `<code dir="ltr">` اعمال شده.
  - در `app/globals.css` هم کلاس `prose-chat` برای code ها `direction: ltr` دارد.

## نکته‌ی توسعه

برای تجربه‌ی مستقل از بک‌اند، داده‌ی نمونه داخل `hooks/use-chat-data.ts` با فلگ `USE_LOCAL_MOCKS = true` فعال است و به‌سادگی قابل حذف/جایگزینی است.
