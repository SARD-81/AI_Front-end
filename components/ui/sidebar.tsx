'use client';

import * as React from 'react';
import {cn} from '@/lib/utils';

export function Sidebar({className, ...props}: React.HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        'flex h-full min-w-0 flex-col overflow-hidden border-l border-border bg-card',
        className
      )}
      {...props}
    />
  );
}

export function SidebarHeader({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'shrink-0 border-b border-border p-2 pt-[max(0.5rem,env(safe-area-inset-top))]',
        className
      )}
      {...props}
    />
  );
}

export function SidebarContent({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain p-2',
        className
      )}
      {...props}
    />
  );
}

export function SidebarFooter({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'shrink-0 border-t border-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]',
        className
      )}
      {...props}
    />
  );
}
