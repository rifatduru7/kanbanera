import { api } from './client';
import type { ApiResponse } from './client';

export interface PresenceUser {
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    currentView: string | null;
    currentTaskId: string | null;
    lastSeenAt: string;
}

export interface BoardEvent {
    id: string;
    projectId: string;
    userId: string;
    eventType: string;
    eventData: Record<string, unknown> | null;
    createdAt: string;
    userName?: string;
}

export const presenceApi = {
    heartbeat: async (data: { project_id: string; current_view?: string; current_task_id?: string }) => {
        const response = await api.post<ApiResponse<{ success: true }>>('/api/presence/heartbeat', data);
        return response.data;
    },
    getActiveUsers: async (projectId: string) => {
        const response = await api.get<ApiResponse<{ users: PresenceUser[] }>>(`/api/presence/${projectId}`);
        return response.data;
    },
    getEvents: async (projectId: string, since: string) => {
        const response = await api.get<ApiResponse<{ events: BoardEvent[] }>>(`/api/presence/${projectId}/events?since=${encodeURIComponent(since)}`);
        return response.data;
    },
    goOffline: async () => {
        const response = await api.delete<ApiResponse<null>>('/api/presence/offline');
        return response.data;
    },
};
