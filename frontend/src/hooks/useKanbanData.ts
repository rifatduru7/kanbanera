import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, tasksApi, columnsApi } from '../lib/api/client';
import type { Column, Task } from '../types/kanban';

// Query keys
export const kanbanKeys = {
    projects: ['projects'] as const,
    project: (id: string) => ['projects', id] as const,
    board: (projectId: string) => ['board', projectId] as const,
};

// Get all projects
export function useProjects() {
    return useQuery({
        queryKey: kanbanKeys.projects,
        queryFn: async () => {
            const response = await projectsApi.getProjects();
            if (response.success && response.data) {
                return { projects: response.data.projects };
            }
            throw new Error(response.message || 'Failed to fetch projects');
        },
    });
}

// Get project with board data (columns + tasks)
export function useProject(projectId: string) {
    return useQuery({
        queryKey: kanbanKeys.project(projectId),
        queryFn: async () => {
            const response = await projectsApi.getProject(projectId);
            if (response.success && response.data) {
                return response.data;
            }
            throw new Error(response.message || 'Failed to fetch project');
        },
        enabled: !!projectId,
    });
}

// Create project
export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { name: string; description?: string }) => {
            const response = await projectsApi.createProject(data);
            if (!response.success) {
                throw new Error(response.message || 'Failed to create project');
            }
            return response.data?.project;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.projects });
        },
    });
}

// Move task with optimistic update
export function useMoveTask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, columnId, position }: { taskId: string; columnId: string; position: number }) => {
            const response = await tasksApi.moveTask(taskId, { column_id: columnId, position });
            if (!response.success) {
                throw new Error(response.message || 'Failed to move task');
            }
            return response.data?.task;
        },
        // Optimistic update
        onMutate: async ({ taskId, columnId, position }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: kanbanKeys.project(projectId) });

            // Snapshot previous value
            const previousData = queryClient.getQueryData(kanbanKeys.project(projectId));

            // Optimistically update
            queryClient.setQueryData(kanbanKeys.project(projectId), (old: any) => {
                if (!old?.columns) return old;

                const columns = [...old.columns];
                let movedTask: Task | undefined;

                // Find and remove task from source column
                for (const col of columns) {
                    const taskIndex = col.tasks.findIndex((t: Task) => t.id === taskId);
                    if (taskIndex !== -1) {
                        movedTask = col.tasks[taskIndex];
                        col.tasks = col.tasks.filter((t: Task) => t.id !== taskId);
                        break;
                    }
                }

                // Add task to target column
                if (movedTask) {
                    const targetCol = columns.find((c: Column) => c.id === columnId);
                    if (targetCol) {
                        movedTask = { ...movedTask, columnId, position };
                        targetCol.tasks.splice(position, 0, movedTask);
                    }
                }

                return { ...old, columns };
            });

            return { previousData };
        },
        // Rollback on error
        onError: (_err, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(kanbanKeys.project(projectId), context.previousData);
            }
        },
        // Refetch on settle
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Create task
export function useCreateTask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { column_id: string; title: string; description?: string; priority?: string; due_date?: string }) => {
            const response = await tasksApi.createTask(data);
            if (!response.success) {
                throw new Error(response.message || 'Failed to create task');
            }
            return response.data?.task;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Update task
export function useUpdateTask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string; priority?: string; due_date?: string }) => {
            const response = await tasksApi.updateTask(id, data);
            if (!response.success) {
                throw new Error(response.message || 'Failed to update task');
            }
            return response.data?.task;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Delete task
export function useDeleteTask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (taskId: string) => {
            const response = await tasksApi.deleteTask(taskId);
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete task');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Add subtask
export function useAddSubtask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
            const response = await tasksApi.addSubtask(taskId, title);
            if (!response.success) {
                throw new Error(response.message || 'Failed to add subtask');
            }
            return response.data?.subtask;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Toggle subtask
export function useToggleSubtask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, subtaskId, isCompleted }: { taskId: string; subtaskId: string; isCompleted: boolean }) => {
            const response = await tasksApi.toggleSubtask(taskId, subtaskId, isCompleted);
            if (!response.success) {
                throw new Error(response.message || 'Failed to toggle subtask');
            }
            return response.data?.subtask;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Add comment
export function useAddComment(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
            const response = await tasksApi.addComment(taskId, content);
            if (!response.success) {
                throw new Error(response.message || 'Failed to add comment');
            }
            return response.data?.comment;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Create column
export function useCreateColumn(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (name: string) => {
            const response = await columnsApi.createColumn(projectId, { name });
            if (!response.success) {
                throw new Error(response.message || 'Failed to create column');
            }
            return response.data?.column;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}
