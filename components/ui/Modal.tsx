'use client';

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
