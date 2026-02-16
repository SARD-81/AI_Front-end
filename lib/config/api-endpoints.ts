export const API_ENDPOINTS = {
  chatsBase: '/chats',
  chatById: (id: string) => `/chats/${id}`,
  chatMessages: (id: string) => `/chats/${id}/messages`
  // TODO(BACKEND): adjust these endpoint paths if your backend uses a different route contract.
};
