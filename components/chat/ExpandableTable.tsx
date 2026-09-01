'use client';

import { useState, type ReactNode } from 'react';
import { Maximize2, Table2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export function ExpandableTable({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const isRtl = locale === 'fa';
  const labels = isRtl
    ? {
        table: 'جدول',
        expand: 'نمایش تمام‌صفحه جدول',
        hint: 'برای مشاهده کامل جدول، آن را بزرگ کنید.',
        mobileHint: 'برای دیدن ستون‌های بیشتر، جدول را افقی بکشید.'
      }
    : {
        table: 'Table',
        expand: 'Open table fullscreen',
        hint: 'Expand the table for a complete view.',
        mobileHint: 'Swipe horizontally to view more columns.'
      };

  return (
    <>
      <div className="my-4 min-w-0 overflow-hidden rounded-2xl border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-elevated))]/60 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Table2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                {labels.table}
              </p>
              <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                {labels.hint}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] px-2.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-[hsl(var(--surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] focus-visible:ring-offset-2"
            aria-label={labels.expand}
            title={labels.expand}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{labels.expand}</span>
          </button>
        </div>

        <div className="relative min-w-0">
          <div className="max-h-[min(16rem,45dvh)] max-w-full overflow-auto overscroll-contain sm:max-h-72">
            <table className="chat-table !text-[13px] [&_td]:!min-w-28 [&_td]:!max-w-72 [&_td]:!px-2.5 [&_td]:!py-2 [&_th]:!min-w-28 [&_th]:!max-w-72 [&_th]:!px-2.5 [&_th]:!py-2">
              {children}
            </table>
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[hsl(var(--surface-card))] to-transparent"
            aria-hidden
          />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          dir={isRtl ? 'rtl' : 'ltr'}
          className="h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl border border-[hsl(var(--surface-subtle))] bg-background p-0 pe-0 shadow-card sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:rounded-3xl lg:h-[100dvh] lg:max-h-none lg:w-screen lg:max-w-none lg:rounded-none lg:border-0 lg:shadow-none"
        >
          <DialogTitle className="sr-only">{labels.expand}</DialogTitle>

          <div className="flex min-h-16 shrink-0 items-center gap-3 border-b border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] px-3 pe-12 py-2.5 sm:px-5 sm:pe-14 lg:min-h-14 lg:px-6 lg:pe-16 lg:py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary lg:h-8 lg:w-8 lg:rounded-lg">
              <Table2 className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {labels.table}
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground lg:hidden">
                {labels.mobileHint}
              </p>
            </div>
          </div>

          <div className="min-h-0 overflow-auto overscroll-contain p-2 sm:p-4 lg:p-6 [scrollbar-gutter:stable]">
            <div className="prose-chat min-w-max overflow-hidden rounded-xl border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] shadow-sm sm:rounded-2xl">
              <table className="chat-table min-w-full !text-[12px] sm:!text-sm [&_td]:!min-w-32 [&_td]:!max-w-[18rem] [&_td]:!px-3 [&_td]:!py-2.5 [&_th]:!min-w-32 [&_th]:!max-w-[18rem] [&_th]:!px-3 [&_th]:!py-2.5 sm:[&_td]:!min-w-36 sm:[&_td]:!max-w-[30rem] sm:[&_td]:!px-4 sm:[&_td]:!py-3 sm:[&_th]:!min-w-36 sm:[&_th]:!max-w-[30rem] sm:[&_th]:!px-4 sm:[&_th]:!py-3">
                {children}
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
