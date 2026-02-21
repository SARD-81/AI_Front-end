'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {X} from 'lucide-react';
import {cn} from '@/lib/utils';

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  className,
  children,
  ...props
}: Dialog.DialogContentProps & {children: React.ReactNode}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm" />
      <Dialog.Content
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-[88vw] max-w-xs border-l border-border bg-card p-4 shadow-soft focus-visible:outline-none',
          className
        )}
        {...props}
      >
        <Dialog.Close className="absolute left-3 top-3 rounded-md p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" />
        </Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
