import type { ButtonHTMLAttributes } from 'react';

export function IconButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs ${className}`} {...props} />;
}
