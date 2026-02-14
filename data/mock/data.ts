import type { Message, ModelInfo, PromptTemplate, Thread } from '@/domain/types/chat';

const now = Date.now();
const tagsPool = ['کار', 'شخصی', 'باگ', 'تحقیق'];

export const mockModels: ModelInfo[] = [
  { id: 'deepseek-lite-demo', name: 'DeepSeek Lite (Demo)', contextWindow: 32000, provider: 'DemoLab' },
  { id: 'reasoner-pro-demo', name: 'Reasoner Pro (Demo)', contextWindow: 128000, provider: 'DemoLab' },
];

export const mockPrompts: PromptTemplate[] = [
  { id: 'p1', title: 'تحلیل باگ', content: 'این خطا را تحلیل کن و راه‌حل مرحله‌ای بده:', category: 'باگ' },
  { id: 'p2', title: 'برنامه پروژه', content: 'برای پروژه زیر یک برنامه اجرایی ۲ هفته‌ای بنویس:', category: 'کار' },
  { id: 'p3', title: 'یادگیری شخصی', content: 'برای من برنامه یادگیری شخصی‌سازی‌شده ایجاد کن:', category: 'شخصی' },
];

export const mockThreads: Thread[] = Array.from({ length: 24 }).map((_, index) => ({
  id: `t-${index + 1}`,
  title: `گفتگو ${index + 1} - ${index % 2 === 0 ? 'تحلیل محصول' : 'برنامه‌ریزی'}`,
  updatedAt: new Date(now - 1000 * 60 * (index + 1)).toISOString(),
  preview: 'خلاصه‌ای از گفتگو برای نمایش در لیست...',
  tags: [tagsPool[index % tagsPool.length]],
  note: 'یادداشت زمینه‌ای این گفتگو.',
  pinnedMessageIds: index % 4 === 0 ? [`m-${index + 1}-2`] : [],
  model: index % 3 === 0 ? 'reasoner-pro-demo' : 'deepseek-lite-demo',
}));

export const mockMessages: Record<string, Message[]> = Object.fromEntries(
  mockThreads.map((thread, threadIndex) => {
    const messages = Array.from({ length: 35 }).map((_, messageIndex) => {
      const isUser = messageIndex % 2 === 0;
      return {
        id: `m-${threadIndex + 1}-${messageIndex + 1}`,
        threadId: thread.id,
        role: isUser ? 'user' : 'assistant',
        content: isUser
          ? `پیام کاربر شماره ${messageIndex + 1} برای ${thread.title}`
          : `پاسخ دستیار شماره ${messageIndex + 1} با جزئیات فنی و ساختارمند.`,
        createdAt: new Date(now - 1000 * 30 * (messageIndex + 1)).toISOString(),
        model: thread.model,
        metrics: { latencyMs: 300 + messageIndex * 3, tokensIn: 120, tokensOut: 260 },
        pinned: thread.pinnedMessageIds?.includes(`m-${threadIndex + 1}-${messageIndex + 1}`),
      } as Message;
    });

    messages.splice(3, 0, {
      id: `tool-${thread.id}`,
      threadId: thread.id,
      role: 'tool',
      content: 'Tool execution result',
      createdAt: new Date(now - 1000 * 60).toISOString(),
      toolCall: { name: 'search', payload: { query: 'enterprise ui', hits: 5 } },
      rawToolCalls: { callId: 'tc-1', status: 'success' },
    });

    return [thread.id, messages];
  }),
);
