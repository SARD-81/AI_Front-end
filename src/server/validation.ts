export type ChatRole = 'system' | 'user' | 'assistant';

export type StreamChatInput = {
  chatId: string;
  messages: Array<{role: ChatRole; content: string}>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function validateStreamChatInput(value: unknown): StreamChatInput {
  if (!isRecord(value)) throw new Error('Invalid request payload.');
  const {chatId, messages, model, temperature, max_tokens} = value;

  if (typeof chatId !== 'string' || !chatId.trim()) throw new Error('chatId is required.');
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('messages must be a non-empty array.');

  const normalized = messages.map((message) => {
    if (!isRecord(message)) throw new Error('Each message must be an object.');
    if (message.role !== 'system' && message.role !== 'user' && message.role !== 'assistant') {
      throw new Error('Invalid message role.');
    }
    if (typeof message.content !== 'string' || !message.content.trim()) {
      throw new Error('Message content is required.');
    }
    return {role: message.role, content: message.content};
  });

  if (model !== undefined && typeof model !== 'string') throw new Error('model must be string.');
  if (temperature !== undefined && typeof temperature !== 'number') throw new Error('temperature must be number.');
  if (max_tokens !== undefined && (!Number.isInteger(max_tokens) || max_tokens <= 0)) {
    throw new Error('max_tokens must be a positive integer.');
  }

  return {chatId, messages: normalized, model: model as string | undefined, temperature: temperature as number | undefined, max_tokens: max_tokens as number | undefined};
}

export function validateTitle(value: unknown) {
  if (!isRecord(value)) return {title: undefined};
  const title = value.title;
  if (title === undefined) return {title: undefined};
  if (typeof title !== 'string' || !title.trim() || title.length > 120) {
    throw new Error('title must be between 1 and 120 characters.');
  }
  return {title};
}

export function validateMessagesList(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.messages)) {
    throw new Error('messages must be provided.');
  }
  return value.messages.map((message) => {
    if (!isRecord(message)) throw new Error('message must be object.');
    if (message.role !== 'system' && message.role !== 'user' && message.role !== 'assistant') {
      throw new Error('Invalid message role.');
    }
    if (typeof message.content !== 'string' || !message.content.trim()) {
      throw new Error('Message content is required.');
    }
    if (message.avalaiRequestId !== undefined && typeof message.avalaiRequestId !== 'string') {
      throw new Error('avalaiRequestId must be a string.');
    }
    return {
      role: message.role,
      content: message.content,
      avalaiRequestId: message.avalaiRequestId as string | undefined
    };
  });
}

export function validateLookupRequest(value: unknown) {
  if (!isRecord(value)) {
    throw new Error('requestId is required.');
  }
  const requestId = value.requestId ?? value.request_id;
  if (typeof requestId !== 'string' || !requestId.trim()) {
    throw new Error('requestId (or request_id) is required.');
  }
  return requestId;
}
