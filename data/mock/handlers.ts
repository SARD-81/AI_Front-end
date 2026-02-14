import { delay, http, HttpResponse } from 'msw';
import { endpoints } from '@/data/http/endpoints';
import { mockMessages, mockThreads } from '@/data/mock/data';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const handlers = [
  http.get(endpoints.threads, async ({ request }) => {
    const query = new URL(request.url).searchParams.get('query')?.trim();
    await delay(200);
    if (!query) {
      return HttpResponse.json(clone(mockThreads));
    }
    const filtered = mockThreads.filter((thread) => thread.title.includes(query));
    return HttpResponse.json(clone(filtered));
  }),

  http.post(endpoints.threads, async ({ request }) => {
    const body = (await request.json()) as { title?: string };
    const newThread = {
      id: `t-${Date.now()}`,
      title: body.title?.trim() || 'گفتگوی جدید',
      updatedAt: new Date().toISOString(),
      preview: '',
    };
    mockThreads.unshift(newThread);
    mockMessages[newThread.id] = [];
    return HttpResponse.json(clone(newThread), { status: 201 });
  }),

  http.patch('/threads/:threadId', async ({ params, request }) => {
    const body = (await request.json()) as { title: string };
    const thread = mockThreads.find((item) => item.id === params.threadId);
    if (!thread) {
      return HttpResponse.json({ message: 'پیدا نشد' }, { status: 404 });
    }
    thread.title = body.title;
    return HttpResponse.json(clone(thread));
  }),

  http.delete('/threads/:threadId', async ({ params }) => {
    const idx = mockThreads.findIndex((item) => item.id === params.threadId);
    if (idx >= 0) {
      const [removed] = mockThreads.splice(idx, 1);
      delete mockMessages[removed.id];
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/threads/:threadId/messages', async ({ params }) => {
    await delay(150);
    return HttpResponse.json(clone(mockMessages[String(params.threadId)] || []));
  }),

  http.post(endpoints.chat, async ({ request }) => {
    const payload = (await request.json()) as { input?: string };
    if (payload.input?.includes('401')) {
      return HttpResponse.json({ message: 'unauthorized' }, { status: 401 });
    }
    if (payload.input?.includes('429')) {
      return HttpResponse.json({ message: 'rate limit' }, { status: 429 });
    }

    const chunks = ['پاسخ در حال تولید است', ' ... ', 'این یک پاسخ نمونه از حالت دمو است.'];

    const stream = new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
          await delay(350);
        }
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }),
];
