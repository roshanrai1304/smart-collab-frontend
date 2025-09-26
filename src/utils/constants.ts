// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

// App Configuration
export const APP_NAME = process.env.REACT_APP_APP_NAME || 'Smart Collab';
export const APP_VERSION = process.env.REACT_APP_VERSION || '1.0.0';

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_PREFERENCES: 'userPreferences'
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/',
    REGISTER: '/auth/register/',
    REFRESH: '/auth/token/refresh/',
    PROFILE: '/auth/profile/',
    VERIFY_EMAIL: '/auth/verify-email/',
    RESEND_VERIFICATION: '/auth/resend-verification/'
  },
  ORGANIZATIONS: {
    LIST: '/organizations/',
    DETAIL: (id: string) => `/organizations/${id}/`,
    MEMBERS: (id: string) => `/organizations/${id}/members/`,
    INVITE: (id: string) => `/organizations/${id}/invite/`,
    TEAMS: (id: string) => `/organizations/${id}/teams/`
  },
  DOCUMENTS: {
    LIST: '/documents/',
    DETAIL: (id: string) => `/documents/${id}/`,
    VERSIONS: (id: string) => `/documents/${id}/versions/`,
    PERMISSIONS: (id: string) => `/documents/${id}/permissions/`,
    COMMENTS: (id: string) => `/documents/${id}/comments/`,
    STATS: '/documents/stats/'
  },
  FILES: {
    LIST: '/files/',
    DETAIL: (id: string) => `/files/${id}/`,
    DOWNLOAD: (id: string) => `/files/${id}/download/`,
    PERMISSIONS: (id: string) => `/files/${id}/permissions/`,
    SHARES: (id: string) => `/files/${id}/shares/`,
    STATS: '/files/stats/'
  },
  COLLABORATION: {
    ROOMS: '/collaboration/rooms/',
    ROOM_DETAIL: (id: string) => `/collaboration/rooms/${id}/`,
    JOIN_ROOM: (id: string) => `/collaboration/rooms/${id}/join/`,
    WS_TOKEN: '/collaboration/ws-token/',
    STATS: '/collaboration/rooms/stats/'
  }
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50
  }
} as const;

// UI Constants
export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  TOAST_DURATION: 5000,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 100MB.',
  UNSUPPORTED_FILE_TYPE: 'File type is not supported.'
} as const;
