'use client';

import {ButtonHTMLAttributes, useMemo, useState} from 'react';
import {List} from 'lucide-react';
import {cn} from '@/lib/utils';

type UserAnchorItem = {
  anchorId: string;
  messageIndex: number;
  messageId: string;
  snippet: string;
};

type UserMessageRailProps = {
  anchors: UserAnchorItem[];
  activeAnchorId?: string;
  hoveredAnchorId?: string | null;
  onAnchorClick: (anchor: UserAnchorItem) => void;
  onAnchorHover: (anchorId: string | null) => void;
};

function RailTick({active, ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {active: boolean}) {
  return (
    <button
      type="button"
      className={cn(
        'h-4 w-4 rounded-full p-0.5 transition-colors duration-150',
        active ? 'text-foreground/90' : 'text-muted-foreground/75 hover:text-foreground/90'
      )}
      {...props}
    >
      <span className={cn('mx-auto block h-full w-0.5 rounded-full bg-current')} aria-hidden />
    </button>
  );
}

export function UserMessageRail({
  anchors,
  activeAnchorId,
  hoveredAnchorId,
  onAnchorClick,
  onAnchorHover
}: UserMessageRailProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintShown, setHintShown] = useState(false);

  const highlightedAnchorId = hoveredAnchorId ?? activeAnchorId;

  const activeIndex = useMemo(() => {
    if (!highlightedAnchorId) return -1;
    return anchors.findIndex((item) => item.anchorId === highlightedAnchorId);
  }, [anchors, highlightedAnchorId]);

  if (!anchors.length) return null;

  const openPanel = () => {
    setIsOpen(true);
    if (!hintShown && anchors.length >= 2) {
      setShowHint(true);
      setHintShown(true);
    }
  };

  const closePanel = () => {
    setIsOpen(false);
    setShowHint(false);
    onAnchorHover(null);
  };

  return (
    <aside className="absolute bottom-24 left-2 top-24 z-20 flex w-32 items-center justify-start">
      <div
        className="pointer-events-auto relative"
        onMouseEnter={openPanel}
        onMouseLeave={closePanel}
        onFocusCapture={openPanel}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            closePanel();
          }
        }}
      >
        <div
          className={cn(
            'flex w-8 flex-col items-center justify-center gap-1 rounded-full border border-border/40 bg-muted/30 py-2 text-muted-foreground/80 transition-all duration-150',
            isOpen ? 'opacity-100 shadow-sm ring-1 ring-ring/20' : 'opacity-85'
          )}
        >
          {/*<List className="mb-0.5 h-3.5 w-3.5 text-muted-foreground/75" aria-hidden />*/}
          {anchors.map((anchor) => {
            const isActive = highlightedAnchorId === anchor.anchorId;
            return (
              <RailTick
                key={anchor.anchorId}
                active={isActive}
                aria-label="پرش به پیام کاربر"
                title="پرش به پیام کاربر"
                onClick={() => onAnchorClick(anchor)}
                onMouseEnter={() => onAnchorHover(anchor.anchorId)}
                onMouseLeave={() => onAnchorHover(null)}
                onFocus={() => onAnchorHover(anchor.anchorId)}
              />
            );
          })}
        </div>

        {showHint ? (
          <div className="pointer-events-none absolute left-full top-0 ml-2 rounded-md border border-border/60 bg-popover px-2 py-1 text-xs text-foreground shadow-sm">
            پرش به پیام‌های شما
          </div>
        ) : null}

        {isOpen ? (
          <div className="absolute left-full top-1/2 ml-2 w-72 -translate-y-1/2 rounded-xl border border-border/60 bg-popover p-2 shadow-lg">
            <div className="max-h-[min(320px,40vh)] space-y-1 overflow-auto" dir="rtl">
              {anchors.map((anchor, index) => {
                const isActive = anchor.anchorId === highlightedAnchorId;
                return (
                  <button
                    key={`panel-${anchor.anchorId}`}
                    type="button"
                    className={cn(
                      'flex h-9 w-full items-center gap-2 rounded-lg px-3 text-right text-sm transition-colors',
                      isActive ? 'bg-accent/70 text-foreground' : 'hover:bg-muted/60'
                    )}
                    onMouseEnter={() => onAnchorHover(anchor.anchorId)}
                    onMouseLeave={() => onAnchorHover(null)}
                    onClick={() => onAnchorClick(anchor)}
                    title={anchor.snippet}
                  >
                    <span className="text-xs text-muted-foreground">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{anchor.snippet || 'پیام بدون متن'}</span>
                  </button>
                );
              })}
            </div>
            {activeIndex >= 0 ? <span className="sr-only">پیام فعال {activeIndex + 1}</span> : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
