import { useQuery } from '@tanstack/react-query';
import { api, type ApiResponse } from '../lib/api/client';

// Query keys
export const activityKeys = {
    all: ['activities'] as const,
    list: (limit: number) => [...activityKeys.all, 'list', limit] as const,
};

// Types
export interface ActivityUser {
    id: string;
    name: string;
    avatar?: string;
    initials: string;
}

export interface Activity {
    id: string;
    type: 'task_created' | 'task_moved' | 'task_completed' | 'comment' | 'file_uploaded' | 'member_joined';
    user: ActivityUser;
    taskId?: string;
    taskName?: string;
    projectId?: string;
    projectName?: string;
    details?: Record<string, unknown>;
    timestamp: string;
    createdAt: string;
}

/**
 * Hook to fetch recent activities
 */
export function useActivities(limit = 20) {
    return useQuery({
        queryKey: activityKeys.list(limit),
        queryFn: async (): Promise<Activity[]> => {
            const response = await api.get<ApiResponse<{ activities: Activity[] }>>(`/api/activities?limit=${limit}`);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to fetch activities');
            }

            return response.data.data?.activities || [];
        },
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 60 * 1000, // Refetch every minute
    });
}
