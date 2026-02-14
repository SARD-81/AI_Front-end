export const API_BASE_URL = 'TODO_SET_BASE_URL';
// TODO(BE): API_BASE_URL must be provided per environment and secured.

// TODO(BE): Confirm exact endpoint paths and query params, including cursor names and nextCursor mapping.
// TODO(BE): Confirm auth header vs cookie strategy and refresh-token flow.
export const endpoints = {
  threads: '/threads',
  threadById: (threadId: string) => `/threads/${threadId}`,
  threadMessages: (threadId: string) => `/threads/${threadId}/messages`,
  chat: '/chat',
  models: '/models',
  prompts: '/prompts',
  upload: '/uploads',
};

// TODO(BE): Define streaming framing protocol and done/error markers for text/jsonl/sse variants.
// TODO(BE): Define models list response schema including token usage and context fields.
// TODO(BE): Define upload endpoint and signed URL process (initiate/upload/complete).
