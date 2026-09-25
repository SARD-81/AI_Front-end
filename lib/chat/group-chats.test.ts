import { describe, expect, it } from 'vitest';
import { groupChatsByDate } from './group-chats';

describe('conversation date labels', () => {
  it('uses local calendar days, including the midnight boundary', () => {
    const now = new Date(2026, 8, 24, 12);
    const chats = [
      {
        id: 'today',
        title: 'Today',
        updatedAt: new Date(2026, 8, 24, 0).toISOString()
      },
      {
        id: 'yesterday',
        title: 'Yesterday',
        updatedAt: new Date(2026, 8, 23, 23, 59).toISOString()
      },
      {
        id: 'month',
        title: 'This month',
        updatedAt: new Date(2026, 8, 22).toISOString()
      },
      {
        id: 'older',
        title: 'Older',
        updatedAt: new Date(2026, 7, 1).toISOString()
      }
    ];

    const groups = groupChatsByDate(chats, now);
    expect(groups.today.map((chat) => chat.id)).toEqual(['today']);
    expect(groups.yesterday.map((chat) => chat.id)).toEqual(['yesterday']);
    expect(groups.month.map((chat) => chat.id)).toEqual(['month']);
    expect(groups.older.map((chat) => chat.id)).toEqual(['older']);
  });
});
