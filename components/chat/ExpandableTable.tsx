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
        hint: 'برای مشاهده کامل جدول، آن را بزرگ کنید.'
      }
    : {
        table: 'Table',
        expand: 'Open table fullscreen',
        hint: 'Expand the table for a complete view.'
      };

  return (
    <>
      <div className="my-4 overflow-hidden rounded-2xl border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] shadow-sm">
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

        <div className="relative">
          <div className="max-h-72 overflow-auto overscroll-contain">
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
          className="h-[100dvh] max-h-none w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-background p-0 pe-0 shadow-none sm:rounded-none"
        >
          <DialogTitle className="sr-only">{labels.expand}</DialogTitle>
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] px-4 pe-14 sm:px-6 sm:pe-16">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Table2 className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-foreground">
              {labels.table}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">
            <div className="prose-chat min-w-max rounded-2xl border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] shadow-sm">
              <table className="chat-table min-w-full !text-sm [&_td]:!min-w-36 [&_td]:!max-w-[30rem] [&_td]:!px-4 [&_td]:!py-3 [&_th]:!min-w-36 [&_th]:!max-w-[30rem] [&_th]:!px-4 [&_th]:!py-3">
                {children}
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
