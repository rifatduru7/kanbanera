'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    X,
    Archive,
    ArrowCounterClockwise,
    Trash,
    SpinnerGap,
} from '@phosphor-icons/react';
import { tasksApi } from '../../lib/api/client';
import { kanbanKeys } from '../../hooks/useKanbanData';

interface ArchivedTask {
    id: string;
    title: string;
    priority: string;
    column_name?: string;
    assignee_name?: string;
    updated_at: string;
}

interface ArchivedTasksDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

const priorityColors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-blue-500/20 text-blue-400',
};

export function ArchivedTasksDrawer({ isOpen, onClose, projectId }: ArchivedTasksDrawerProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['archived-tasks', projectId],
        queryFn: async () => {
            const response = await tasksApi.getArchivedTasks(projectId);
            if (response.success && response.data) {
                return (response.data?.tasks || []) as unknown as ArchivedTask[];
            }
            return [];
        },
        enabled: isOpen && !!projectId,
    });

    const restoreMutation = useMutation({
        mutationFn: async (taskId: string) => {
            const response = await tasksApi.restoreTask(taskId);
            if (!response.success) throw new Error('Failed to restore');
            return response;
        },
        onSuccess: () => {
            refetch();
            queryClient.invalidateQueries({ queryKey: kanbanKeys.project(projectId) });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (taskId: string) => {
            const response = await tasksApi.deleteTask(taskId);
            if (!response.success) throw new Error('Failed to delete');
            return response;
        },
        onSuccess: () => {
            refetch();
            setConfirmDeleteId(null);
        },
    });

    const handleRestore = useCallback((taskId: string) => {
        restoreMutation.mutate(taskId);
    }, [restoreMutation]);

    const handleDelete = useCallback((taskId: string) => {
        deleteMutation.mutate(taskId);
    }, [deleteMutation]);

    const tasks = data || [];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md glass-panel shadow-2xl flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-muted">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                            <Archive className="size-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-text">{t('archive.title', 'Archived Tasks')}</h2>
                            <p className="text-xs text-text-muted">{tasks.length} {t('archive.tasks_count', 'tasks')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt text-text-muted transition-colors">
                        <X className="size-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <SpinnerGap className="size-6 text-primary animate-spin" />
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                            <Archive className="size-12 mb-4 opacity-30" />
                            <p className="text-sm">{t('archive.empty', 'No archived tasks')}</p>
                            <p className="text-xs mt-1">{t('archive.empty_desc', 'Archived tasks will appear here')}</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div key={task.id} className="group rounded-xl border border-border-muted bg-surface/60 p-3.5 hover:bg-surface-alt/50 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text truncate">{task.title}</p>
                                        <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted">
                                            {task.column_name && <span>{task.column_name}</span>}
                                            {task.assignee_name && (
                                                <>
                                                    <span>·</span>
                                                    <span>{task.assignee_name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {task.priority && (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase flex-shrink-0 ${priorityColors[task.priority] || ''}`}>
                                            {task.priority}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border-muted/50">
                                    <button
                                        onClick={() => handleRestore(task.id)}
                                        disabled={restoreMutation.isPending}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                                    >
                                        <ArrowCounterClockwise className="size-3.5" />
                                        {t('archive.restore', 'Restore')}
                                    </button>
                                    {confirmDeleteId === task.id ? (
                                        <div className="flex items-center gap-1 ml-auto">
                                            <button
                                                onClick={() => handleDelete(task.id)}
                                                disabled={deleteMutation.isPending}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                            >
                                                {t('common.confirm', 'Confirm')}
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="px-2 py-1.5 rounded-lg text-xs text-text-muted hover:bg-surface-alt transition-colors"
                                            >
                                                {t('common.cancel', 'Cancel')}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDeleteId(task.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
                                        >
                                            <Trash className="size-3.5" />
                                            {t('common.delete', 'Delete')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
