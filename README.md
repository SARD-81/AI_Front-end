# چت سازمانی هوش مصنوعی (Front-End Only)

پروژه با Next.js App Router + TypeScript ساخته شده و کاملاً فرانت‌اند است. تمام نقاط وابسته به بک‌اند پشت اینترفیس‌ها و آداپترها ایزوله شده‌اند.

## اجرا

```bash
npm install
npm run dev
```

برای بیلد:

```bash
npm run build
npm start
```

## Demo Mode با MSW

```bash
NEXT_PUBLIC_DEMO_MODE=true npm run dev
```

در Demo Mode این مسیرها mock می‌شوند:
- `GET /threads`
- `POST /threads`
- `PATCH /threads/:id`
- `DELETE /threads/:id`
- `GET /threads/:id/messages`
- `POST /chat` (استریم شبیه‌سازی شده)

## معماری

- `domain/`: انواع و پورت‌ها (بدون وابستگی به فریم‌ورک)
- `application/`: یوزکیس‌ها
- `infrastructure/`: آداپتر HTTP/Stream/Storage/Telemetry/MSW
- `presentation/`: کامپوننت‌ها و ViewModel Hook
- `store/`: Zustand برای UI و streaming/drafts

## چک‌لیست TODO بک‌اند

- [ ] تنظیم `API_BASE_URL` در `infrastructure/http/endpoints.ts`
- [ ] تکمیل مسیر endpointها
- [ ] قرارداد احراز هویت (Bearer یا Cookie، refresh، expiry)
- [ ] نگاشت دقیق پروتکل استریم به `StreamEvent`
- [ ] نگاشت فیلد reasoning (`delta.reasoning_content`) و ابزار
- [ ] تعیین استراتژی pagination (cursor/page)
- [ ] مسیرهای feedback/report/share
- [ ] آپلود فایل و اتصال attachment idها

## افزودن مدل/حالت جدید (Open/Closed)

1. گزینه مدل را در `ModelSelector` اضافه کنید.
2. mode جدید را در `domain/types/chat.ts` تعریف کنید.
3. بدون تغییر use-caseها، صرفاً نگاشت payload را در adapter بک‌اند انجام دهید.

## تعویض parser/transport استریم (DIP)

- transport فعلی: `FetchChatStreamer`
- parserها: `PlainTextChunkParser`، `JsonLinesParser`، `SSEFrameParserOverPOST`
- برای تعویض فقط در DI (`infrastructure/di/container.ts`) parserFactory را عوض کنید.
