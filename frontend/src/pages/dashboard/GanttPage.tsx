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
import { useGanttTasks } from '../../hooks/useGanttData';
import { useProjects, useTask, useUpdateTask, useMoveTask, useDeleteTask, useAddSubtask, useToggleSubtask, useDeleteSubtask, useAddComment, useDeleteComment, useUploadAttachment, useDeleteAttachment, useProject } from '../../hooks/useKanbanData';
import { GanttChart, type ZoomLevel, type GroupBy } from '../../components/gantt/GanttChart';
import { TaskModal } from '../../components/kanban/TaskModal';
import { useViewport } from '../../hooks/useViewport';
import { toast } from 'react-hot-toast';
import { tasksApi } from '../../lib/api/client';
import type { TaskDetail } from '../../types/task-detail';

export function GanttPage() {
    const { t } = useTranslation();
    const { isMobile } = useViewport();

    // State
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('day');
    const [groupBy, setGroupBy] = useState<GroupBy>('project');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [monthOffset, setMonthOffset] = useState(0);

    // Task Detail Modal State
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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

    // Task detail data
    const { data: taskDetail } = useTask(selectedTaskId || '');
    const { data: projectData } = useProject(currentTaskProjectId || '');

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
    const handleTaskClick = useCallback((task: any) => {
        setSelectedTaskId(task.id);
        setCurrentTaskProjectId(task.projectId);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedTaskId(null);
        setCurrentTaskProjectId(null);
    }, []);

    const handleUpdateTask = useCallback(async (updates: Partial<TaskDetail>) => {
        if (!selectedTaskId || !currentTaskProjectId) return;
        try {
            await updateTask.mutateAsync({ id: selectedTaskId, ...updates });
            refetchGantt();
        } catch (err) {
            toast.error(t('common.error'));
        }
    }, [selectedTaskId, currentTaskProjectId, updateTask, refetchGantt, t]);

    const handleTaskMove = useCallback(async (columnId: string, position: number) => {
        if (!selectedTaskId || !currentTaskProjectId) return;
        try {
            await moveTask.mutateAsync({ taskId: selectedTaskId, columnId, position });
            refetchGantt();
        } catch (err) {
            toast.error(t('common.error'));
        }
    }, [selectedTaskId, currentTaskProjectId, moveTask, refetchGantt, t]);

    const handleAddSubtask = useCallback(async (title: string) => {
        if (!selectedTaskId || !currentTaskProjectId) return;
        await addSubtask.mutateAsync({ taskId: selectedTaskId, title });
    }, [selectedTaskId, currentTaskProjectId, addSubtask]);

    const handleToggleSubtask = useCallback(async (subtaskId: string, isCompleted: boolean) => {
        if (!selectedTaskId || !currentTaskProjectId) return;
        await toggleSubtask.mutateAsync({ taskId: selectedTaskId, subtaskId, isCompleted });
    }, [selectedTaskId, currentTaskProjectId, toggleSubtask]);

    const handleDeleteSubtask = useCallback(async (subtaskId: string) => {
        if (!selectedTaskId || !currentTaskProjectId) return;
        await deleteSubtask.mutateAsync({ taskId: selectedTaskId, subtaskId });
    }, [selectedTaskId, currentTaskProjectId, deleteSubtask]);

    const handleAddComment = useCallback(async (content: string) => {
        if (!selectedTaskId || !currentTaskProjectId) return;
        await addComment.mutateAsync({ taskId: selectedTaskId, content });
    }, [selectedTaskId, currentTaskProjectId, addComment]);

    const handleDeleteComment = useCallback(async (commentId: string) => {
        if (!selectedTaskId || !currentTaskProjectId) return;
        await deleteComment.mutateAsync({ taskId: selectedTaskId, commentId });
    }, [selectedTaskId, currentTaskProjectId, deleteComment]);

    const handleUploadAttachment = useCallback(async (file: File) => {
        if (!selectedTaskId || !currentTaskProjectId) return;
        await uploadAttachment.mutateAsync({ taskId: selectedTaskId, file });
    }, [selectedTaskId, currentTaskProjectId, uploadAttachment]);

    const handleDeleteAttachment = useCallback(async (attachmentId: string) => {
        if (!selectedTaskId || !currentTaskProjectId) return;
        await deleteAttachment.mutateAsync(attachmentId);
    }, [selectedTaskId, currentTaskProjectId, deleteAttachment]);

    const handleSetCoverImage = useCallback(async (attachmentId: string) => {
        if (!selectedTaskId || !currentTaskProjectId) return;
        await tasksApi.updateTask(selectedTaskId, { cover_attachment_id: attachmentId });
        refetchGantt();
    }, [selectedTaskId, currentTaskProjectId, refetchGantt]);

    const handleRemoveCoverImage = useCallback(async () => {
        if (!selectedTaskId || !currentTaskProjectId) return;
        await tasksApi.updateTask(selectedTaskId, { cover_attachment_id: null });
        refetchGantt();
    }, [selectedTaskId, currentTaskProjectId, refetchGantt]);

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

                    {/* Quick stats */}
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

                {/* Controls Bar */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Navigation */}
                    <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
                        <button
                            onClick={() => setMonthOffset(prev => prev - 1)}
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
                            onClick={() => setMonthOffset(prev => prev + 1)}
                            className="p-1.5 rounded-md hover:bg-surface-alt text-text-muted hover:text-text transition-colors"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                    </div>

                    {/* Zoom level */}
                    <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
                        {zoomOptions.map(opt => {
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
                                    {!isMobile && opt.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Group by */}
                    <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
                        {groupOptions.map(opt => {
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
                                    {!isMobile && opt.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Search */}
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

                    {/* Project filter */}
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary/50 max-w-[140px] sm:max-w-[180px]"
                    >
                        <option value="">{t('gantt.all_projects', 'All Projects')}</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

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
                    <GanttChart
                        tasks={tasks}
                        zoomLevel={zoomLevel}
                        groupBy={groupBy}
                        onTaskClick={handleTaskClick}
                        onTaskDateChange={handleTaskDateChange}
                        searchQuery={searchQuery}
                    />
                </div>
            )}

            {/* Task Modal */}
            {selectedTaskId && taskDetail && projectData && (
                <TaskModal
                    taskId={selectedTaskId}
                    task={taskDetail}
                    isOpen={true}
                    onClose={handleCloseModal}
                    onUpdate={handleUpdateTask}
                    onAddSubtask={handleAddSubtask}
                    onToggleSubtask={handleToggleSubtask}
                    onAddComment={handleAddComment}
                    onUploadAttachment={handleUploadAttachment}
                    columns={projectData.columns.map(c => ({ id: c.id, name: c.name }))}
                    members={(projectData.members || []).filter(m => !!m.user_id).map(m => ({
                        user_id: m.user_id as string,
                        full_name: m.full_name || '',
                        avatar_url: m.avatar_url,
                        email: m.email,
                        role: m.role as any
                    }))}
                    onMoveTask={handleTaskMove}
                    onDeleteTask={() => {
                        deleteTask.mutate(selectedTaskId, {
                            onSuccess: () => {
                                handleCloseModal();
                                refetchGantt();
                            }
                        });
                    }}
                    onArchiveTask={() => {
                        tasksApi.archiveTask(selectedTaskId).then(() => {
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
