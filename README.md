# رابط کاربری چت هوش مصنوعی (Front-end Only)

این پروژه با **Next.js App Router + TypeScript + TailwindCSS + Zustand** پیاده‌سازی شده و فقط لایه فرانت‌اند را شامل می‌شود.

## اجرای پروژه

```bash
npm install
npm run dev
```

اپ روی `http://localhost:3000/chat` اجرا می‌شود.

## حالت دمو (MSW)

در محیط توسعه و با متغیر `NEXT_PUBLIC_DEMO_MODE=true`، درخواست‌ها با MSW شبیه‌سازی می‌شوند.

نمونه تنظیم:

```bash
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_STREAM_PARSER=text
```

## چک‌لیست TODO(BE)

- مقدار `API_BASE_URL` در `data/http/endpoints.ts`.
- تایید مسیر endpoint ها:
  - `GET /threads` (با pagination)
  - `POST /threads`
  - `PATCH /threads/:id`
  - `DELETE /threads/:id`
  - `GET /threads/:id/messages` (با pagination)
  - `POST /chat` یا `POST /threads/:id/chat`
- روش احراز هویت:
  - Bearer token یا Cookie-based session
  - منطق refresh token یا redirect ورود
- فرمت استریم پاسخ:
  - text chunks (پیش‌فرض)
  - JSONL
  - SSE-like frame over POST
- منطق صحیح payload برای `regenerate`.
- مدیریت `Retry-After` روی خطای 429.

## معماری SOLID / DIP

- **domain/**: تایپ‌ها و اینترفیس‌ها (Ports)
- **data/**: پیاده‌سازی‌های HTTP و Mock
- **store/**: state management که به abstraction ها متکی است
- **lib/di/container.ts**: wiring و انتخاب adapter

برای تعویض پروتکل استریم:
1. parser را در `data/http/streamParsers.ts` اضافه/ویرایش کنید.
2. انتخاب parser را در `lib/di/container.ts` تغییر دهید.
3. در صورت نیاز transport جدید با `StreamTransport` بسازید.

