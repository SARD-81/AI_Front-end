"use client";

import { useState } from "react";

export function ReasoningPanel({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  if (!content) return null;
  return (
    <div className="mt-2 rounded-md border border-zinc-700 bg-zinc-900/70 p-2 text-xs">
      <button onClick={() => setOpen((v) => !v)} className="font-medium text-zinc-300">تحلیل {open ? "▾" : "▸"}</button>
      {open && <pre className="mt-2 whitespace-pre-wrap text-zinc-400">{content}</pre>}
    </div>
  );
}
