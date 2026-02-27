'use client';

import {FormEvent, useMemo, useState} from 'react';
import Link from 'next/link';
import {useParams, useRouter} from 'next/navigation';
import {motion} from 'motion/react';
import {Home, LifeBuoy, Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

function getLocaleFromParams(localeParam: string | string[] | undefined) {
  if (Array.isArray(localeParam)) {
    return localeParam[0] ?? 'fa';
  }
  return localeParam ?? 'fa';
}

export default function NotFoundPage() {
  const router = useRouter();
  const params = useParams<{locale?: string | string[]}>();
  const locale = useMemo(() => getLocaleFromParams(params.locale), [params.locale]);
  const [query, setQuery] = useState('');

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) {
      router.push(`/${locale}/chat`);
      return;
    }
    router.push(`/${locale}/chat?q=${encodeURIComponent(q)}`);
  };

  return (
    <main dir="rtl" className="flex h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-sm md:p-10">
        <div className="space-y-6 text-center">
          <motion.div
            initial={{opacity: 0, y: 8}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: 'easeOut'}}
            className="mx-auto w-full max-w-xl"
          >
            <motion.svg
              viewBox="0 0 640 260"
              className="h-auto w-full text-muted-foreground"
              animate={{y: [0, -6, 0], x: [0, 4, 0]}}
              transition={{duration: 8, repeat: Infinity, ease: 'easeInOut'}}
            >
              <rect x="40" y="174" width="140" height="16" rx="8" className="fill-current opacity-10" />
              <rect x="460" y="172" width="144" height="16" rx="8" className="fill-current opacity-10" />
              <rect x="74" y="118" width="22" height="56" rx="6" className="fill-current opacity-20" />
              <rect x="102" y="106" width="22" height="68" rx="6" className="fill-current opacity-20" />
              <rect x="130" y="128" width="22" height="46" rx="6" className="fill-current opacity-20" />
              <rect x="488" y="124" width="22" height="48" rx="6" className="fill-current opacity-20" />
              <rect x="516" y="102" width="22" height="70" rx="6" className="fill-current opacity-20" />
              <rect x="544" y="116" width="22" height="56" rx="6" className="fill-current opacity-20" />

              <g transform="translate(250,52)">
                <rect x="20" y="50" width="100" height="78" rx="18" className="fill-current opacity-15" />
                <rect x="38" y="70" width="18" height="12" rx="4" className="fill-current opacity-40" />
                <rect x="84" y="70" width="18" height="12" rx="4" className="fill-current opacity-40" />
                <rect x="53" y="96" width="34" height="8" rx="4" className="fill-current opacity-35" />
                <rect x="32" y="132" width="18" height="24" rx="8" className="fill-current opacity-20" />
                <rect x="90" y="132" width="18" height="24" rx="8" className="fill-current opacity-20" />

                <polygon points="70,10 118,28 22,28" className="fill-current opacity-25" />
                <rect x="64" y="5" width="12" height="9" rx="2" className="fill-current opacity-30" />
                <line x1="112" y1="30" x2="122" y2="52" className="stroke-current opacity-30" strokeWidth="3" />
                <circle cx="124" cy="56" r="4" className="fill-current opacity-35" />
              </g>

              <g transform="translate(360,126)" className="opacity-60">
                <circle cx="0" cy="0" r="22" className="stroke-current" strokeWidth="4" fill="none" />
                <line x1="15" y1="15" x2="38" y2="36" className="stroke-current" strokeWidth="4" strokeLinecap="round" />
              </g>

              <path d="M210 200h220" className="stroke-current opacity-20" strokeWidth="4" strokeLinecap="round" />
            </motion.svg>
          </motion.div>

          <div className="text-7xl font-black tracking-widest text-muted-foreground/40">404</div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">متأسفانه، دانش‌نامه این مسیر را پیدا نکرد.</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            صفحه‌ای که به دنبال آن هستید ممکن است تغییر نام داده شده باشد، حذف شده باشد، یا آدرس آن را اشتباه وارد کرده باشید.
          </p>

          <form onSubmit={onSubmit} className="mx-auto w-full max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="جستجو در دانش‌نامه یا چت‌های قبلی..."
                className="h-11 pr-10"
              />
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="h-11">
              <Link href={`/${locale}/chat`} className="inline-flex flex-row-reverse items-center gap-2">
                <Home className="h-4 w-4" />
                بازگشت به صفحه اصلی / چت
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <Link href="/#support" className="inline-flex flex-row-reverse items-center gap-2">
                <LifeBuoy className="h-4 w-4" />
                گزارش به پشتیبانی فنی دانشگاه
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
