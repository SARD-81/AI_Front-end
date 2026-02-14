import type {AppRole} from './app-chat-store';

type TitlePayload = {
  title?: string;
};

type MessagePayload = {
  role: AppRole;
  content: string;
  avalaiRequestId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function validateTitle(value: unknown): TitlePayload {
  if (!isRecord(value)) {
    return {title: undefined};
  }

  if (value.title === undefined) {
    return {title: undefined};
  }

  if (typeof value.title !== 'string') {
    throw new Error('title must be a string.');
  }

  const title = value.title.trim();
  if (!title || title.length > 120) {
    throw new Error('title must be between 1 and 120 characters.');
  }

  return {title};
}

export function validateMessages(value: unknown): MessagePayload[] {
  if (!isRecord(value) || !Array.isArray(value.messages)) {
    throw new Error('messages must be provided as an array.');
  }

  if (value.messages.length === 0) {
    throw new Error('messages must contain at least one item.');
  }

  return value.messages.map((message) => {
    if (!isRecord(message)) {
      throw new Error('each message must be an object.');
    }

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
      avalaiRequestId: message.avalaiRequestId
    };
  });
}
