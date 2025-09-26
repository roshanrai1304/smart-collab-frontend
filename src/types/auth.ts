// Authentication related types
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_timezone: string;
  is_email_verified: boolean;
  date_joined: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  timezone?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string, newPasswordConfirm: string) => Promise<void>;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
