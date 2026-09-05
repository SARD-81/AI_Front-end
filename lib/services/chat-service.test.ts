import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/client', () => {
  class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string,
      public readonly payload?: unknown,
      public readonly retryAfter: number | null = null
    ) {
      super(message);
    }
  }

  return {
    ApiError,
    apiFetch: apiFetchMock,
    getApiBaseUrl: () => 'http://example.test'
  };
});

import {
  ChatWebSocketError,
  requestChatWsTicket,
  sendMessageWithWebSocket
} from '@/lib/services/chat-service';

type Scenario = (socket: FakeWebSocket) => void;
const scenarios: Scenario[] = [];
const sockets: FakeWebSocket[] = [];

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  readonly sent: string[] = [];
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: {data: string}) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: ((event: {code: number; reason: string}) => void) | null = null;

  constructor(public readonly url: string) {
    sockets.push(this);
    const scenario = scenarios.shift();
    Promise.resolve().then(() => scenario?.(this));
  }

  send(data: string) {
    this.sent.push(String(data));
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }

  emitOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.({});
  }

  emitMessage(data: unknown) {
    this.onmessage?.({data: JSON.stringify(data)});
  }

  emitError() {
    this.onerror?.({});
  }

  emitClose(code: number, reason = '') {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({code, reason});
  }
}

const CLIENT_MESSAGE_ID = '123e4567-e89b-42d3-a456-426614174000';

function payload() {
  return {
    content: 'hello',
    clientMessageId: CLIENT_MESSAGE_ID,
    thinkLevel: 'low' as const
  };
}

function answer() {
  return {
    type: 'answer',
    data: {
      id: 'assistant-message',
      client_message_id: CLIENT_MESSAGE_ID,
      role: 'assistant',
      content: 'answer',
      created_at: '2026-09-05T00:00:00.000Z'
    }
  };
}

describe('chat websocket hardening contract', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ticket: 'ticket', expires_in: 30});
    scenarios.length = 0;
    sockets.length = 0;
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('passes the abort signal while requesting a websocket ticket', async () => {
    const controller = new AbortController();

    await requestChatWsTicket({signal: controller.signal});

    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        signal: controller.signal
      })
    );
  });

  it('does not start ticket or socket work when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      sendMessageWithWebSocket('conversation', payload(), {
        signal: controller.signal
      })
    ).rejects.toMatchObject({code: 'ABORTED'});

    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(sockets).toHaveLength(0);
  });

  it('preserves an explicitly configured wss base URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_WS_BASE_URL', 'wss://socket.example.test');
    scenarios.push((socket) => {
      socket.emitOpen();
      socket.emitMessage({type: 'connected'});
      socket.emitMessage(answer());
    });

    await sendMessageWithWebSocket('conversation', payload());

    expect(sockets[0]?.url).toMatch(
      /^wss:\/\/socket\.example\.test\/ws\/chat\/conversation\//
    );
  });

  it('does not send until the backend connected frame arrives', async () => {
    let sentBeforeConnected = -1;

    scenarios.push((socket) => {
      socket.emitOpen();
      sentBeforeConnected = socket.sent.length;
      socket.emitMessage({type: 'connected', conversation_id: 'conversation'});
      socket.emitMessage(answer());
    });

    const result = await sendMessageWithWebSocket(
      'conversation',
      payload()
    );

    expect(sentBeforeConnected).toBe(0);
    expect(sockets[0]?.sent).toHaveLength(1);
    expect(JSON.parse(sockets[0].sent[0])).toMatchObject({
      message: 'hello',
      client_message_id: CLIENT_MESSAGE_ID,
      think_level: 'low'
    });
    expect(result.content).toBe('answer');
  });

  it('preserves a locked close code even when onerror fires first', async () => {
    scenarios.push((socket) => {
      socket.emitOpen();
      socket.emitError();
      socket.emitClose(4403, 'locked');
    });

    try {
      await sendMessageWithWebSocket('conversation', payload());
      throw new Error('Expected websocket send to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ChatWebSocketError);
      expect(error).toMatchObject({
        code: 'LOCKED',
        closeCode: 4403,
        isLocked: true
      });
    }
  });

  it('reuses the same client_message_id on a retryable replay', async () => {
    vi.useFakeTimers();

    scenarios.push(
      (socket) => {
        socket.emitOpen();
        socket.emitMessage({type: 'connected'});
        socket.emitMessage({
          type: 'error',
          code: 'ai_timeout',
          error: 'temporary timeout'
        });
      },
      (socket) => {
        socket.emitOpen();
        socket.emitMessage({type: 'connected'});
        socket.emitMessage(answer());
      }
    );

    const pending = sendMessageWithWebSocket('conversation', payload());
    // Flush the async ticket resolution and first socket scenario without
    // coupling this test to an exact number of promise microtasks.
    await vi.advanceTimersByTimeAsync(0);

    expect(sockets).toHaveLength(1);
    expect(JSON.parse(sockets[0].sent[0]).client_message_id).toBe(
      CLIENT_MESSAGE_ID
    );

    await vi.advanceTimersByTimeAsync(1_500);
    const result = await pending;

    expect(sockets).toHaveLength(2);
    expect(JSON.parse(sockets[1].sent[0]).client_message_id).toBe(
      CLIENT_MESSAGE_ID
    );
    expect(result.content).toBe('answer');
  });
});
