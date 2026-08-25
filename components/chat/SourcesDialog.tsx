'use client';

import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Database,
  FileText
} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useMemo, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import type {AiResource} from '@/lib/api/chat';
import {cn} from '@/lib/utils';

type SourcesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resources: AiResource[];
};

function dedupeResources(resources: AiResource[]) {
  const byDocument = new Map<string, AiResource>();

  resources.forEach((resource, index) => {
    const key =
      resource.documentId?.trim() ||
      resource.segmentId?.trim() ||
      `${resource.datasetName ?? ''}:${resource.documentName ?? ''}:${index}`;

    const existing = byDocument.get(key);

    if (!existing) {
      byDocument.set(key, resource);
      return;
    }

    const existingScore =
      typeof existing.score === 'number' ? existing.score : -Infinity;

    const nextScore =
      typeof resource.score === 'number' ? resource.score : -Infinity;

    if (nextScore > existingScore) {
      byDocument.set(key, resource);
    }
  });

  return Array.from(byDocument.values());
}

export function SourcesDialog({
  open,
  onOpenChange,
  resources
}: SourcesDialogProps) {
  const locale = useLocale();
  const t = useTranslations('app.sources');
  const isRtl = locale === 'fa';

  const [expandedSources, setExpandedSources] = useState<Set<string>>(
    () => new Set()
  );

  const sources = useMemo(() => dedupeResources(resources), [resources]);

  const toggleSource = (key: string) => {
    setExpandedSources((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[85vh] max-w-2xl overflow-hidden',
          isRtl ? 'text-right' : 'text-left'
        )}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="flex min-w-0 items-center gap-3 pe-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--info-border))] bg-[hsl(var(--info-surface))]">
            <BookOpen
              className="h-5 w-5 text-[hsl(var(--info-text))]"
              aria-hidden
            />
          </div>

          <div className="min-w-0">
            <DialogTitle className="text-lg font-semibold">
              {t('title', {count: sources.length})}
            </DialogTitle>

            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
        </div>

        <div className="mt-3 max-h-[65vh] space-y-3 overflow-y-auto pe-1">
          {sources.map((source, index) => {
            const title =
              source.documentName?.trim() || t('documentFallback');

            const dataset =
              source.datasetName?.trim() || t('datasetFallback');

            const excerpt = source.content?.trim();

            const sourceKey =
              source.documentId ||
              source.segmentId ||
              `${title}-${index}`;

            const expanded = expandedSources.has(sourceKey);

            return (
              <article
                key={sourceKey}
                className="overflow-hidden rounded-2xl border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] shadow-sm transition-colors hover:border-[hsl(var(--info-border))]"
              >
                <div className="border-b border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-elevated))]/65 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--info-border))] bg-[hsl(var(--info-surface))]">
                      <FileText
                        className="h-4 w-4 text-[hsl(var(--info-text))]"
                        aria-hidden
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {t('documentLabel')}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--info-border))] bg-[hsl(var(--info-surface))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--info-text))]">
                          <Database className="h-3 w-3" aria-hidden />
                          {dataset}
                        </span>
                      </div>

                      <h3 className="break-words text-sm font-semibold leading-6 text-foreground">
                        {title}
                      </h3>
                    </div>

                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground/60">
                      {index + 1}
                    </span>
                  </div>
                </div>

                {excerpt ? (
                  <div className="px-4 py-3">
                    <div className="mb-2 text-[11px] font-medium text-muted-foreground">
                      {t('excerptLabel')}
                    </div>

                    <div
                      className={cn(
                        'relative overflow-hidden rounded-xl border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-elevated))]/45 px-3.5 py-3',
                        !expanded ? 'max-h-[7.75rem]' : undefined
                      )}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                        {excerpt}
                      </p>

                      {!expanded ? (
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[hsl(var(--surface-elevated))] to-transparent"
                          aria-hidden
                        />
                      ) : null}
                    </div>

                    {excerpt.length > 180 ? (
                      <div className="mt-2 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2 text-xs text-[hsl(var(--info-text))] hover:bg-[hsl(var(--info-surface))] hover:text-[hsl(var(--info-text))]"
                          onClick={() => toggleSource(sourceKey)}
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" />
                              {t('showLess')}
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" />
                              {t('showMore')}
                            </>
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
