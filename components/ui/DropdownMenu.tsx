'use client';

import { useState } from 'react';

export function DropdownMenu({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen((v) => !v)}>{trigger}</button>
      {open ? <div className="absolute z-20 mt-1 min-w-36 rounded-lg border border-slate-700 bg-slate-900 p-1">{children}</div> : null}
    </div>
  );
}
