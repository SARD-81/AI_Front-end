"use client";

import { useState } from "react";

export function ToolCallView({ payload }: { payload: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 rounded-md border border-zinc-700 bg-zinc-900/70 p-2 text-xs">
      <button onClick={() => setOpen((v) => !v)} className="font-medium text-zinc-300">ابزار/فراخوانی {open ? "▾" : "▸"}</button>
      {open && <pre className="mt-2 overflow-x-auto text-zinc-400">{JSON.stringify(payload, null, 2)}</pre>}
    </div>
  );
}
