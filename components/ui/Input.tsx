import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${className}`} {...props} />;
}
