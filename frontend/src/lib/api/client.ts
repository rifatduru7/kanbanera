import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore, type AppUser } from '../../stores/authStore';

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

        if (error.response?.status === 401 && originalRequest && !(originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })._retry) {
            (originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })._retry = true;
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
            } catch {
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

export interface WebhookIntegration {
    id: string;
    project_id: string;
    provider: 'slack' | 'teams' | 'telegram' | 'webhook';
    webhook_url: string;
    incoming_token: string;
    name: string;
    is_active: number;
    created_at: string;
}

export interface ApiUser {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string | null;
    role: 'admin' | 'member';
    two_factor_enabled?: number;
}

interface AuthPayload {
    user?: ApiUser;
    accessToken?: string;
    mfa_required?: boolean;
    mfa_token?: string;
}

function mapApiUser(user: ApiUser): AppUser {
    return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url ?? undefined,
        role: user.role,
        twoFactorEnabled: !!user.two_factor_enabled,
    };
}

export interface ApiProject {
    id: string;
    name: string;
    description?: string | null;
    color?: string;
    template?: string;
    owner_id?: string;
    is_archived?: number | boolean;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}

export interface ApiProjectMember {
    id: string;
    project_id?: string;
    user_id?: string;
    email?: string;
    full_name?: string;
    role: string;
    avatar_url?: string | null;
    [key: string]: unknown;
}

export interface ApiColumn {
    id: string;
    project_id: string;
    name: string;
    position?: number;
    wip_limit?: number | null;
    color?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}

export interface ApiTask {
    id: string;
    project_id: string;
    column_id: string;
    title: string;
    description?: string | null;
    priority?: string;
    due_date?: string | null;
    assignee_id?: string | null;
    position?: number;
    labels?: string[];
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}

export interface ApiSubtask {
    id: string;
    task_id: string;
    title: string;
    is_completed: boolean | number;
    position?: number;
    created_at?: string;
    [key: string]: unknown;
}

export interface ApiComment {
    id: string;
    task_id: string;
    content: string;
    user_id?: string;
    full_name?: string;
    created_at?: string;
    [key: string]: unknown;
}

export interface ApiAttachment {
    id: string;
    task_id: string;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
    url?: string;
    thumbnail_url?: string;
    created_at?: string;
    [key: string]: unknown;
}

export interface UserPreferences {
    email_notifications: boolean;
    push_notifications: boolean;
}

