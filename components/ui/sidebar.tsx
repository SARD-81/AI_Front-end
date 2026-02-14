'use client';

import * as React from 'react';
import {cn} from '@/lib/utils';

export function Sidebar({className, ...props}: React.HTMLAttributes<HTMLElement>) {
  return <aside className={cn('flex h-full flex-col border-l border-border bg-card', className)} {...props} />;
}

export function SidebarHeader({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-border p-2', className)} {...props} />;
}

export function SidebarContent({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto p-2', className)} {...props} />;
}

export function SidebarFooter({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-border p-2', className)} {...props} />;
}
