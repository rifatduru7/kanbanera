import { useQuery } from '@tanstack/react-query';
import { ganttApi, type GanttTask } from '../lib/api/client';

export const ganttKeys = {
    all: ['gantt'] as const,
    tasks: (from: string, to: string, projectId?: string) =>
        [...ganttKeys.all, 'tasks', from, to, projectId] as const,
};

export type { GanttTask };

export function useGanttTasks(from: string, to: string, projectId?: string) {
    return useQuery({
        queryKey: ganttKeys.tasks(from, to, projectId),
        queryFn: async (): Promise<GanttTask[]> => {
            const response = await ganttApi.getTasks({ from, to, projectId });
            if (!response.success) {
                throw new Error(response.message || 'Failed to fetch gantt tasks');
            }
            return response.data?.tasks || [];
        },
        staleTime: 60 * 1000,
        enabled: !!from && !!to,
    });
}

export function getDateRange(monthsBack: number, monthsForward: number) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + monthsForward + 1, 0);
    return {
        from: start.toISOString().split('T')[0],
        to: end.toISOString().split('T')[0],
    };
}
