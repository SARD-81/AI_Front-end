import * as React from 'react';
import {cn} from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({className, type, ...props}, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-field-border bg-field px-3 py-2 text-sm text-field-foreground shadow-sm ring-offset-background placeholder:text-field-placeholder focus-visible:border-field-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-field-border disabled:bg-field disabled:text-field-foreground disabled:opacity-60 disabled:placeholder:text-field-placeholder',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export {Input};
