export type UserRole = 'user' | 'admin';
export type UserTier = 'free' | 'premium';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  tier: UserTier;
  createdAt: string;
  enabledIntegrations: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