// Auth API
export const authApi = {
    login: async (email: string, password: string) => {
        const response = await api.post<ApiResponse<AuthPayload>>('/api/auth/login', { email, password });
        const payload = response.data;
        if (payload.success && payload.data) {
            if (payload.data.mfa_required) {
                return {
                    success: true,
                    data: {
                        mfa_required: true,
                        mfa_token: payload.data.mfa_token,
                    },
                } as ApiResponse<AuthPayload & { mfa_required: true }>;
            }
            return {
                success: true,
                data: {
                    user: mapApiUser(payload.data.user!),
                    accessToken: payload.data.accessToken!,
                },
            };
        }
        return {
            success: payload.success,
            error: payload.error,
            message: payload.message,
        } as ApiResponse<{ user: AppUser; accessToken: string }>;
    },

    verify2FA: async (mfa_token: string, code: string) => {
        const response = await api.post<ApiResponse<AuthPayload>>('/api/auth/login/verify', { mfa_token, code });
        const payload = response.data;
        if (payload.success && payload.data) {
            return {
                success: true,
                data: {
                    user: mapApiUser(payload.data.user!),
                    accessToken: payload.data.accessToken!,
                },
            };
        }
        return {
            success: payload.success,
            error: payload.error,
            message: payload.message,
        } as ApiResponse<{ user: AppUser; accessToken: string }>;
    },

    register: async (name: string, email: string, password: string) => {
        const response = await api.post<ApiResponse<AuthPayload>>('/api/auth/register', { full_name: name, email, password });
        const payload = response.data;
        if (payload.success && payload.data) {
            return {
                success: true,
                data: {
                    user: mapApiUser(payload.data.user!),
                    accessToken: payload.data.accessToken!,
                },
            };
        }
        return {
            success: payload.success,
            error: payload.error,
            message: payload.message,
        } as ApiResponse<{ user: AppUser; accessToken: string }>;
    },

    logout: async () => {
        const response = await api.post<ApiResponse<null>>('/api/auth/logout');
        return response.data;
    },

    getMe: async () => {
        const response = await api.get<ApiResponse<{ user: ApiUser }>>('/api/auth/me');
        const payload = response.data;
        if (payload.success && payload.data) {
            return {
                success: true,
                data: { user: mapApiUser(payload.data.user) },
            };
        }
        return {
            success: payload.success,
            error: payload.error,
            message: payload.message,
        } as ApiResponse<{ user: AppUser }>;
    },

    updateProfile: async (data: { full_name?: string; avatar_url?: string }) => {
        const response = await api.put<ApiResponse<{ user: ApiUser }>>('/api/users/me', data);
        const payload = response.data;
        if (payload.success && payload.data) {
            return {
                success: true,
                data: { user: mapApiUser(payload.data.user) },
            };
        }
        return {
            success: payload.success,
            error: payload.error,
            message: payload.message,
        } as ApiResponse<{ user: AppUser }>;
    },

    changePassword: async (data: { currentPassword: string; newPassword: string }) => {
        const response = await api.put<ApiResponse<null>>('/api/auth/password', data);
        return response.data;
    },

    setup2FA: async () => {
        const response = await api.get<ApiResponse<{ secret: string; qrCode: string }>>('/api/auth/2fa/setup');
        return response.data;
    },

    enable2FA: async (secret: string, code: string): Promise<ApiResponse<AuthPayload>> => {
        const response = await api.post<ApiResponse<AuthPayload>>('/api/auth/2fa/enable', { secret, code });
        return response.data;
    },

    disable2FA: async (code: string): Promise<ApiResponse<AuthPayload>> => {
        const response = await api.post<ApiResponse<AuthPayload>>('/api/auth/2fa/disable', { code });
        return response.data;
    },

    forgotPassword: async (email: string) => {
        const response = await api.post<ApiResponse<{ success: true }>>('/api/auth/forgot-password', { email });
        return response.data;
    },

    resetPassword: async (token: string, newPassword: string) => {
        const response = await api.post<ApiResponse<{ success: true; message: string }>>('/api/auth/reset-password', { token, newPassword });
        return response.data;
    },
};


