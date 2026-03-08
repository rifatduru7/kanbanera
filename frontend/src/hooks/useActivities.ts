import { useInfiniteQuery } from '@tanstack/react-query';
import { activitiesApi, type ActivityResponseItem } from '../lib/api/client';

export const activityKeys = {
    all: ['activities'] as const,
    list: (limit: number, type: string, projectId?: string) => [...activityKeys.all, 'list', limit, type, projectId] as const,
};

export type ActivityType = 'all' | 'task_created' | 'task_moved' | 'comment' | 'file_uploaded' | 'member_joined';

export type Activity = ActivityResponseItem;

export function useActivities(options?: { limit?: number; type?: ActivityType; projectId?: string }) {
    const limit = options?.limit ?? 20;
    const type = options?.type ?? 'all';
    const projectId = options?.projectId;

    return useInfiniteQuery({
        queryKey: activityKeys.list(limit, type, projectId),
        initialPageParam: undefined as string | undefined,
        queryFn: async ({ pageParam }) => {
            const response = await activitiesApi.getActivities({
                limit,
                cursor: pageParam,
                type,
                projectId,
            });

            if (!response.success || !response.data) {
                throw new Error(response.message || 'Failed to fetch activities');
            }

            return {
                activities: response.data.activities || [],
                nextCursor: response.data.nextCursor,
            };
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000,
    });
}
