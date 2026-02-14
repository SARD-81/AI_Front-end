# رابط کاربری چت هوش مصنوعی (Front-end Only, Enterprise Demo)

این پروژه با **Next.js App Router + TypeScript + TailwindCSS + Zustand + MSW** ساخته شده و فقط لایه فرانت‌اند را شامل می‌شود.

## اجرای پروژه

```bash
npm install
npm run dev
```

اپ روی `http://localhost:3000/chat` اجرا می‌شود.

## قابلیت‌های Enterprise (نسخه ارتقاءیافته)

- ناوبری چندبخشی: گفتگوها، مدل‌ها، قالب‌ها، تنظیمات.
- نوار وضعیت بالای چت: مدل فعال، context window، وضعیت اتصال، latency.
- Command Palette فارسی با `Ctrl/⌘ + K`.
- امکانات حرفه‌ای گفتگو:
  - عملیات هر پیام (کپی، بازتولید، ویرایش آخرین پیام کاربر، سنجاق)
  - پنل متادیتای پیام
  - پیام‌های سنجاق‌شده
  - یادداشت/برچسب thread
- ورودی غنی:
  - پیوست فایل + drag & drop + پیش‌نمایش تصویر (سمت کلاینت)
- استریم مقاوم:
  - StreamSession state machine (`idle | connecting | streaming | stopping | error | done`)
  - retry نمایی برای خطاهای transient
  - حالت توقف جزئی پیام
  - حفظ استریم در thread غیر فعال و نمایش «در حال پاسخ…» در سایدبار
- عملکرد و مقیاس:
  - مجازی‌سازی لیست پیام با `react-virtuoso`
  - pagination نمایشی (cursor-based) برای پیام‌ها
  - optimistic update برای threadها
- Design System سبک:
  - `components/ui`: Button, IconButton, Input, Textarea, Badge, Tabs, DropdownMenu, Modal, Tooltip, Skeleton, Toast
- شخصی‌سازی:
  - تم روشن/تیره + accent color با ذخیره localStorage
- مشاهده‌پذیری:
  - Telemetry client-side + correlationId
  - نمایشگر لاگ در Settings
  - Error Boundary فارسی با دکمه «بارگذاری مجدد»

## کلیدهای میانبر

- `Ctrl/⌘ + K`: باز کردن Command Palette
- `Enter`: ارسال پیام
- `Shift + Enter`: خط جدید

## Demo Scenarios (در تنظیمات)

- Normal
- Rate-limited
- Auth expired
- Intermittent network
- Heavy thread list

## وابستگی جدید

- `react-virtuoso`: مجازی‌سازی لیست پیام برای کارایی بهتر در دیتای حجیم.

## TODO(BE) checklist

- // TODO(BE): API_BASE_URL در محیط‌های مختلف.
- // TODO(BE): endpointهای دقیق و query params برای threads/messages/models/prompts.
- // TODO(BE): auth header vs cookie + refresh flow.
- // TODO(BE): pagination cursor fields و `nextCursor`.
- // TODO(BE): streaming protocol framing + done/error markers (text/jsonl/sse).
- // TODO(BE): models list endpoint و fields مربوط به token usage/context.
- // TODO(BE): upload endpoint و signed URL process.
- // TODO(BE): settings sync endpoint برای همگام‌سازی بین دستگاه‌ها.
