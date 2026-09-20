import type { ChatDetail, ChatMessage } from '@/lib/api/chat';

export const HISTORY_START_INDEX = 1_000_000;
export type HistoryPage = {
  messages: ChatMessage[];
  olderCursor: string | null;
};

export function prependHistory(
  current: ChatDetail,
  cursor: string,
  page: HistoryPage
): ChatDetail {
  // Ignore double clicks and pages that completed after the conversation changed.
  if (current.olderCursor !== cursor) return current;
  const ids = new Set(current.messages.map((m) => m.id));
  const older = page.messages.filter((m) => {
    if (ids.has(m.id)) return false;
    ids.add(m.id);
    return true;
  });
  return {
    ...current,
    messages: [...older, ...current.messages],
    olderCursor: page.olderCursor,
    historyStartIndex:
      (current.historyStartIndex ?? HISTORY_START_INDEX) - older.length
  };
}
