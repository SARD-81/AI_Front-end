import type { ChatSummary } from '@/lib/api/chat';

/** Calendar days in the viewer's timezone match the labels shown in the sidebar. */
export function groupChatsByDate(chats: ChatSummary[], now = new Date()) {
  const today: ChatSummary[] = [];
  const yesterday: ChatSummary[] = [];
  const month: ChatSummary[] = [];
  const older: ChatSummary[] = [];

  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const yesterdayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  ).getTime();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 30
  ).getTime();

  for (const chat of chats) {
    const updatedAt = new Date(chat.updatedAt).getTime();
    if (updatedAt >= todayStart) today.push(chat);
    else if (updatedAt >= yesterdayStart) yesterday.push(chat);
    else if (updatedAt >= monthStart) month.push(chat);
    else older.push(chat);
  }

  return { today, yesterday, month, older };
}
