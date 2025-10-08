export const APP_CONFIG = {
  NAME: 'dich-chat',
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  MAX_BIO_LENGTH: 500,
  MAX_MESSAGE_LENGTH: 2000
} as const

export const API_ENDPOINTS = {
  AUTH: {
    ME: '/auth/me',
    LOGOUT: '/auth/logout'
  },
  USERS: {
    ME: '/api/users/me',
    SEARCH: '/api/users/search'
  },
  CHAT: {
    HISTORY: '/api/chat/history'
  },
  CONVERSATIONS: {
    LIST: '/api/conversations',
    BY_ID: (id: string) => `/api/conversations/${id}`,
    MESSAGES: (id: string) => `/api/conversations/${id}/messages`
  }
} as const