// Projects API
export const projectsApi = {
    getProjects: async () => {
        const response = await api.get<ApiResponse<{ projects: ApiProject[] }>>('/api/projects');
        return response.data;
    },

    getProject: async (id: string) => {
        const response = await api.get<ApiResponse<{ project: ApiProject; columns: ApiColumn[]; tasks: ApiTask[]; members: ApiProjectMember[] }>>(`/api/projects/${id}`);
        return response.data;
    },

    createProject: async (data: { name: string; description?: string }) => {
        const response = await api.post<ApiResponse<{ project: ApiProject }>>('/api/projects', data);
        return response.data;
    },

    updateProject: async (id: string, data: Partial<{ name: string; description: string; is_archived: boolean }>) => {
        const response = await api.put<ApiResponse<{ project: ApiProject }>>(`/api/projects/${id}`, data);
        return response.data;
    },

    deleteProject: async (id: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/projects/${id}`);
        return response.data;
    },

    addMember: async (projectId: string, email: string, role: string) => {
        const response = await api.post<ApiResponse<{ member: ApiProjectMember }>>(`/api/projects/${projectId}/members`, { email, role });
        return response.data;
    },

    updateMemberRole: async (projectId: string, userId: string, role: string) => {
        const response = await api.put<ApiResponse<null>>(`/api/projects/${projectId}/members/${userId}`, { role });
        return response.data;
    },

    removeMember: async (projectId: string, userId: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/projects/${projectId}/members/${userId}`);
        return response.data;
    },

    getProjectColumns: async (projectId: string) => {
        const response = await api.get<ApiResponse<{ columns: ApiColumn[] }>>(`/api/projects/${projectId}/columns`);
        return response.data;
    },

    getIntegrations: async (projectId: string) => {
        const response = await api.get<ApiResponse<{ integrations: WebhookIntegration[] }>>(`/api/projects/${projectId}/integrations`);
        return response.data;
    },

    addIntegration: async (projectId: string, data: { provider: string; webhook_url: string; name: string }) => {
        const response = await api.post<ApiResponse<{ integration: WebhookIntegration }>>(`/api/projects/${projectId}/integrations`, data);
        return response.data;
    },

    updateIntegration: async (projectId: string, integrationId: string, data: { name?: string; webhook_url?: string; is_active?: boolean }) => {
        const response = await api.patch<ApiResponse<{ integration: WebhookIntegration }>>(`/api/projects/${projectId}/integrations/${integrationId}`, data);
        return response.data;
    },

    removeIntegration: async (projectId: string, integrationId: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/projects/${projectId}/integrations/${integrationId}`);
        return response.data;
    },
};

// Tasks API
export const tasksApi = {
    getTask: async (id: string) => {
        const response = await api.get<ApiResponse<{ task: ApiTask }>>(`/api/tasks/${id}`);
        return response.data;
    },

    createTask: async (data: { project_id: string; column_id: string; title: string; description?: string; priority?: string; due_date?: string }) => {
        const response = await api.post<ApiResponse<{ task: ApiTask }>>('/api/tasks', data);
        return response.data;
    },

    updateTask: async (id: string, data: Partial<{ title: string; description: string; priority: string; due_date: string; assignee_id: string; labels: string[] }>) => {
        const response = await api.put<ApiResponse<{ task: ApiTask }>>(`/api/tasks/${id}`, data);
        return response.data;
    },

    moveTask: async (id: string, data: { column_id: string; position: number }) => {
        const response = await api.put<ApiResponse<{ task: ApiTask }>>(`/api/tasks/${id}/move`, data);
        return response.data;
    },

    deleteTask: async (id: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/tasks/${id}`);
        return response.data;
    },

    // Subtasks
    addSubtask: async (taskId: string, title: string) => {
        const response = await api.post<ApiResponse<{ subtask: ApiSubtask }>>(`/api/tasks/${taskId}/subtasks`, { title });
        return response.data;
    },

    toggleSubtask: async (taskId: string, subtaskId: string, isCompleted: boolean) => {
        const response = await api.put<ApiResponse<{ subtask: ApiSubtask }>>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { is_completed: isCompleted });
        return response.data;
    },

    deleteSubtask: async (taskId: string, subtaskId: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/tasks/${taskId}/subtasks/${subtaskId}`);
        return response.data;
    },

    // Comments
    addComment: async (taskId: string, content: string) => {
        const response = await api.post<ApiResponse<{ comment: ApiComment }>>(`/api/tasks/${taskId}/comments`, { content });
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
        const response = await api.post<ApiResponse<{ column: ApiColumn }>>(`/api/columns`, { project_id: projectId, ...data });
        return response.data;
    },

    updateColumn: async (id: string, data: Partial<{ name: string; wip_limit: number | null; color: string }>) => {
        const response = await api.put<ApiResponse<{ column: ApiColumn }>>(`/api/columns/${id}`, data);
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

// Attachments API
export const attachmentsApi = {
    getAttachments: async (taskId: string) => {
        const response = await api.get<ApiResponse<{ attachments: ApiAttachment[] }>>(`/api/attachments/task/${taskId}`);
        return response.data;
    },

    uploadAttachment: async (taskId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<ApiResponse<{ attachment: ApiAttachment }>>(
            `/api/attachments/task/${taskId}`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    deleteAttachment: async (id: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/attachments/${id}`);
        return response.data;
    },

    getDownloadUrl: async (id: string) => {
        const response = await api.get<Blob>(`/api/attachments/${id}/download`, {
            responseType: 'blob'
        });
        return URL.createObjectURL(response.data);
    },
};

