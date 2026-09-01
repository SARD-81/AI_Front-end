'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {X} from 'lucide-react';
import {useLocale} from 'next-intl';
import {cn} from '@/lib/utils';

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

type SheetSide = 'left' | 'right';

export function SheetContent({
  className,
  children,
  side,
  ...props
}: Dialog.DialogContentProps & {
  children: React.ReactNode;
  side?: SheetSide;
}) {
  const locale = useLocale();
  const resolvedSide = side ?? (locale === 'fa' ? 'right' : 'left');
  const opensFromRight = resolvedSide === 'right';

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm" />
      <Dialog.Content
        className={cn(
          'fixed inset-y-0 z-50 w-[88vw] max-w-xs bg-card p-4 shadow-soft focus-visible:outline-none',
          opensFromRight
            ? 'right-0 border-l border-border'
            : 'left-0 border-r border-border',
          className
        )}
        {...props}
      >
        <Dialog.Close
          className={cn(
            'absolute top-3 rounded-md p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            opensFromRight ? 'left-3' : 'right-3'
          )}
        >
          <X className="h-4 w-4" />
        </Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
