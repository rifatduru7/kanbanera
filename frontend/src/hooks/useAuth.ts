import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api/client';
import { useAuthStore } from '../stores/authStore';

// Query keys
export const authKeys = {
    me: ['auth', 'me'] as const,
};

// Get current user hook
export function useCurrentUser() {
    const { setUser, setLoading, accessToken } = useAuthStore();

    return useQuery({
        queryKey: authKeys.me,
        queryFn: async () => {
            const response = await authApi.getMe();
            if (response.success && response.data) {
                setUser(response.data.user);
                return response.data.user;
            }
            throw new Error(response.message || 'Failed to fetch user');
        },
        enabled: !!accessToken,
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
        meta: {
            onSettled: () => setLoading(false),
        },
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
            if (data) {
                setAccessToken(data.accessToken);
                setUser(data.user);
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
            if (data) {
                setAccessToken(data.accessToken);
                setUser(data.user);
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