export const usersApi = {
    getMyPreferences: async () => {
        const response = await api.get<ApiResponse<{ preferences: UserPreferences }>>('/api/users/me/preferences');
        return response.data;
    },

    updateMyPreferences: async (data: Partial<UserPreferences>) => {
        const response = await api.put<ApiResponse<{ preferences: UserPreferences }>>('/api/users/me/preferences', data);
        return response.data;
    },

    deleteMyAccount: async (data: { password: string; confirmText: string }) => {
        const response = await api.delete<ApiResponse<null>>('/api/users/me', { data });
        return response.data;
    },
};

export interface ActivityResponseItem {
    id: string;
    type: 'task_created' | 'task_moved' | 'comment' | 'file_uploaded' | 'member_joined';
    user: {
        id: string;
        name: string;
        avatar?: string;
        initials: string;
    };
    taskId?: string;
    taskName?: string;
    projectId?: string;
    projectName?: string;
    details?: Record<string, unknown>;
    timestamp: string;
    createdAt: string;
}

export const activitiesApi = {
    getActivities: async (params: { limit?: number; cursor?: string; type?: string; projectId?: string }) => {
        const search = new URLSearchParams();
        if (params.limit) search.set('limit', String(params.limit));
        if (params.cursor) search.set('cursor', params.cursor);
        if (params.type && params.type !== 'all') search.set('type', params.type);
        if (params.projectId) search.set('projectId', params.projectId);

        const response = await api.get<ApiResponse<{ activities: ActivityResponseItem[]; nextCursor?: string }>>(
            `/api/activities?${search.toString()}`
        );
        return response.data;
    },
};

export interface SearchTaskResult {
    id: string;
    title: string;
    priority?: string;
    dueDate?: string;
    projectId: string;
    projectName: string;
}

export interface SearchProjectResult {
    id: string;
    name: string;
    description?: string;
}

export interface SearchUserResult {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
}

export const searchApi = {
    search: async (params: { q: string; scope?: 'all' | 'tasks' | 'projects' | 'users'; limit?: number }) => {
        const search = new URLSearchParams();
        search.set('q', params.q);
        if (params.scope) search.set('scope', params.scope);
        if (params.limit) search.set('limit', String(params.limit));

        const response = await api.get<ApiResponse<{
            tasks: SearchTaskResult[];
            projects: SearchProjectResult[];
            users: SearchUserResult[];
        }>>(`/api/search?${search.toString()}`);
        return response.data;
    },
};

export interface AdminUser {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'member';
    avatar_url?: string | null;
    created_at: string;
    updated_at?: string;
    projectsOwned: number;
}

export interface AdminActivity {
    id: string;
    project_id: string;
    task_id?: string;
    user_id: string;
    action: string;
    details?: string;
    created_at: string;
    user_email?: string;
    user_name?: string;
    project_name?: string;
}

export interface AdminProject {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    owner_name?: string;
    owner_email?: string;
    task_count: number;
}

export interface AdminStats {
    totalUsers: number;
    totalProjects: number;
    totalTasks: number;
    recentUsers: AdminUser[];
}

export interface PlatformStats {
    users: {
        total: number;
        newLast30Days: number;
        growthPercent: number;
    };
    projects: {
        total: number;
        newLast30Days: number;
    };
    tasks: {
        total: number;
        completedToday: number;
    };
    activity: {
        today: number;
        thisWeek: number;
    };
    engagement: {
        activeUsersLast7Days: number;
        onlineNow: number;
    };
    taskStatus: {
        status: string;
        count: number;
    }[];
    topProjects: {
        id: string;
        name: string;
        activityCount: number;
    }[];
}

