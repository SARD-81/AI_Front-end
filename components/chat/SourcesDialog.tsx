'use client';

import { BookOpen, ChevronDown, FileText, Search, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { AiResource } from '@/lib/api/chat';
import { groupSources } from '@/lib/chat/sources';

export function SourcesDialog({
  open,
  onOpenChange,
  resources
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resources: AiResource[];
}) {
  const locale = useLocale();
  const t = useTranslations('app.sources');
  const [search, setSearch] = useState('');
  const sources = useMemo(() => groupSources(resources), [resources]);
  const normalize = (text: string) =>
    text
      .toLocaleLowerCase(locale)
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/\u200c/g, ' ');
  const query = normalize(search.trim());
  const filtered = sources.filter((source) =>
    normalize(
      [source.title, source.dataset, ...source.excerpts].join(' ')
    ).includes(query)
  );
  const number = new Intl.NumberFormat(locale);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSearch('');
        onOpenChange(next);
      }}
    >
      <DialogContent
        dir={locale === 'fa' ? 'rtl' : 'ltr'}
        className="flex max-h-[90dvh] w-[calc(100%_-_1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0 pe-0 sm:max-h-[85dvh]"
      >
        <header className="shrink-0 border-b border-border bg-primary/5 px-4 pb-4 pt-5 sm:px-6">
          <div className="flex items-start gap-3 pe-8">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold leading-8">
                {t('title', { count: sources.length })}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-6 text-muted-foreground sm:text-sm">
                {t('description')}
              </DialogDescription>
            </div>
          </div>
          <div className="relative mt-4">
            <Search
              className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground"
              aria-hidden
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={t('search')}
              placeholder={t('search')}
              className="h-10 w-full rounded-xl border border-border bg-background pe-10 ps-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {search ? (
              <button
                type="button"
                aria-label={t('clearSearch')}
                onClick={() => setSearch('')}
                className="absolute end-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <p className="text-xs text-muted-foreground" role="status">
            {t('resultCount', { count: filtered.length })}
          </p>
          {filtered.map((source) => {
            const index = sources.indexOf(source);
            return (
              <article
                key={source.key}
                className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"
              >
                <div className="flex items-start gap-3 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold tabular-nums text-primary">
                    {number.format(index + 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3
                      dir="auto"
                      className="break-words text-sm font-bold leading-7 [overflow-wrap:anywhere]"
                    >
                      {source.title || t('documentFallback')}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] leading-5 text-muted-foreground">
                      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-muted px-2 py-0.5">
                        <FileText className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="break-all">
                          {source.dataset || t('datasetFallback')}
                        </span>
                      </span>
                      <span>
                        {t('excerptCount', { count: source.excerpts.length })}
                      </span>
                    </div>
                  </div>
                </div>
                {source.excerpts.length ? (
                  <details className="group border-t border-border">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-xs font-medium text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      <span>{t('readExcerpts')}</span>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                        aria-hidden
                      />
                    </summary>
                    <div className="space-y-3 px-4 pb-4">
                      {source.excerpts.map((excerpt, part) => (
                        <section
                          key={part}
                          className="rounded-lg border-s-2 border-primary/30 bg-muted/40 p-3 sm:p-4"
                        >
                          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                            {t('excerptLabel')} · {number.format(part + 1)}
                          </p>
                          <p
                            dir="auto"
                            className="whitespace-pre-wrap break-words text-sm leading-8 [overflow-wrap:anywhere]"
                          >
                            {excerpt}
                          </p>
                        </section>
                      ))}
                    </div>
                  </details>
                ) : (
                  <p className="border-t border-border px-4 py-3 text-xs leading-6 text-muted-foreground">
                    {t('noExcerpt')}
                  </p>
                )}
              </article>
            );
          })}
          {!filtered.length ? (
            <div className="py-10 text-center">
              <Search
                className="mx-auto mb-3 h-7 w-7 text-muted-foreground"
                aria-hidden
              />
              <p className="text-sm text-muted-foreground">{t('noResults')}</p>
              {search ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => setSearch('')}
                >
                  {t('clearSearch')}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <footer className="shrink-0 border-t border-border px-4 py-3 text-xs leading-6 text-muted-foreground sm:px-6">
          {t('notice')}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
