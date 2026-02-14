import type { Message, Thread } from '@/domain/types/chat';

const now = Date.now();

export const mockThreads: Thread[] = [
  {
    id: 't-1',
    title: 'برنامه‌ریزی یادگیری هوش مصنوعی',
    updatedAt: new Date(now - 1000 * 60 * 8).toISOString(),
    preview: 'یک نقشه راه ۳ ماهه می‌خواهم.',
  },
  {
    id: 't-2',
    title: 'نمونه کد TypeScript',
    updatedAt: new Date(now - 1000 * 60 * 60).toISOString(),
    preview: 'یک نمونه کد با توضیح کامل',
  },
];

export const mockMessages: Record<string, Message[]> = {
  't-1': [
    {
      id: 'm-1',
      threadId: 't-1',
      role: 'user',
      content: 'یک برنامه ۳ ماهه برای شروع هوش مصنوعی می‌خواهم.',
      createdAt: new Date(now - 1000 * 60 * 10).toISOString(),
    },
    {
      id: 'm-2',
      threadId: 't-1',
      role: 'assistant',
      content:
        'حتماً!\n\n1. **ماه اول**: مبانی پایتون و ریاضی.\n2. **ماه دوم**: یادگیری ماشین کلاسیک.\n3. **ماه سوم**: پروژه عملی و استقرار.',
      createdAt: new Date(now - 1000 * 60 * 9).toISOString(),
    },
  ],
  't-2': [
    {
      id: 'm-3',
      threadId: 't-2',
      role: 'assistant',
      content:
        'در ادامه یک قطعه کد TypeScript می‌بینی:\n\n```ts\nfunction sum(a: number, b: number): number {\n  return a + b;\n}\n```',
      createdAt: new Date(now - 1000 * 60 * 61).toISOString(),
    },
    {
      id: 'm-4',
      threadId: 't-2',
      role: 'tool',
      content: 'Tool execution result',
      createdAt: new Date(now - 1000 * 60 * 60).toISOString(),
      toolCall: {
        name: 'analyze_code',
        payload: {
          complexity: 'O(1)',
          notes: ['کد کوتاه و خوانا است', 'نیاز به تست واحد دارد'],
        },
      },
    },
  ],
};
