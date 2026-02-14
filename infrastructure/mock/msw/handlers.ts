import { delay, http, HttpResponse } from "msw";
import { ENDPOINTS } from "@/infrastructure/http/endpoints";
import { mockMessages, mockThreads, streamSamples } from "./fixtures";

const encoder = new TextEncoder();
let threads = [...mockThreads];

function streamFromEvents(events: unknown[]) {
  return new ReadableStream({
    async start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        await delay(180);
      }
      controller.close();
    },
  });
}

export const handlers = [
  http.get(ENDPOINTS.threads, () => HttpResponse.json({ items: threads, nextCursor: null })),
  http.post(ENDPOINTS.threads, async ({ request }) => {
    const body = (await request.json()) as { title?: string };
    const newThread = { id: crypto.randomUUID(), title: body.title ?? "گفتگوی جدید", updatedAt: new Date().toISOString() };
    threads = [newThread, ...threads];
    return HttpResponse.json(newThread);
  }),
  http.patch(ENDPOINTS.threadById(":id"), async ({ params, request }) => {
    const body = (await request.json()) as { title: string };
    threads = threads.map((t) => (t.id === params.id ? { ...t, title: body.title } : t));
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(ENDPOINTS.threadById(":id"), ({ params }) => {
    threads = threads.filter((t) => t.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(ENDPOINTS.messagesByThread(":id"), ({ params }) => HttpResponse.json(mockMessages[String(params.id)] ?? [])),
  http.post(ENDPOINTS.chat, async ({ request }) => {
    const body = (await request.json()) as { content?: string };
    if (body.content?.includes("401")) return HttpResponse.json({ message: "unauthorized" }, { status: 401 });
    if (body.content?.includes("429")) return HttpResponse.json({ message: "rate" }, { status: 429 });
    const sample = body.content?.includes("ابزار") ? streamSamples.tool : body.content?.includes("کد") ? streamSamples.codeMath : streamSamples.reasoning;
    return new HttpResponse(streamFromEvents(sample), {
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }),
];
