export const API_ENDPOINTS = {
  auth: {
    login: '/api/app/auth/login',
    setInitialPassword: '/api/app/auth/set-initial-password',
    me: '/api/app/auth/me',
    profile: '/api/app/auth/profile',
    logout: '/api/app/auth/logout',
    register: {
      requestOtp: '/api/app/auth/register/request-otp',
      verifyOtp: '/api/app/auth/register/verify-otp',
      complete: '/api/app/auth/register/complete'
    },
    passwordReset: {
      requestOtp: '/api/app/auth/password-reset/request-otp',
      verifyOtp: '/api/app/auth/password-reset/verify-otp',
      complete: '/api/app/auth/password-reset/complete'
    }
  },
  conversations: {
    list: '/api/app/conversations',
    byId: (id: string) => `/api/app/conversations/${id}`,
    messages: (id: string) => `/api/app/conversations/${id}/messages`
  },
  chat: {
    wsTicket: '/api/app/chat/ws-ticket'
  },
  messages: {
    feedback: (id: string) => `/api/app/messages/${id}/feedback`
  },
  health: {
    live: '/api/app/health',
    ready: '/api/app/ready'
  },
  admin: {
    reports: {
      feedback: '/api/app/admin/reports/feedback',
      suspiciousUsers: '/api/app/admin/reports/suspicious-users'
    },
    users: {
      toggleLockById: (userId: string) => `/api/app/admin/users/by-id/${userId}/toggle-lock`,
      toggleLockByStudentId: (studentId: string) =>
        `/api/app/admin/users/${encodeURIComponent(studentId)}/toggle-lock`
    }
  }
};
