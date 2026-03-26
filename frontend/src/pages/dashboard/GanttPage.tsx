import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MagnifyingGlass as Search,
    CaretLeft as ChevronLeft,
    CaretRight as ChevronRight,
    CircleNotch as Loader2,
    ListBullets,
    CalendarBlank,
    ChartBar,
    Target,
    Users,
    FolderSimple,
    Stack,
} from '@phosphor-icons/react';
import { useGanttTasks, type GanttTask } from '../../hooks/useGanttData';
import { useProjects, useUpdateTask, useMoveTask, useDeleteTask, useAddSubtask, useToggleSubtask, useDeleteSubtask, useAddComment, useDeleteComment, useUploadAttachment, useDeleteAttachment, useProject } from '../../hooks/useKanbanData';
import { GanttChart, type ZoomLevel, type GroupBy } from '../../components/gantt/GanttChart';
import { MobileGanttChart } from '../../components/gantt/MobileGanttChart';
import { TaskModal } from '../../components/kanban/TaskModal';
import { useViewport } from '../../hooks/useViewport';
import { toast } from 'react-hot-toast';
import { tasksApi } from '../../lib/api/client';
import type { TaskDetail } from '../../types/task-detail';

type TaskPriority = TaskDetail['priority'];

interface ApiSubtaskRow {
    id: string;
    title: string;
    is_completed: number;
    position: number;
    created_at: string;
}

interface ApiCommentRow {
    id: string;
    user_id: string;
    full_name?: string | null;
    content: string;
    created_at: string;
}

interface ApiAttachmentRow {
    id: string;
    file_name: string;
    file_size: number;
    mime_type?: string | null;
    download_url?: string;
    thumbnail_url?: string;
    created_at: string;
}

interface ApiTaskDetails {
    id: string;
    title: string;
    description?: string | null;
    priority?: string | null;
    assignee_id?: string | null;
    assignee_name?: string | null;
    due_date?: string | null;
    labels?: unknown;
    created_at: string;
    updated_at: string;
    subtasks?: ApiSubtaskRow[];
    comments?: ApiCommentRow[];
    attachments?: ApiAttachmentRow[];
    cover_attachment_id?: string | null;
    is_archived?: boolean;
}

