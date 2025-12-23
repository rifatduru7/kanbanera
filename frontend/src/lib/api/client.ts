import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../../stores/authStore';

// API Base URL - use environment variable or default to local backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Create axios instance
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // For refresh token cookies
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest) {
            // Try to refresh token
            try {
                const refreshResponse = await axios.post(
                    `${API_BASE_URL}/api/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const newToken = refreshResponse.data.data?.accessToken;
                if (newToken) {
                    useAuthStore.getState().setAccessToken(newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, logout user
                useAuthStore.getState().logout();
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Auth API
export const authApi = {
    login: async (email: string, password: string) => {
        const response = await api.post<ApiResponse<{ user: any; accessToken: string }>>('/api/auth/login', { email, password });
        return response.data;
    },

    register: async (name: string, email: string, password: string) => {
        const response = await api.post<ApiResponse<{ user: any; accessToken: string }>>('/api/auth/register', { full_name: name, email, password });
        return response.data;
    },

    logout: async () => {
        const response = await api.post<ApiResponse<null>>('/api/auth/logout');
        return response.data;
    },

    getMe: async () => {
        const response = await api.get<ApiResponse<{ user: any }>>('/api/auth/me');
        return response.data;
    },

    updateProfile: async (data: { full_name?: string; avatar_url?: string }) => {
        const response = await api.put<ApiResponse<{ user: any }>>('/api/users/me', data);
        return response.data;
    },
};

// Projects API
export const projectsApi = {
    getProjects: async () => {
        const response = await api.get<ApiResponse<{ projects: any[] }>>('/api/projects');
        return response.data;
    },

    getProject: async (id: string) => {
        const response = await api.get<ApiResponse<{ project: any; columns: any[]; members: any[] }>>(`/api/projects/${id}`);
        return response.data;
    },

    createProject: async (data: { name: string; description?: string }) => {
        const response = await api.post<ApiResponse<{ project: any }>>('/api/projects', data);
        return response.data;
    },

    updateProject: async (id: string, data: Partial<{ name: string; description: string }>) => {
        const response = await api.put<ApiResponse<{ project: any }>>(`/api/projects/${id}`, data);
        return response.data;
    },

    deleteProject: async (id: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/projects/${id}`);
        return response.data;
    },
};

// Tasks API
export const tasksApi = {
    getTask: async (id: string) => {
        const response = await api.get<ApiResponse<{ task: any }>>(`/api/tasks/${id}`);
        return response.data;
    },

    createTask: async (data: { column_id: string; title: string; description?: string; priority?: string; due_date?: string }) => {
        const response = await api.post<ApiResponse<{ task: any }>>('/api/tasks', data);
        return response.data;
    },

    updateTask: async (id: string, data: Partial<{ title: string; description: string; priority: string; due_date: string }>) => {
        const response = await api.put<ApiResponse<{ task: any }>>(`/api/tasks/${id}`, data);
        return response.data;
    },

    moveTask: async (id: string, data: { column_id: string; position: number }) => {
        const response = await api.post<ApiResponse<{ task: any }>>(`/api/tasks/${id}/move`, data);
        return response.data;
    },

    deleteTask: async (id: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/tasks/${id}`);
        return response.data;
    },

    // Subtasks
    addSubtask: async (taskId: string, title: string) => {
        const response = await api.post<ApiResponse<{ subtask: any }>>(`/api/tasks/${taskId}/subtasks`, { title });
        return response.data;
    },

    toggleSubtask: async (taskId: string, subtaskId: string, isCompleted: boolean) => {
        const response = await api.put<ApiResponse<{ subtask: any }>>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { is_completed: isCompleted });
        return response.data;
    },

    deleteSubtask: async (taskId: string, subtaskId: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/tasks/${taskId}/subtasks/${subtaskId}`);
        return response.data;
    },

    // Comments
    addComment: async (taskId: string, content: string) => {
        const response = await api.post<ApiResponse<{ comment: any }>>(`/api/tasks/${taskId}/comments`, { content });
        return response.data;
    },

    deleteComment: async (taskId: string, commentId: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/tasks/${taskId}/comments/${commentId}`);
        return response.data;
    },
};

// Columns API
export const columnsApi = {
    createColumn: async (projectId: string, data: { name: string }) => {
        const response = await api.post<ApiResponse<{ column: any }>>(`/api/columns`, { project_id: projectId, ...data });
        return response.data;
    },

    updateColumn: async (id: string, data: Partial<{ name: string; wip_limit: number }>) => {
        const response = await api.put<ApiResponse<{ column: any }>>(`/api/columns/${id}`, data);
        return response.data;
    },

    deleteColumn: async (id: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/columns/${id}`);
        return response.data;
    },

    reorderColumns: async (projectId: string, columnIds: string[]) => {
        const response = await api.post<ApiResponse<null>>(`/api/columns/reorder`, { project_id: projectId, column_ids: columnIds });
        return response.data;
    },
};