export interface SystemStats {
    database: {
        totalUsers: number;
        totalProjects: number;
        totalTasks: number;
        totalColumns: number;
        totalActivityLogs: number;
        totalProjectMembers: number;
    };
    averages: {
        tasksPerProject: number;
        membersPerProject: number;
    };
    health: {
        errorCountLast24h: number;
        errorRate: number;
    };
    mostActiveUsers: {
        id: string;
        name: string;
        email: string;
        activityCount: number;
    }[];
    recentErrors: Array<Record<string, unknown>>;
}

export const adminApi = {
    getStats: async () => {
        const response = await api.get<ApiResponse<AdminStats>>('/api/admin/stats');
        return response.data;
    },

    getPlatformStats: async () => {
        const response = await api.get<ApiResponse<PlatformStats>>('/api/admin/stats/platform');
        return response.data;
    },

    getSystemStats: async () => {
        const response = await api.get<ApiResponse<SystemStats>>('/api/admin/stats/system');
        return response.data;
    },

    getUsers: async (params?: { page?: number; limit?: number; search?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        if (params?.search) searchParams.set('search', params.search);

        const response = await api.get<ApiResponse<{
            users: AdminUser[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }>>(`/api/admin/users?${searchParams.toString()}`);
        return response.data;
    },

    updateUserRole: async (userId: string, role: 'admin' | 'member') => {
        const response = await api.put<ApiResponse<null>>(`/api/admin/users/${userId}/role`, { role });
        return response.data;
    },

    deleteUser: async (userId: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/admin/users/${userId}`);
        return response.data;
    },

    getActivities: async (params?: {
        page?: number;
        limit?: number;
        userId?: string;
        action?: string;
        startDate?: string;
        endDate?: string;
    }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        if (params?.userId) searchParams.set('user_id', params.userId);
        if (params?.action) searchParams.set('action', params.action);
        if (params?.startDate) searchParams.set('start_date', params.startDate);
        if (params?.endDate) searchParams.set('end_date', params.endDate);

        const response = await api.get<ApiResponse<{
            activities: AdminActivity[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }>>(`/api/admin/activities?${searchParams.toString()}`);
        return response.data;
    },

    getProjects: async (params?: { page?: number; limit?: number; search?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        if (params?.search) searchParams.set('search', params.search);

        const response = await api.get<ApiResponse<{
            projects: AdminProject[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }>>(`/api/admin/projects?${searchParams.toString()}`);
        return response.data;
    },

    deleteProject: async (projectId: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/admin/projects/${projectId}`);
        return response.data;
    },

    exportUsers: async () => {
        const response = await api.get('/api/admin/users/export', { responseType: 'blob' });
        return response.data;
    },

    exportActivities: async (params?: { userId?: string; action?: string; startDate?: string; endDate?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.userId) searchParams.set('user_id', params.userId);
        if (params?.action) searchParams.set('action', params.action);
        if (params?.startDate) searchParams.set('start_date', params.startDate);
        if (params?.endDate) searchParams.set('end_date', params.endDate);

        const response = await api.get(`/api/admin/activities/export?${searchParams.toString()}`, { responseType: 'blob' });
        return response.data;
    },

    exportProjects: async () => {
        const response = await api.get('/api/admin/projects/export', { responseType: 'blob' });
        return response.data;
    },

    getSettings: async () => {
        const response = await api.get<ApiResponse<Record<string, string>>>('/api/admin/settings');
        return response.data;
    },

    updateSettings: async (settings: Record<string, string>) => {
        const response = await api.put<ApiResponse<null>>('/api/admin/settings', settings);
        return response.data;
    },
};
