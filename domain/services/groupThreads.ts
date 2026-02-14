import type { Thread } from '@/domain/types/chat';

export interface ThreadGroup {
  label: string;
  threads: Thread[];
}

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

const toMonthLabel = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
};

const safeDate = (value?: string) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const groupThreadsByUpdatedAt = (threads: Thread[], referenceDate = new Date()): ThreadGroup[] => {
  const sortedThreads = [...threads].sort((a, b) => safeDate(b.updatedAt).getTime() - safeDate(a.updatedAt).getTime());
  const grouped = new Map<string, Thread[]>();

  sortedThreads.forEach((thread) => {
    const updatedAt = safeDate(thread.updatedAt);
    const diff = referenceDate.getTime() - updatedAt.getTime();
    const label = diff <= THIRTY_DAYS_IN_MS ? '30 Days' : toMonthLabel(updatedAt);
    const current = grouped.get(label) ?? [];
    current.push(thread);
    grouped.set(label, current);
  });

  const orderedLabels = Array.from(grouped.keys()).sort((a, b) => {
    if (a === '30 Days') return -1;
    if (b === '30 Days') return 1;
    return a < b ? 1 : -1;
  });

  return orderedLabels.map((label) => ({ label, threads: grouped.get(label) ?? [] }));
};
