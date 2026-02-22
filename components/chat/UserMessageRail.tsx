'use client';

import {ButtonHTMLAttributes} from 'react';
import {cn} from '@/lib/utils';

type UserAnchorItem = {
  anchorId: string;
  messageIndex: number;
  messageId: string;
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
        active ? 'text-foreground/90' : 'text-muted-foreground/40 hover:text-muted-foreground/70'
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
  if (!anchors.length) return null;

  return (
    <aside className="pointer-events-none absolute bottom-24 left-3 top-24 z-20 flex w-4 justify-center">
      <div className="pointer-events-auto flex w-full flex-col items-center justify-center gap-1 rounded-full">
        {anchors.map((anchor) => {
          const isActive = hoveredAnchorId ? hoveredAnchorId === anchor.anchorId : activeAnchorId === anchor.anchorId;
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
              onBlur={() => onAnchorHover(null)}
            />
          );
        })}
      </div>
    </aside>
  );
}
