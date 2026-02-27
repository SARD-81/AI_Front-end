'use client';

import * as React from 'react';
import Link from 'next/link';
import {useParams, useRouter} from 'next/navigation';
import {motion} from 'motion/react';
import {Home, LifeBuoy, Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

type NotFoundViewProps = {
  locale?: string;
};

export function NotFoundView({locale: localeProp}: NotFoundViewProps) {
  const params = useParams<{locale?: string}>();
  const router = useRouter();
  const [query, setQuery] = React.useState('');

  const locale = localeProp ?? params?.locale ?? 'fa';

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    router.push(`/${locale}/chat?q=${encodeURIComponent(value)}`);
  };

  return (
    <main dir="rtl" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.08),_transparent_42%)]" />
      <div className="pointer-events-none absolute -left-16 top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

      <section className="relative z-10 w-full max-w-3xl rounded-3xl border border-border bg-card/95 p-6 shadow-2xl backdrop-blur-xl md:p-10">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
          <motion.div
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: 'easeInOut'}}
            className="space-y-4"
          >
            <p className="text-7xl font-black leading-none text-muted-foreground/40">404</p>
            <h1 className="text-2xl font-bold leading-relaxed text-foreground md:text-3xl">
              متأسفانه، دانش‌نامه این مسیر را پیدا نکرد.
            </h1>
            <p className="text-sm leading-7 text-muted-foreground md:text-base">
              صفحه‌ای که به دنبال آن هستید ممکن است تغییر نام داده شده باشد، حذف شده باشد، یا آدرس آن را اشتباه وارد کرده باشید.
            </p>

            <form onSubmit={onSubmit} className="w-full max-w-md">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="جستجو در دانش‌نامه یا چت‌های قبلی..."
                  className="h-11 pr-10"
                />
              </div>
            </form>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/${locale}/chat`} className="inline-flex items-center gap-2">
                  <Home className="size-4" />
                  بازگشت به صفحه اصلی / چت
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/#support" className="inline-flex items-center gap-2">
                  <LifeBuoy className="size-4" />
                  گزارش به پشتیبانی فنی دانشگاه
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{opacity: 0, scale: 0.98}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: 0.7, ease: 'easeInOut'}}
            className="mx-auto w-full max-w-sm"
          >
            <motion.svg
              viewBox="0 0 360 300"
              className="h-auto w-full"
              animate={{y: [0, -8, 0], x: [0, 4, 0]}}
              transition={{duration: 8, repeat: Infinity, ease: 'easeInOut'}}
            >
              <defs>
                <linearGradient id="robot" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
                </linearGradient>
              </defs>
              <rect x="20" y="220" width="320" height="16" rx="8" fill="hsl(var(--muted))" opacity="0.45" />
              <rect x="34" y="110" width="28" height="90" rx="6" fill="hsl(var(--border))" />
              <rect x="66" y="92" width="22" height="108" rx="6" fill="hsl(var(--border))" opacity="0.8" />
              <rect x="272" y="110" width="28" height="90" rx="6" fill="hsl(var(--border))" />
              <rect x="246" y="92" width="22" height="108" rx="6" fill="hsl(var(--border))" opacity="0.8" />

              <circle cx="178" cy="138" r="48" fill="url(#robot)" />
              <rect x="140" y="180" width="78" height="44" rx="18" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
              <circle cx="162" cy="136" r="7" fill="hsl(var(--background))" />
              <circle cx="194" cy="136" r="7" fill="hsl(var(--background))" />
              <path d="M160 156c8 8 24 8 32 0" fill="none" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" />

              <path d="M130 88l48-24 48 24-48 14-48-14z" fill="hsl(var(--foreground))" opacity="0.75" />
              <path d="M178 102v22" stroke="hsl(var(--foreground))" strokeWidth="4" />
              <circle cx="178" cy="126" r="4" fill="hsl(var(--foreground))" />

              <circle cx="232" cy="168" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" />
              <path d="M248 184l18 18" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" />

              <rect x="96" y="206" width="30" height="10" rx="4" fill="hsl(var(--muted-foreground))" opacity="0.4" />
              <rect x="232" y="206" width="30" height="10" rx="4" fill="hsl(var(--muted-foreground))" opacity="0.4" />
            </motion.svg>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
