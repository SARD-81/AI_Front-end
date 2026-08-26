'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {X} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {cn} from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
// Radix ships a Description primitive; without re-exporting it here every
// consumer that imports `DialogDescription` receives `undefined`, which React
// reports as "Element type is invalid".
export const DialogDescription = DialogPrimitive.Description;

export function DialogHeader({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 text-start', className)}
      {...props}
    />
  );
}

export function DialogFooter({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  );
}

export function DialogOverlay({className, ...props}: DialogPrimitive.DialogOverlayProps) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-background/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
}

type VisualViewportState = {
  centerY: number;
  height: number;
  keyboardOpen: boolean;
};

function useVisualViewportState() {
  const [viewport, setViewport] = React.useState<VisualViewportState | null>(null);

  React.useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const update = () => {
      const height = visualViewport.height;
      const keyboardOpen = window.innerHeight - height > 120;

      setViewport({
        height,
        centerY: visualViewport.offsetTop + height / 2,
        keyboardOpen
      });
    };

    update();
    visualViewport.addEventListener('resize', update);
    visualViewport.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);

    return () => {
      visualViewport.removeEventListener('resize', update);
      visualViewport.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return viewport;
}

export function DialogContent({className, children, dir, style, ...props}: DialogPrimitive.DialogContentProps) {
  const t = useTranslations('app');
  const locale = useLocale();
  const contentDir = dir ?? (locale === 'fa' ? 'rtl' : 'ltr');
  const visualViewport = useVisualViewportState();

  const responsiveStyle: React.CSSProperties = {
    ...(visualViewport
      ? {
          top: `${visualViewport.centerY}px`,
          ...(visualViewport.keyboardOpen
            ? {maxHeight: `${Math.max(0, visualViewport.height - 8)}px`}
            : {})
        }
      : {}),
    ...style
  };

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-surface-elevated p-6 pe-12 text-foreground shadow-card duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-2xl',
          className
        )}
        dir={contentDir}
        style={responsiveStyle}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute end-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-field-focus focus:ring-offset-2 disabled:pointer-events-none"
          aria-label={t('dialog.close')}
          title={t('dialog.close')}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{t('dialog.close')}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}
