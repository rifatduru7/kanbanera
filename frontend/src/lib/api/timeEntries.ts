import { api } from './client';
import type { ApiResponse } from './client';

export interface TimeEntry {
    id: string;
    taskId: string;
    userId: string;
    startedAt: string;
    endedAt: string | null;
    durationSeconds: number | null;
    note: string | null;
    isManual: boolean;
    userName?: string;
    userAvatar?: string | null;
    taskTitle?: string;
    projectName?: string;
    createdAt: string;
}

export interface WeeklyTimeData {
    date: string;
    totalSeconds: number;
    entries: TimeEntry[];
}

export const timeEntriesApi = {
    startTimer: async (taskId: string) => {
        const response = await api.post<ApiResponse<{ entry: TimeEntry }>>('/api/time-entries/start', { task_id: taskId });
        return response.data;
    },
    stopTimer: async (id: string) => {
        const response = await api.post<ApiResponse<{ entry: TimeEntry }>>('/api/time-entries/stop', { id });
        return response.data;
    },
    addManual: async (data: { task_id: string; duration_seconds: number; note?: string }) => {
        const response = await api.post<ApiResponse<{ entry: TimeEntry }>>('/api/time-entries/manual', data);
        return response.data;
    },
    getActive: async () => {
        const response = await api.get<ApiResponse<{ entry: TimeEntry | null }>>('/api/time-entries/active');
        return response.data;
    },
    getForTask: async (taskId: string) => {
        const response = await api.get<ApiResponse<{ entries: TimeEntry[]; totalSeconds: number }>>(`/api/time-entries/task/${taskId}`);
        return response.data;
    },
    getWeekly: async () => {
        const response = await api.get<ApiResponse<{ days: WeeklyTimeData[]; totalSeconds: number }>>('/api/time-entries/user/weekly');
        return response.data;
    },
    getProjectReport: async (projectId: string) => {
        const response = await api.get<ApiResponse<{ tasks: Array<{ taskId: string; taskTitle: string; totalSeconds: number; entries: number }>; users: Array<{ userId: string; userName: string; totalSeconds: number }>; totalSeconds: number }>>(`/api/time-entries/project/${projectId}/report`);
        return response.data;
    },
};
