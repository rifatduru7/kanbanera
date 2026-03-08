import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppUser {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    role: 'admin' | 'member';
    twoFactorEnabled: boolean;
}

interface AuthState {
    user: AppUser | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    mfaRequired: boolean;
    mfaToken: string | null;

    setUser: (user: AppUser | null) => void;
    setAccessToken: (token: string | null) => void;
    setLoading: (loading: boolean) => void;
    setMfaRequired: (required: boolean, token?: string | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: true,
            mfaRequired: false,
            mfaToken: null,

            setUser: (user) =>
                set({
                    user,
                    isAuthenticated: !!user,
                    mfaRequired: false,
                    mfaToken: null,
                }),

            setAccessToken: (accessToken) =>
                set({ accessToken }),

            setLoading: (isLoading) =>
                set({ isLoading }),

            setMfaRequired: (mfaRequired, mfaToken = null) =>
                set({ mfaRequired, mfaToken }),

            logout: () =>
                set({
                    user: null,
                    accessToken: null,
                    isAuthenticated: false,
                    mfaRequired: false,
                    mfaToken: null,
                }),
        }),
        {
            name: 'era-kanban-auth',
            partialize: (state) => ({
                accessToken: state.accessToken,
                user: state.user,
            }),
        }
    )
);
