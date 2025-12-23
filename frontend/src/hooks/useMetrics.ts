import { useQuery } from '@tanstack/react-query';
import { api, type ApiResponse } from '../lib/api/client';

// Query keys
export const metricsKeys = {
    all: ['metrics'] as const,
    stats: () => [...metricsKeys.all, 'stats'] as const,
};

// Types
export interface MetricsStats {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    totalProjects: number;
    activeProjects: number;
}

export interface PriorityDistribution {
    priority: string;
    count: number;
}

export interface TeamPerformance {
    userId: string;
    name: string;
    avatar?: string;
    completed: number;
    inProgress: number;
    total: number;
}

export interface MetricsData {
    stats: MetricsStats;
    priorityDistribution: PriorityDistribution[];
    teamPerformance: TeamPerformance[];
}

/**
 * Hook to fetch dashboard metrics
 */
export function useMetrics() {
    return useQuery({
        queryKey: metricsKeys.stats(),
        queryFn: async (): Promise<MetricsData> => {
            const response = await api.get<ApiResponse<MetricsData>>('/api/metrics');

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to fetch metrics');
            }

            return response.data.data!;
        },
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 60 * 1000, // Refetch every minute
    });
}

/**
 * Computed completion rate from metrics
 */
export function useCompletionRate() {
    const { data } = useMetrics();

    if (!data?.stats) return 0;

    const { totalTasks, completedTasks } = data.stats;
    if (totalTasks === 0) return 0;

    return Math.round((completedTasks / totalTasks) * 100);
}
