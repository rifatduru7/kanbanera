import { useQuery } from '@tanstack/react-query';
import { api, type ApiResponse } from '../lib/api/client';

// Query keys
export const calendarKeys = {
    all: ['calendar'] as const,
    tasks: (from: string, to: string, filters: CalendarFilters = {}) =>
        [...calendarKeys.all, 'tasks', from, to, filters] as const,
};

export interface CalendarFilters {
    projectId?: string;
    priority?: string;
    assigneeId?: string;
}

// Types
export interface CalendarTask {
    id: string;
    title: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    projectId: string;
    projectName: string;
    columnName: string;
    labels: string[];
}

/**
 * Hook to fetch tasks within a date range for calendar view
 */
export function useTasksByDateRange(from: string, to: string, filters: CalendarFilters = {}) {
    return useQuery({
        queryKey: calendarKeys.tasks(from, to, filters),
        queryFn: async (): Promise<CalendarTask[]> => {
            const params = new URLSearchParams();
            if (from) params.append('from', from);
            if (to) params.append('to', to);

            if (filters.projectId) params.append('projectId', filters.projectId);
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.assigneeId) params.append('assigneeId', filters.assigneeId);

            const url = `/api/tasks/calendar?${params.toString()}`;
            const response = await api.get<ApiResponse<{ tasks: CalendarTask[] }>>(url);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to fetch calendar tasks');
            }

            return response.data.data?.tasks || [];
        },
        staleTime: 60 * 1000, // 1 minute
        enabled: !!from && !!to, // Only fetch when dates are provided
    });
}

/**
 * Helper to get start and end of a month
 */
export function getMonthRange(year: number, month: number) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    return {
        from: start.toISOString().split('T')[0],
        to: end.toISOString().split('T')[0],
    };
}
