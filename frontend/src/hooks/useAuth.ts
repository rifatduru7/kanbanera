import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api/client';
import { useAuthStore } from '../stores/authStore';

// Query keys
export const authKeys = {
    me: ['auth', 'me'] as const,
};

interface AuthSuccessData {
    user: ReturnType<typeof useAuthStore.getState>['user'];
    accessToken: string;
}

// Get current user hook
export function useCurrentUser() {
    const { setUser, setLoading, accessToken } = useAuthStore();

    useEffect(() => {
        if (!accessToken) {
            setLoading(false);
        }
    }, [accessToken, setLoading]);

    return useQuery({
        queryKey: authKeys.me,
        queryFn: async () => {
            try {
                const response = await authApi.getMe();
                if (response.success && response.data) {
                    const user = response.data.user;
                    setUser(user || null);
                    return user;
                }
                throw new Error(response.message || 'Failed to fetch user');
            } finally {
                setLoading(false);
            }
        },
        enabled: !!accessToken,
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// Login mutation
export function useLogin() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { setUser, setAccessToken } = useAuthStore();

    return useMutation({
        mutationFn: async ({ email, password }: { email: string; password: string }) => {
            const response = await authApi.login(email, password);
            if (!response.success) {
                throw new Error(response.message || 'Login failed');
            }
            return response.data;
        },
        onSuccess: (data) => {
            if (data && 'accessToken' in data && 'user' in data) {
                const payload = data as AuthSuccessData;
                setAccessToken(payload.accessToken || null);
                setUser(payload.user || null);
                queryClient.invalidateQueries({ queryKey: authKeys.me });
                navigate('/dashboard');
            }
        },
    });
}

// Register mutation
export function useRegister() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { setUser, setAccessToken } = useAuthStore();

    return useMutation({
        mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
            const response = await authApi.register(name, email, password);
            if (!response.success) {
                throw new Error(response.message || 'Registration failed');
            }
            return response.data;
        },
        onSuccess: (data) => {
            if (data && 'accessToken' in data && 'user' in data) {
                const payload = data as AuthSuccessData;
                setAccessToken(payload.accessToken || null);
                setUser(payload.user || null);
                queryClient.invalidateQueries({ queryKey: authKeys.me });
                navigate('/dashboard');
            }
        },
    });
}

// Logout mutation
export function useLogout() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { logout } = useAuthStore();

    return useMutation({
        mutationFn: async () => {
            await authApi.logout();
        },
        onSuccess: () => {
            logout();
            queryClient.clear();
            navigate('/login');
        },
        onError: () => {
            // Logout locally even if API fails
            logout();
            queryClient.clear();
            navigate('/login');
        },
    });
}
