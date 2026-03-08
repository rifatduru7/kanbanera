import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, tasksApi, columnsApi } from '../lib/api/client';
import type { TaskDetail } from '../types/task-detail';

// Query keys
export const kanbanKeys = {
    projects: ['projects'] as const,
    project: (id: string) => ['projects', id] as const,
    board: (projectId: string) => ['board', projectId] as const,
    task: (id: string) => ['tasks', id] as const,
};

interface ProjectTaskForOptimisticUpdate {
    id: string;
    column_id: string;
    position: number;
}

interface ProjectBoardForOptimisticUpdate {
    tasks?: ProjectTaskForOptimisticUpdate[];
    [key: string]: unknown;
}

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

// Update project
export function useUpdateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; is_archived?: boolean }) => {
            const response = await projectsApi.updateProject(id, data);
            if (!response.success) {
                throw new Error(response.message || 'Failed to update project');
            }
            return response.data?.project;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.projects });
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(variables.id) });
        },
    });
}

// Delete project
export function useDeleteProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await projectsApi.deleteProject(id);
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete project');
            }
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.projects });
            // Optionally redirect to /dashboard via component
        },
    });
}

// Get project columns
export function useProjectColumns(projectId: string) {
    return useQuery({
        queryKey: ['projects', projectId, 'columns'],
        queryFn: async () => {
            const response = await projectsApi.getProjectColumns(projectId);
            if (response.success && response.data) {
                return { columns: response.data.columns };
            }
            throw new Error(response.message || 'Failed to fetch columns');
        },
        enabled: !!projectId,
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
            const previousData = queryClient.getQueryData<ProjectBoardForOptimisticUpdate>(kanbanKeys.project(projectId));

            // Optimistically update the flat tasks array
            queryClient.setQueryData<ProjectBoardForOptimisticUpdate>(kanbanKeys.project(projectId), (old) => {
                if (!old?.tasks) return old;

                // Update the column_id and position of the moved task
                const updatedTasks = old.tasks.map((t) => {
                    if (t.id === taskId) {
                        return { ...t, column_id: columnId, position };
                    }
                    return t;
                });

                return { ...old, tasks: updatedTasks };
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
export function useCreateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { project_id: string; column_id: string; title: string; description?: string; priority?: string; due_date?: string }) => {
            const response = await tasksApi.createTask(data);
            if (!response.success) {
                throw new Error(response.message || 'Failed to create task');
            }
            return response.data?.task;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(variables.project_id) });
        },
    });
}

// Update task
export function useUpdateTask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string; priority?: string; due_date?: string; assignee_id?: string; labels?: string[] }) => {
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

// Get task details
export function useTask(taskId: string) {
    return useQuery({
        queryKey: kanbanKeys.task(taskId),
        queryFn: async () => {
            const response = await tasksApi.getTask(taskId);
            if (response.success && response.data) {
                return response.data.task as unknown as TaskDetail;
            }
            throw new Error(response.message || 'Failed to fetch task details');
        },
        enabled: !!taskId,
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

// Delete subtask
export function useDeleteSubtask(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) => {
            const response = await tasksApi.deleteSubtask(taskId, subtaskId);
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete subtask');
            }
            return response;
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

// Delete comment
export function useDeleteComment(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, commentId }: { taskId: string; commentId: string }) => {
            const response = await tasksApi.deleteComment(taskId, commentId);
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete comment');
            }
            return response;
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

// Add column
export function useAddColumn(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ name }: { name: string }) => {
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

// Update column
export function useUpdateColumn(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; name?: string; wip_limit?: number | null; color?: string }) => {
            const response = await columnsApi.updateColumn(id, data);
            if (!response.success) {
                throw new Error(response.message || 'Failed to update column');
            }
            return response.data?.column;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Delete column
export function useDeleteColumn(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (columnId: string) => {
            const response = await columnsApi.deleteColumn(columnId);
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete column');
            }
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Upload attachment
export function useUploadAttachment(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
            const { attachmentsApi } = await import('../lib/api/client');
            const response = await attachmentsApi.uploadAttachment(taskId, file);
            if (!response.success) {
                throw new Error(response.message || 'Failed to upload attachment');
            }
            return response.data?.attachment;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Delete attachment
export function useDeleteAttachment(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (attachmentId: string) => {
            const { attachmentsApi } = await import('../lib/api/client');
            const response = await attachmentsApi.deleteAttachment(attachmentId);
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete attachment');
            }
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Add member
export function useAddMember(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ email, role }: { email: string; role: string }) => {
            const response = await projectsApi.addMember(projectId, email, role);
            if (!response.success) {
                throw new Error(response.message || 'Failed to add member');
            }
            return response.data?.member;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Update member role
export function useUpdateMemberRole(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
            const response = await projectsApi.updateMemberRole(projectId, userId, role);
            if (!response.success) {
                throw new Error(response.message || 'Failed to update member role');
            }
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Remove member
export function useRemoveMember(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: string) => {
            const response = await projectsApi.removeMember(projectId, userId);
            if (!response.success) {
                throw new Error(response.message || 'Failed to remove member');
            }
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });
}

// Get integrations
export function useIntegrations(projectId: string) {
    return useQuery({
        queryKey: [...kanbanKeys.project(projectId), 'integrations'],
        queryFn: async () => {
            const response = await projectsApi.getIntegrations(projectId);
            if (response.success && response.data) {
                return response.data.integrations;
            }
            throw new Error(response.message || 'Failed to fetch integrations');
        },
        enabled: !!projectId,
    });
}

// Add integration
export function useAddIntegration(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { provider: string; webhook_url: string; name: string }) => {
            const response = await projectsApi.addIntegration(projectId, data);
            if (!response.success) {
                throw new Error(response.message || 'Failed to add integration');
            }
            return response.data?.integration;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...kanbanKeys.project(projectId), 'integrations'] });
        },
    });
}

// Remove integration
export function useRemoveIntegration(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (integrationId: string) => {
            const response = await projectsApi.removeIntegration(projectId, integrationId);
            if (!response.success) {
                throw new Error(response.message || 'Failed to remove integration');
            }
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...kanbanKeys.project(projectId), 'integrations'] });
        },
    });
}
// Update integration
export function useUpdateIntegration(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; name?: string; webhook_url?: string; is_active?: boolean }) => {
            const response = await projectsApi.updateIntegration(projectId, id, data);
            if (!response.success) {
                throw new Error(response.message || 'Failed to update integration');
            }
            return response.data?.integration;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...kanbanKeys.project(projectId), 'integrations'] });
        },
    });
}
