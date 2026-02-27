export const API_ENDPOINTS = {
  auth: {
    login: '/api/app/auth/login',
    me: '/api/app/auth/me',
    logout: '/api/app/auth/logout',
    register: {
      requestOtp: '/api/app/auth/register/request-otp',
      verifyOtp: '/api/app/auth/register/verify-otp',
      complete: '/api/app/auth/register/complete'
    }
  },
  conversations: {
    list: '/api/app/conversations',
    byId: (id: string) => `/api/app/conversations/${id}`,
    messages: (id: string) => `/api/app/conversations/${id}/messages`
  },
  chat: {
    send: '/api/app/chat/send'
  },
  messages: {
    feedback: (id: string) => `/api/app/messages/${id}/feedback`
  }
};