export function GanttPage() {
    const { t } = useTranslation();
    const { isMobile } = useViewport();

    // State
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(() => (
        typeof window !== 'undefined' && window.innerWidth <= 767 ? 'week' : 'day'
    ));
    const [groupBy, setGroupBy] = useState<GroupBy>('project');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [monthOffset, setMonthOffset] = useState(0);

    // Task Detail Modal State
    const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
    const [currentTaskProjectId, setCurrentTaskProjectId] = useState<string | null>(null);

    // Date range based on month offset
    const { from, to } = useMemo(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() + monthOffset - 2, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 4, 0);
        return {
            from: start.toISOString().split('T')[0],
            to: end.toISOString().split('T')[0],
        };
    }, [monthOffset]);

    // Data fetching
    const { data: tasks = [], isLoading, error, refetch: refetchGantt } = useGanttTasks(from, to, selectedProjectId || undefined);
    const { data: projectsData } = useProjects();
    const projects = projectsData?.projects || [];

    const { data: projectData } = useProject(currentTaskProjectId || '');
    const selectedTaskId = selectedTask?.id || null;

    // Mutation hooks for TaskModal
    const updateTask = useUpdateTask(currentTaskProjectId || '');
    const deleteTask = useDeleteTask(currentTaskProjectId || '');
    const addSubtask = useAddSubtask(currentTaskProjectId || '');
    const toggleSubtask = useToggleSubtask(currentTaskProjectId || '');
    const deleteSubtask = useDeleteSubtask(currentTaskProjectId || '');
    const addComment = useAddComment(currentTaskProjectId || '');
    const deleteComment = useDeleteComment(currentTaskProjectId || '');
    const uploadAttachment = useUploadAttachment(currentTaskProjectId || '');
    const deleteAttachment = useDeleteAttachment(currentTaskProjectId || '');
    const moveTask = useMoveTask(currentTaskProjectId || '');

    // Handlers
    const handleTaskClick = useCallback(async (task: GanttTask) => {
        setCurrentTaskProjectId(task.projectId);

        try {
            const response = await tasksApi.getTask(task.id);
            if (!response.success || !response.data?.task) {
                throw new Error(response.message || 'Failed to load task details');
            }

            setSelectedTask(normalizeTaskDetail(response.data.task as ApiTaskDetails, task, t('common.user')));
        } catch (error) {
            setSelectedTask(null);
            setCurrentTaskProjectId(null);
            toast.error(t('common.error'));
        }
    }, [t]);

    const handleCloseModal = useCallback(() => {
        setSelectedTask(null);
        setCurrentTaskProjectId(null);
    }, []);

    const handleUpdateTask = useCallback(async (updates: Partial<TaskDetail>) => {
        if (!selectedTaskId || !currentTaskProjectId || !selectedTask) return;

        const previousTask = selectedTask;
        let nextAssigneeName = updates.assigneeName;
        if (updates.assigneeId !== undefined && updates.assigneeName === undefined) {
            if (!updates.assigneeId) {
                nextAssigneeName = null;
            } else {
                const matchedMember = (projectData?.members || []).find((member) => member.user_id === updates.assigneeId);
                nextAssigneeName = matchedMember?.full_name || null;
            }
        }

        const nextTask: TaskDetail = {
            ...previousTask,
            ...updates,
            ...(nextAssigneeName !== undefined ? { assigneeName: nextAssigneeName } : {}),
        };

        setSelectedTask(nextTask);

        try {
            await updateTask.mutateAsync({
                id: selectedTaskId,
                title: updates.title,
                description: updates.description,
                priority: updates.priority,
                due_date: updates.dueDate === undefined ? undefined : (updates.dueDate || null),
                assignee_id: updates.assigneeId === undefined ? undefined : (updates.assigneeId || null),
                labels: updates.labels,
            });
            refetchGantt();
        } catch (error) {
            setSelectedTask((current) => current?.id === previousTask.id ? previousTask : current);
            toast.error(t('common.error'));
        }
    }, [currentTaskProjectId, projectData?.members, refetchGantt, selectedTask, selectedTaskId, t, updateTask]);

    const handleTaskMove = useCallback(async (columnId: string, position: number) => {
        if (!selectedTaskId || !currentTaskProjectId || !selectedTask) return;

        const previousTask = selectedTask;
        const nextStatus = projectData?.columns.find((column) => column.id === columnId)?.name || previousTask.status;
        setSelectedTask({ ...previousTask, columnId, status: nextStatus });

        try {
            await moveTask.mutateAsync({ taskId: selectedTaskId, columnId, position });
            refetchGantt();
        } catch (error) {
            setSelectedTask((current) => current?.id === previousTask.id ? previousTask : current);
            toast.error(t('common.error'));
        }
    }, [currentTaskProjectId, moveTask, projectData?.columns, refetchGantt, selectedTask, selectedTaskId, t]);

    const handleAddSubtask = useCallback(async (title: string) => {
        if (!selectedTaskId || !currentTaskProjectId) return;

        try {
            const newSubtask = await addSubtask.mutateAsync({ taskId: selectedTaskId, title });
            if (newSubtask) {
                setSelectedTask((current) => current ? {
                    ...current,
                    subtasks: [
                        ...current.subtasks,
                        {
                            id: newSubtask.id,
                            taskId: newSubtask.task_id,
                            title: newSubtask.title,
                            isCompleted: Boolean(newSubtask.is_completed),
                            position: newSubtask.position ?? 0,
                            createdAt: newSubtask.created_at || new Date().toISOString(),
                        },
                    ],
                } : current);
            }
            refetchGantt();
        } catch (error) {
            toast.error(t('common.error'));
        }
    }, [addSubtask, currentTaskProjectId, refetchGantt, selectedTaskId, t]);

    const handleToggleSubtask = useCallback(async (subtaskId: string, isCompleted: boolean) => {
        if (!selectedTaskId || !currentTaskProjectId || !selectedTask) return;

        const previousTask = selectedTask;
        setSelectedTask({
            ...previousTask,
            subtasks: previousTask.subtasks.map((subtask) =>
                subtask.id === subtaskId ? { ...subtask, isCompleted } : subtask
            ),
        });

        try {
            await toggleSubtask.mutateAsync({ taskId: selectedTaskId, subtaskId, isCompleted });
            refetchGantt();
        } catch (error) {
            setSelectedTask((current) => current?.id === previousTask.id ? previousTask : current);
            toast.error(t('common.error'));
        }
    }, [currentTaskProjectId, refetchGantt, selectedTask, selectedTaskId, t, toggleSubtask]);

    const handleDeleteSubtask = useCallback(async (subtaskId: string) => {
        if (!selectedTaskId || !currentTaskProjectId || !selectedTask) return;

        const previousTask = selectedTask;
        setSelectedTask({
            ...previousTask,
            subtasks: previousTask.subtasks.filter((subtask) => subtask.id !== subtaskId),
        });

        try {
            await deleteSubtask.mutateAsync({ taskId: selectedTaskId, subtaskId });
            refetchGantt();
        } catch (error) {
            setSelectedTask((current) => current?.id === previousTask.id ? previousTask : current);
            toast.error(t('common.error'));
        }
    }, [currentTaskProjectId, deleteSubtask, refetchGantt, selectedTask, selectedTaskId, t]);

    const handleAddComment = useCallback(async (content: string) => {
        if (!selectedTaskId || !currentTaskProjectId) return;

        try {
            const newComment = await addComment.mutateAsync({ taskId: selectedTaskId, content });
            if (newComment) {
                setSelectedTask((current) => current ? {
                    ...current,
                    comments: [
                        {
                            id: newComment.id,
                            taskId: newComment.task_id,
                            userId: newComment.user_id || 'unknown',
                            userName: newComment.full_name || String(t('common.you')),
                            content: newComment.content,
                            createdAt: newComment.created_at || new Date().toISOString(),
                        },
                        ...current.comments,
                    ],
                } : current);
            }
        } catch (error) {
            toast.error(t('common.error'));
        }
    }, [addComment, currentTaskProjectId, selectedTaskId, t]);

    const handleDeleteComment = useCallback(async (commentId: string) => {
        if (!selectedTaskId || !currentTaskProjectId || !selectedTask) return;

        const previousTask = selectedTask;
        setSelectedTask({
            ...previousTask,
            comments: previousTask.comments.filter((comment) => comment.id !== commentId),
        });

        try {
            await deleteComment.mutateAsync({ taskId: selectedTaskId, commentId });
        } catch (error) {
            setSelectedTask((current) => current?.id === previousTask.id ? previousTask : current);
            toast.error(t('common.error'));
        }
    }, [currentTaskProjectId, deleteComment, selectedTask, selectedTaskId, t]);

    const handleUploadAttachment = useCallback(async (file: File) => {
        if (!selectedTaskId || !currentTaskProjectId) return;

        try {
            const newAttachment = await uploadAttachment.mutateAsync({ taskId: selectedTaskId, file });
            if (newAttachment) {
                setSelectedTask((current) => current ? {
                    ...current,
                    attachments: [
                        {
                            id: newAttachment.id,
                            taskId: newAttachment.task_id,
                            fileName: newAttachment.file_name || file.name,
                            fileSize: newAttachment.file_size || file.size,
                            mimeType: newAttachment.mime_type,
                            downloadUrl: typeof newAttachment.download_url === 'string' ? newAttachment.download_url : undefined,
                            thumbnailUrl: typeof newAttachment.thumbnail_url === 'string' ? newAttachment.thumbnail_url : undefined,
                            createdAt: newAttachment.created_at || new Date().toISOString(),
                        },
                        ...current.attachments,
                    ],
                } : current);
            }
        } catch (error) {
            toast.error(t('common.error'));
        }
    }, [currentTaskProjectId, selectedTaskId, t, uploadAttachment]);

    const handleDeleteAttachment = useCallback(async (attachmentId: string) => {
        if (!selectedTaskId || !currentTaskProjectId || !selectedTask) return;

        const previousTask = selectedTask;
        setSelectedTask({
            ...previousTask,
            attachments: previousTask.attachments.filter((attachment) => attachment.id !== attachmentId),
        });

        try {
            await deleteAttachment.mutateAsync(attachmentId);
        } catch (error) {
            setSelectedTask((current) => current?.id === previousTask.id ? previousTask : current);
            toast.error(t('common.error'));
        }
    }, [currentTaskProjectId, deleteAttachment, selectedTask, selectedTaskId, t]);

    const handleSetCoverImage = useCallback(async (attachmentId: string) => {
        if (!selectedTaskId || !currentTaskProjectId || !selectedTask) return;

        const previousTask = selectedTask;
        setSelectedTask({ ...previousTask, coverAttachmentId: attachmentId });

        try {
            await tasksApi.updateTask(selectedTaskId, { cover_attachment_id: attachmentId });
            refetchGantt();
        } catch (error) {
            setSelectedTask((current) => current?.id === previousTask.id ? previousTask : current);
            toast.error(t('common.error'));
        }
    }, [currentTaskProjectId, refetchGantt, selectedTask, selectedTaskId, t]);

    const handleRemoveCoverImage = useCallback(async () => {
        if (!selectedTaskId || !currentTaskProjectId || !selectedTask) return;

        const previousTask = selectedTask;
        setSelectedTask({ ...previousTask, coverAttachmentId: undefined });

        try {
            await tasksApi.updateTask(selectedTaskId, { cover_attachment_id: null });
            refetchGantt();
        } catch (error) {
            setSelectedTask((current) => current?.id === previousTask.id ? previousTask : current);
            toast.error(t('common.error'));
        }
    }, [currentTaskProjectId, refetchGantt, selectedTask, selectedTaskId, t]);

    // Update task date change mutation
    const handleTaskDateChange = useCallback(async (taskId: string, newStart: string, newEnd: string) => {
        // We find the task to get its projectId if needed, or rely on the fact that gantt tasks have it
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        try {
            await tasksApi.updateTask(taskId, {
                start_date: newStart,
                due_date: newEnd
            });
            toast.success(t('gantt.date_updated', 'Task date updated'));
            refetchGantt();
        } catch (err) {
            toast.error(t('common.error'));
        }
    }, [refetchGantt, t, tasks]);

    // Stats
    const stats = useMemo(() => {
        const total = tasks.length;
        const withDueDate = tasks.filter(t => t.endDate).length;
        const overdue = tasks.filter(t => t.endDate && new Date(t.endDate) < new Date()).length;
        const inProgress = tasks.filter(t => {
            const colName = t.columnName?.toLowerCase() || '';
            return colName.includes('progress') || colName.includes('review');
        }).length;
        return { total, withDueDate, overdue, inProgress };
    }, [tasks]);

    const zoomOptions: { value: ZoomLevel; label: string; icon: React.ElementType }[] = [
        { value: 'day', label: t('gantt.zoom_day', 'Day'), icon: ListBullets },
        { value: 'week', label: t('gantt.zoom_week', 'Week'), icon: CalendarBlank },
        { value: 'month', label: t('gantt.zoom_month', 'Month'), icon: ChartBar },
    ];

    const groupOptions: { value: GroupBy; label: string; icon: React.ElementType }[] = [
        { value: 'project', label: t('gantt.group_project', 'Project'), icon: FolderSimple },
        { value: 'status', label: t('gantt.group_status', 'Status'), icon: Stack },
        { value: 'assignee', label: t('gantt.group_assignee', 'Assignee'), icon: Users },
        { value: 'priority', label: t('gantt.group_priority', 'Priority'), icon: Target },
    ];

    // Current month label
    const monthLabel = useMemo(() => {
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
        return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }, [monthOffset]);

    return (
        <div className="flex flex-col h-full gap-4 sm:gap-6 p-4 sm:p-6 pb-24 lg:pb-6">
            {/* Header */}
            {isMobile ? (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-text tracking-tight">
                                {t('gantt.title', 'Gantt Chart')}
                            </h1>
                            <p className="text-sm text-text-muted mt-1 leading-relaxed">
                                {t('gantt.subtitle', 'Visualize your project timeline and track progress')}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-text-muted">
                                <div className="size-2 rounded-full bg-primary" />
                                <span>{stats.total} {t('gantt.total', 'tasks')}</span>
                            </div>
                            {stats.overdue > 0 && (
                                <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-red-300">
                                    <div className="size-2 rounded-full bg-red-500" />
                                    <span>{stats.overdue} {t('gantt.overdue', 'overdue')}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-text-muted">
                                <div className="size-2 rounded-full bg-yellow-500" />
                                <span>{stats.inProgress} {t('gantt.active', 'active')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex flex-1 items-center gap-1 rounded-xl border border-border bg-surface p-0.5">
                            <button
                                onClick={() => setMonthOffset((prev) => prev - 1)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition-colors active:bg-surface-alt"
                                aria-label={t('gantt.zoom_week', 'Week')}
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            <div className="flex-1 truncate px-2 text-center text-sm font-semibold text-text">
                                {monthLabel}
                            </div>
                            <button
                                onClick={() => setMonthOffset((prev) => prev + 1)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition-colors active:bg-surface-alt"
                                aria-label={t('gantt.zoom_month', 'Month')}
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                        <button
                            onClick={() => setMonthOffset(0)}
                            className="h-10 rounded-xl border border-border bg-surface px-4 text-xs font-semibold text-text transition-colors active:bg-surface-alt"
                        >
                            {t('gantt.today', 'TODAY')}
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {zoomOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setZoomLevel(opt.value)}
                                className={`flex h-10 items-center justify-center rounded-xl border text-xs font-semibold transition-all ${
                                    zoomLevel === opt.value
                                        ? 'border-primary/40 bg-primary/10 text-primary'
                                        : 'border-border bg-surface text-text-muted'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {groupOptions.map((opt) => {
                            const Icon = opt.icon;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => setGroupBy(opt.value)}
                                    className={`flex h-10 items-center justify-center rounded-xl border transition-all ${
                                        groupBy === opt.value
                                            ? 'border-primary/40 bg-primary/10 text-primary'
                                            : 'border-border bg-surface text-text-muted'
                                    }`}
                                    title={opt.label}
                                    aria-label={opt.label}
                                >
                                    <Icon className="size-4" />
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                            <option value="">{t('gantt.all_projects', 'All Projects')}</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
                            <input
                                type="text"
                                placeholder={t('gantt.search', 'Search tasks...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight">
                                {t('gantt.title', 'Gantt Chart')}
                            </h1>
                            <p className="text-sm text-text-muted mt-0.5">
                                {t('gantt.subtitle', 'Visualize your project timeline and track progress')}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <div className="size-2 rounded-full bg-primary" />
                                    <span className="text-text-muted">{stats.total} {t('gantt.total', 'tasks')}</span>
                                </div>
                                {stats.overdue > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <div className="size-2 rounded-full bg-red-500" />
                                        <span className="text-red-400">{stats.overdue} {t('gantt.overdue', 'overdue')}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <div className="size-2 rounded-full bg-yellow-500" />
                                    <span className="text-text-muted">{stats.inProgress} {t('gantt.active', 'active')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
                            <button
                                onClick={() => setMonthOffset((prev) => prev - 1)}
                                className="p-1.5 rounded-md hover:bg-surface-alt text-text-muted hover:text-text transition-colors"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            <button
                                onClick={() => setMonthOffset(0)}
                                className="px-3 py-1 text-xs font-medium text-text hover:bg-surface-alt rounded-md transition-colors min-w-[120px] text-center"
                            >
                                {monthLabel}
                            </button>
                            <button
                                onClick={() => setMonthOffset((prev) => prev + 1)}
                                className="p-1.5 rounded-md hover:bg-surface-alt text-text-muted hover:text-text transition-colors"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>

                        <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
                            {zoomOptions.map((opt) => {
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => setZoomLevel(opt.value)}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                                            zoomLevel === opt.value
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-text-muted hover:text-text hover:bg-surface-alt'
                                        }`}
                                    >
                                        <Icon className="size-3.5" />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
                            {groupOptions.map((opt) => {
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => setGroupBy(opt.value)}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                                            groupBy === opt.value
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-text-muted hover:text-text hover:bg-surface-alt'
                                        }`}
                                        title={opt.label}
                                    >
                                        <Icon className="size-3.5" />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex-1" />

                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
                            <input
                                type="text"
                                placeholder={t('gantt.search', 'Search tasks...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50 w-32 sm:w-48 transition-all focus:w-48 sm:focus:w-56"
                            />
                        </div>

                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary/50 max-w-[140px] sm:max-w-[180px]"
                        >
                            <option value="">{t('gantt.all_projects', 'All Projects')}</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Main Content */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="size-8 text-primary animate-spin" />
                        <p className="text-sm text-text-muted">{t('common.loading')}</p>
                    </div>
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-sm text-red-400">{t('gantt.error', 'Failed to load Gantt data')}</p>
                    </div>
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="size-16 mx-auto mb-4 rounded-2xl bg-surface-alt flex items-center justify-center">
                            <ChartBar className="size-8 text-text-muted" />
                        </div>
                        <p className="text-sm font-medium text-text">{t('gantt.no_tasks', 'No tasks to display')}</p>
                        <p className="text-xs text-text-muted mt-1">{t('gantt.no_tasks_desc', 'Create tasks with due dates to see them on the Gantt chart')}</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 min-h-0">
                    {isMobile ? (
                        <MobileGanttChart
                            tasks={tasks}
                            zoomLevel={zoomLevel}
                            groupBy={groupBy}
                            onTaskClick={handleTaskClick}
                            searchQuery={searchQuery}
                        />
                    ) : (
                        <GanttChart
                            tasks={tasks}
                            zoomLevel={zoomLevel}
                            groupBy={groupBy}
                            onTaskClick={handleTaskClick}
                            onTaskDateChange={handleTaskDateChange}
                            searchQuery={searchQuery}
                        />
                    )}
                </div>
            )}

            {/* Task Modal */}
            {selectedTask && projectData && (
                <TaskModal
                    taskId={selectedTask.id}
                    task={selectedTask}
                    isOpen={true}
                    onClose={handleCloseModal}
                    onUpdate={handleUpdateTask}
                    onAddSubtask={handleAddSubtask}
                    onToggleSubtask={handleToggleSubtask}
                    onAddComment={handleAddComment}
                    onUploadAttachment={handleUploadAttachment}
                    columns={projectData.columns.map(c => ({ id: c.id, name: c.name }))}
                    members={(projectData.members || []).filter((member) => !!member.user_id).map((member) => ({
                        user_id: member.user_id as string,
                        full_name: member.full_name || '',
                    }))}
                    onMoveTask={handleTaskMove}
                    onDeleteTask={() => {
                        deleteTask.mutate(selectedTask.id, {
                            onSuccess: () => {
                                handleCloseModal();
                                refetchGantt();
                            }
                        });
                    }}
                    onArchiveTask={() => {
                        tasksApi.archiveTask(selectedTask.id).then(() => {
                            handleCloseModal();
                            refetchGantt();
                        });
                    }}
                    onDeleteSubtask={handleDeleteSubtask}
                    onDeleteComment={handleDeleteComment}
                    onDeleteAttachment={handleDeleteAttachment}
                    onSetCoverImage={handleSetCoverImage}
                    onRemoveCoverImage={handleRemoveCoverImage}
                />
            )}
        </div>
    );
}

function normalizeTaskDetail(task: ApiTaskDetails, fallbackTask: GanttTask, fallbackUserName: string): TaskDetail {
    return {
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        priority: normalizePriority(task.priority),
        status: fallbackTask.columnName,
        columnId: fallbackTask.columnId,
        projectId: fallbackTask.projectId,
        projectName: fallbackTask.projectName,
        assigneeId: task.assignee_id || fallbackTask.assigneeId || undefined,
        assigneeName: task.assignee_name || fallbackTask.assigneeName || undefined,
        assigneeAvatar: fallbackTask.assigneeAvatar || undefined,
        dueDate: task.due_date || fallbackTask.endDate || null,
        labels: safeParseLabels(task.labels ?? fallbackTask.labels),
        subtasks: (task.subtasks || []).map((subtask) => ({
            id: subtask.id,
            taskId: task.id,
            title: subtask.title,
            isCompleted: Boolean(subtask.is_completed),
            position: subtask.position,
            createdAt: subtask.created_at,
        })),
        comments: (task.comments || []).map((comment) => ({
            id: comment.id,
            taskId: task.id,
            userId: comment.user_id,
            userName: comment.full_name || fallbackUserName,
            content: comment.content,
            createdAt: comment.created_at,
        })),
        attachments: (task.attachments || []).map((attachment) => ({
            id: attachment.id,
            taskId: task.id,
            fileName: attachment.file_name,
            fileSize: attachment.file_size,
            mimeType: attachment.mime_type || undefined,
            downloadUrl: attachment.download_url,
            thumbnailUrl: attachment.thumbnail_url,
            createdAt: attachment.created_at,
        })),
        coverAttachmentId: task.cover_attachment_id || undefined,
        isArchived: !!task.is_archived,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
    };
}

function safeParseLabels(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === 'string');
    }

    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.filter((entry): entry is string => typeof entry === 'string');
            }
        } catch {
            return [];
        }
    }

    return [];
}

function normalizePriority(value: unknown): TaskPriority {
    if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') {
        return value;
    }
    return 'medium';
}
