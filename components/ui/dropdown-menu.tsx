'use client';

import * as React from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import {Circle} from 'lucide-react';
import {cn} from '@/lib/utils';
import {useMediaQuery} from '@/hooks/use-media-query';

export const DropdownMenu = Dropdown.Root;
export const DropdownMenuRadioGroup = Dropdown.RadioGroup;

export const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof Dropdown.Trigger>,
  React.ComponentPropsWithoutRef<typeof Dropdown.Trigger>
>(({className, ...props}, ref) => (
  <Dropdown.Trigger
    ref={ref}
    className={cn('max-lg:opacity-100', className)}
    {...props}
  />
));
DropdownMenuTrigger.displayName = Dropdown.Trigger.displayName;

export function DropdownMenuContent({
  className,
  side,
  align,
  ...props
}: Dropdown.DropdownMenuContentProps) {
  // Horizontal fly-out menus work well beside the collapsed desktop sidebar,
  // but inside the mobile/tablet sheet they can escape the visible viewport.
  // Keep those menus above their trigger until the permanent desktop sidebar
  // takes over at the lg breakpoint.
  const isSidebarViewport = useMediaQuery('(max-width: 1023px)');
  const opensHorizontally = side === 'left' || side === 'right';
  const shouldOpenVertically = isSidebarViewport && opensHorizontally;
  const resolvedSide = shouldOpenVertically ? 'top' : side;
  const resolvedAlign = shouldOpenVertically ? 'center' : align;

  return (
    <Dropdown.Portal>
      <Dropdown.Content
        className={cn(
          'z-50 min-w-40 max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-md border border-menu-border bg-menu p-1 text-menu-foreground shadow-card outline-none dark:border-menu-border dark:bg-menu dark:shadow-[0_18px_48px_-24px_hsl(var(--shadow-color)/0.9),0_0_0_1px_hsl(var(--foreground)/0.03)]',
          '[transform-origin:var(--radix-dropdown-menu-content-transform-origin)] transition duration-200 ease-out data-[state=open]:translate-y-0 data-[state=open]:opacity-100',
          'data-[state=closed]:-translate-y-1 data-[state=closed]:opacity-0',
          className
        )}
        side={resolvedSide}
        align={resolvedAlign}
        sideOffset={8}
        collisionPadding={12}
        {...props}
      />
    </Dropdown.Portal>
  );
}

export function DropdownMenuItem({className, ...props}: Dropdown.DropdownMenuItemProps) {
  return (
    <Dropdown.Item
      className={cn(
        'relative flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors focus:bg-menu-hover focus:text-menu-hover-foreground data-[highlighted]:bg-menu-hover data-[highlighted]:text-menu-hover-foreground dark:focus:bg-menu-hover dark:data-[highlighted]:bg-menu-hover',
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuRadioItem({className, children, ...props}: Dropdown.DropdownMenuRadioItemProps) {
  return (
    <Dropdown.RadioItem
      className={cn(
        'relative flex h-10 cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors focus:bg-menu-hover focus:text-menu-hover-foreground data-[highlighted]:bg-menu-hover data-[highlighted]:text-menu-hover-foreground dark:focus:bg-menu-hover dark:data-[highlighted]:bg-menu-hover',
        className
      )}
      {...props}
    >
      <Dropdown.ItemIndicator className="absolute left-2 inline-flex h-3.5 w-3.5 items-center justify-center">
        <Circle className="h-2 w-2 fill-current" />
      </Dropdown.ItemIndicator>
      {children}
    </Dropdown.RadioItem>
  );
}
