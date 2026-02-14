export const API_BASE_URL = "TODO_SET_BASE_URL";

export const ENDPOINTS = {
  threads: "/threads", // TODO(BE): fill exact threads listing route
  threadById: (threadId: string) => `/threads/${threadId}`,
  messagesByThread: (threadId: string) => `/threads/${threadId}/messages`,
  chat: "/chat", // TODO(BE): fill exact streaming chat route
};
