import { expect, it } from 'vitest';
import { prependHistory, HISTORY_START_INDEX } from './history';
import type { ChatDetail, ChatMessage } from '@/lib/api/chat';
const m = (id: string): ChatMessage => ({
  id,
  role: 'user',
  content: id,
  createdAt: ''
});

it('prepends only unseen IDs and preserves new local exchanges and metadata', () => {
  const current: ChatDetail = {
    id: 'c',
    title: 'title',
    messages: [m('10'), m('new'), { ...m('answer'), role: 'assistant' }],
    olderCursor: 'older'
  };
  const next = prependHistory(current, 'older', {
    messages: [m('8'), m('9'), m('10'), m('9')],
    olderCursor: null
  });
  expect(next.messages.map((x) => x.id)).toEqual([
    '8',
    '9',
    '10',
    'new',
    'answer'
  ]);
  expect(next.historyStartIndex).toBe(HISTORY_START_INDEX - 2);
  expect(next.messages[2]).toBe(current.messages[0]);
  expect(next.olderCursor).toBeNull();
  expect(
    prependHistory(next, 'older', { messages: [m('8')], olderCursor: 'bad' })
  ).toBe(next);
});
