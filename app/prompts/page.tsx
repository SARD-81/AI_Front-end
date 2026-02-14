'use client';

import { AppShell } from '@/components/layout/AppShell';
import { container } from '@/lib/di/container';
import type { PromptTemplate } from '@/domain/types/chat';
import { useEffect, useState } from 'react';

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);

  useEffect(() => {
    if (container.chatRepository.getPromptTemplates) {
      void container.chatRepository.getPromptTemplates().then(setPrompts);
    }
  }, []);

  return (
    <div className="p-3">
      <AppShell />
      <div className="fixed left-4 top-4 z-20 w-80 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm">
        <h1 className="mb-2">قالب‌های پرامپت</h1>
        <div className="space-y-2">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="rounded border border-slate-700 p-2">
              <p className="font-semibold">{prompt.title}</p>
              <p className="text-xs text-slate-300">{prompt.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
