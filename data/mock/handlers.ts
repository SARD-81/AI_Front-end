import { delay, http, HttpResponse } from 'msw';
import { endpoints } from '@/data/http/endpoints';
import { mockMessages, mockModels, mockPrompts, mockThreads } from '@/data/mock/data';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const pageSize = 15;

const getScenario = (request: Request) => request.headers.get('x-demo-scenario') ?? 'normal';

export const handlers = [
  http.get(endpoints.threads, async ({ request }) => {
    const query = new URL(request.url).searchParams.get('query')?.trim();
    await delay(180);
    const scenario = getScenario(request);
    if (scenario === 'heavy_threads') {
      await delay(700);
    }
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
      tags: ['کار'],
    };
    mockThreads.unshift(newThread);
    mockMessages[newThread.id] = [];
    return HttpResponse.json(clone(newThread), { status: 201 });
  }),

  http.patch('/threads/:threadId', async ({ params, request }) => {
    const body = (await request.json()) as { title: string };
    const thread = mockThreads.find((item) => item.id === params.threadId);
    if (!thread) return HttpResponse.json({ message: 'پیدا نشد' }, { status: 404 });
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

  http.get('/threads/:threadId/messages', async ({ params, request }) => {
    const cursor = new URL(request.url).searchParams.get('cursor');
    const start = cursor ? Number(cursor) : 0;
    const all = clone(mockMessages[String(params.threadId)] || []);
    await delay(220);
    const items = all.slice(start, start + pageSize);
    const nextCursor = start + pageSize < all.length ? String(start + pageSize) : undefined;
    return HttpResponse.json({ items, nextCursor });
  }),

  http.get(endpoints.models, async () => HttpResponse.json(clone(mockModels))),
  http.get(endpoints.prompts, async () => HttpResponse.json(clone(mockPrompts))),
  http.post(endpoints.upload, async ({ request }) => {
    const body = (await request.json()) as { name: string; type: string; size: number };
    return HttpResponse.json({
      id: `up-${Date.now()}`,
      name: body.name,
      mimeType: body.type,
      size: body.size,
      uploadedUrl: `demo://upload/${encodeURIComponent(body.name)}`,
    });
  }),

  http.post(endpoints.chat, async ({ request }) => {
    const payload = (await request.json()) as { input?: string };
    const scenario = getScenario(request);

    if (scenario === 'auth_expired') return HttpResponse.json({ message: 'unauthorized' }, { status: 401 });
    if (scenario === 'rate_limited') return HttpResponse.json({ message: 'rate limit' }, { status: 429 });
    if (scenario === 'intermittent_network' && Math.random() > 0.5) {
      return HttpResponse.json({ message: 'server error' }, { status: 500 });
    }
    if (payload.input?.includes('401')) return HttpResponse.json({ message: 'unauthorized' }, { status: 401 });

    const chunks = [
      'در حال تحلیل درخواست شما...',
      '\n```tool\n{"name":"search","status":"running"}\n```\n',
      'نتیجه آماده شد. این یک پاسخ دمو با جزئیات enterprise است.',
    ];

    const stream = new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
          await delay(260);
        }
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-demo-latency': '260',
      },
    });
  }),
];
