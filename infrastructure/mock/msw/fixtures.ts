import type { ChatMessage, ChatThread, StreamEvent } from "@/domain/types/chat";

const now = Date.now();

export const mockThreads: ChatThread[] = [
  { id: "t1", title: "برنامه‌ریزی محصول", updatedAt: new Date(now - 1000 * 60 * 20).toISOString() },
  { id: "t2", title: "تحلیل داده فروش", updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString() },
  { id: "t3", title: "سوالات کدنویسی", updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 15).toISOString() },
];

export const mockMessages: Record<string, ChatMessage[]> = {
  t1: [
    { id: "m1", threadId: "t1", role: "user", content: "یک برنامه انتشار سه‌ماهه بده", createdAt: new Date(now - 200000).toISOString() },
    { id: "m2", threadId: "t1", role: "assistant", content: "حتماً! ابتدا اهداف کلیدی را تعریف کنید.", reasoning: "کاربر درخواست roadmap دارد.", createdAt: new Date(now - 190000).toISOString() },
  ],
};

export const streamSamples: Record<string, StreamEvent[]> = {
  reasoning: [
    { type: "delta", reasoning: "در حال تحلیل درخواست و استخراج قیود..." },
    { type: "delta", content: "برای شروع، سه فاز تعریف می‌کنیم:\n" },
    { type: "delta", content: "1) کشف نیاز\n2) پیاده‌سازی\n3) بهینه‌سازی" },
    { type: "done", usage: { prompt: 120, completion: 90 } },
  ],
  tool: [
    { type: "tool", payload: { name: "search", args: { q: "OKR template" }, result: [{ id: 1, title: "نمونه OKR" }] } },
    { type: "delta", content: "نتیجه ابزار دریافت شد و خلاصه آماده است." },
    { type: "done" },
  ],
  codeMath: [
    { type: "delta", content: "نمونه کد:\n```ts\nconst sum = (a:number,b:number)=>a+b;\n```\n" },
    { type: "delta", content: "و فرمول: $E=mc^2$" },
    { type: "done" },
  ],
};
