import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, AuthState } from '../event_types/user';
import API from '../lib/server';
import { integrationsForTier, FREE_INTEGRATIONS } from '../lib/integrations';

const DEFAULT_CONFIG = {
    role: 'user' as const,
    tier: 'free' as const,
    enabledIntegrations: [...FREE_INTEGRATIONS],
};
const sessionGet = (): User | null => {
    try { return JSON.parse(localStorage.getItem('ep_session') ?? 'null'); }
    catch { return null; }
};
const sessionSet = (user: User | null) => {
    if (user) localStorage.setItem('ep_session', JSON.stringify(user));
    else localStorage.removeItem('ep_session');
};

// Context

interface AuthContextValue extends AuthState {
    login: (username: string, password: string) => Promise<{ error: string | null }>;
    register: (username: string, password: string) => Promise<{ error: string | null }>;
    // Logout is synchronous because it only clears the in-memory state and local session.
    logout: () => void;
    upgradeToPremium: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({ user: null, isAuthenticated: false });

    useEffect(() => {
        const stored = sessionGet();
        if (stored) setState({ user: stored, isAuthenticated: true });
    }, []);

    const fetchConfig = async (userId: string): Promise<Partial<User>> => {
        try {
            const res = await fetch(`${API}/config?userId=${userId}`);
            if (!res.ok) return {};
            return await res.json();
        } catch {
            return {};
        }
    };

    const login = async (username: string, password: string): Promise<{ error: string | null }> => {
        try {
            const res = await fetch(`${API}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            if (!res.ok) {
                const data = await res.json();
                return { error: data.message ?? 'Login failed.' };
            }
            const base: User = await res.json();
            // Login is a two-step merge: first the base auth payload, then the
            // saved config so the session reflects the user's current tier.
            const config = await fetchConfig(base.id);

            const user: User = {
                ...DEFAULT_CONFIG,
                ...base,
                ...config,
            };
            sessionSet(user);
            setState({ user, isAuthenticated: true });
            return { error: null };
        } catch {
            return { error: 'Could not reach the server.' };
        }
    };

    const register = async (username: string, password: string): Promise<{ error: string | null }> => {
        try {
            const res = await fetch(`${API}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) return { error: data.message ?? 'Registration failed.' };

            // New accounts get a default config row before the immediate login,
            // which keeps the session data and the config table in sync.
            if (data.id) {
                await fetch(`${API}/config?userId=${data.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(DEFAULT_CONFIG),
                });
            }

            // Registration succeeded — log in immediately
            // The login function will now also fetch and merge the default config
            return login(username, password);
        } catch {
            return { error: 'Could not reach the server.' };
        }
    };

    const logout = () => {
        sessionSet(null);
        setState({ user: null, isAuthenticated: false });
    };

    const upgradeToPremium = async (): Promise<void> => {
        if (!state.user) return;
        try {
            const updated: User = {
                ...state.user,
                tier: 'premium',
                enabledIntegrations: integrationsForTier('premium'),
            };
            // Premium is modeled as a config change, which keeps the auth layer
            // simple and lets the UI react to one persisted source of truth.
            await fetch(`${API}/config?userId=${state.user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: updated.role, // Ensure role is also sent if it's part of the config
                    tier: updated.tier,
                    enabledIntegrations: updated.enabledIntegrations,
                }),
            });
            sessionSet(updated);
            setState({ user: updated, isAuthenticated: true });
        } catch {
            // Optionally surface error to the user
        }
    };

    // Re-sync context after external mutations (e.g. settings page toggling integrations)
    const refreshUser = async (): Promise<void> => {
        if (!state.user) return;
        try {
            const config = await fetchConfig(state.user.id);
            const updated: User = { ...state.user, ...config };
            sessionSet(updated);
            setState({ user: updated, isAuthenticated: true });
        } catch {
        }
    };

    return (
        <AuthContext.Provider value={{ ...state, login, register, logout, upgradeToPremium, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
