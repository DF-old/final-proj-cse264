export type UserRole = 'user' | 'admin';
export type UserTier = 'free' | 'premium';

// User interface contains the info needed, such as username and tier status
export interface User {
  id: string;
  username: string;
  email: string; // Not used
  role: UserRole;
  tier: UserTier;
  createdAt: string;
  enabledIntegrations: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
