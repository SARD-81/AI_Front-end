'use client';

import './globals.css';

// Global error boundary: replaces the root layout when an error escapes
// every other boundary, so it must render its own <html> and <body>.
export default function GlobalError({
  reset
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <h1 className="text-xl font-semibold">مشکلی پیش آمد</h1>
        <p className="max-w-md text-sm leading-7 text-muted-foreground">
          خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.
          <br />
          Something went wrong. Please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          تلاش مجدد / Try again
        </button>
      </body>
    </html>
  );
}
