# DeepSeek-Style Persian Chat UI

اپلیکیشن حاضر یک کلون فرانت‌اندی از تجربه‌ی `chat.deepseek.com` با تمرکز روی RTL و زبان فارسی است.

## 1) نصب و اجرا

```bash
npm install
npm run dev
```

برای بیلد تولید:

```bash
npm run build
npm run start
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

## 3) متغیر محیطی اجباری

- `NEXT_PUBLIC_API_BASE_URL` (اجباری)

نمونه:

```bash
NEXT_PUBLIC_API_BASE_URL="https://YOUR-REAL-BACKEND"
```

اگر این متغیر تنظیم نشده باشد، در UI پیام فارسی نمایش داده می‌شود:

`آدرس API تنظیم نشده است. متغیر NEXT_PUBLIC_API_BASE_URL را تنظیم کنید.`

در محیط development نیز خطا throw می‌شود تا پیکربندی اشتباه سریع مشخص شود.

## 4) قرارداد API مورد انتظار

این پروژه **PURE FRONTEND** است و مستقیماً به بک‌اند واقعی متصل می‌شود (بدون BFF در Next.js):

- `GET    /chats`
- `POST   /chats`
- `GET    /chats/:id`
- `PATCH  /chats/:id`
- `DELETE /chats/:id`
- `POST   /chats/:id/messages`
- `POST   /chat/stream`
- `POST   /chat/complete` (fallback اختیاری)

> مسیرها در `lib/config/api-endpoints.ts` قابل تنظیم هستند.

> TODO(BACKEND): باید CORS برای origin فرانت‌اند (مثلاً دامنه Vercel) در بک‌اند فعال باشد.

## 5) محل دقیق TODOهای اتصال بک‌اند

- `lib/api/client.ts`
  - TODO برای استراتژی auth (token/cookie)
- `lib/config/api-endpoints.ts`
  - TODO برای تنظیم مسیرها در صورت تفاوت قرارداد بک‌اند
- `lib/api/chat-service.ts`
  - TODO برای map کردن `thinkingLevel` به پارامترهای واقعی بک‌اند
  - TODO برای CORS در بک‌اند
- `components/chat/Composer.tsx`
  - TODO برای اتصال آپلود فایل
- `lib/api/chat.ts`
  - TODO برای metadata ضمیمه‌ها

## 6) تغییر توکن‌های رنگ/تم

- توکن‌های رنگ، spacing، radius در `styles/tokens.css` تعریف شده‌اند.
- نگاشت Tailwind به variables در `tailwind.config.ts` انجام شده است.
- برای شخصی‌سازی تم:
  1. متغیرهای `:root` و `.dark` را تغییر دهید.
  2. در صورت نیاز shadow/border radius را در Tailwind extend تنظیم کنید.

## 7) RTL و LTR برای code blocks

- جهت کل اپ در `app/[locale]/layout.tsx` روی `dir="rtl"` تنظیم شده.
- برای جلوگیری از بهم‌ریختگی کد:
  - در `MessageBubble` روی `<pre dir="ltr">` و `<code dir="ltr">` اعمال شده.
  - در `app/globals.css` هم کلاس `prose-chat` برای code ها `direction: ltr` دارد.
