export const API_ENDPOINTS = {
  chatsBase: '/api/app/chats',
  chatById: (id: string) => `/api/app/chats/${id}`,
  chatMessages: (id: string) => `/api/app/chats/${id}/messages`
};
