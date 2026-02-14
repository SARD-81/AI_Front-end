"use client";

import { useRef, useState } from "react";
import { Paperclip, Send, Square } from "lucide-react";
import { Button } from "@/presentation/components/ui/button";
import { useUIStore } from "@/store/ui.store";

export function Composer({ onSend, onStop, disabled }: { onSend: (text: string, files: File[]) => void; onStop: () => void; disabled: boolean }) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const settings = useUIStore((s) => s.settings);

  return (
    <div className="border-t border-zinc-800 p-3">
      <div className="mb-2 flex flex-wrap gap-2 text-xs text-zinc-400">
        {files.map((file) => <span key={file.name} className="rounded bg-zinc-800 px-2 py-1">{file.name}</span>)}
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onSend(value, files);
            setValue("");
          }
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend(value, files);
            setValue("");
          }
        }}
        placeholder="پیام خود را بنویسید..."
        className="h-28 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" className="hidden" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} aria-label="پیوست فایل"><Paperclip className="h-4 w-4" /></Button>
          <span className="text-xs text-zinc-500">Enter ارسال • Shift+Enter خط جدید • Ctrl/⌘+Enter ارسال</span>
        </div>
        {disabled && !settings.multiSend ? (
          <Button variant="destructive" onClick={onStop}><Square className="ml-1 h-4 w-4" />توقف</Button>
        ) : (
          <Button onClick={() => { onSend(value, files); setValue(""); }}><Send className="ml-1 h-4 w-4" />ارسال</Button>
        )}
      </div>
      {/* TODO(BE): implement secure file upload and attach returned IDs in chat payload. */}
    </div>
  );
}
