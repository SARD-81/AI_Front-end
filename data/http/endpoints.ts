export const API_BASE_URL = 'TODO_SET_BASE_URL';

// TODO(BE): Confirm exact endpoint paths and pagination (cursor vs page).
// TODO(BE): Confirm auth method: Bearer token vs cookies; refresh flow.
export const endpoints = {
  threads: '/threads', // GET, POST
  threadById: (threadId: string) => `/threads/${threadId}`, // PATCH, DELETE
  threadMessages: (threadId: string) => `/threads/${threadId}/messages`, // GET
  chat: '/chat', // POST streaming OR switch to /threads/:id/chat
};
