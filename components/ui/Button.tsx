import type { ButtonHTMLAttributes } from 'react';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`rounded-xl bg-indigo-600 px-3 py-2 text-sm transition hover:opacity-90 ${className}`} {...props} />;
}
