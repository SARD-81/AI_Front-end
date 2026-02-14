'use client';

import * as React from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import {cn} from '@/lib/utils';

export const DropdownMenu = Dropdown.Root;
export const DropdownMenuTrigger = Dropdown.Trigger;

export function DropdownMenuContent({className, ...props}: Dropdown.DropdownMenuContentProps) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        className={cn(
          'z-50 min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-card outline-none',
          'origin-top-right transition duration-200 ease-out data-[state=open]:translate-y-0 data-[state=open]:opacity-100',
          'data-[state=closed]:-translate-y-1 data-[state=closed]:opacity-0',
          className
        )}
        sideOffset={8}
        {...props}
      />
    </Dropdown.Portal>
  );
}

export function DropdownMenuItem({className, ...props}: Dropdown.DropdownMenuItemProps) {
  return (
    <Dropdown.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground',
        className
      )}
      {...props}
    />
  );
}
