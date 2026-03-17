import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Board } from '../../components/kanban/Board';
import { TaskModal } from '../../components/kanban/TaskModal';
import { BoardFilterBar } from '../../components/kanban/BoardFilterBar';
import { Funnel as Filter, CircleNotch as Loader2, WarningCircle as AlertCircle, Kanban as FolderKanban, CaretDown as ChevronDown, Archive, Lightning } from '@phosphor-icons/react';
import { ArchivedTasksDrawer } from '../../components/kanban/ArchivedTasksDrawer';
import { AutomationRulesModal } from '../../components/kanban/AutomationRulesModal';
import { useProjects, useProject, useMoveTask, useUpdateTask, useDeleteTask, useAddSubtask, useToggleSubtask, useDeleteSubtask, useAddComment, useDeleteComment, useUploadAttachment, useDeleteAttachment, useUpdateColumn, useDeleteColumn, useAddColumn, useUpdateProject, useDeleteProject } from '../../hooks/useKanbanData';
import { CreateTaskModal } from '../../components/task/CreateTaskModal';
import { ProjectSettingsModal } from '../../components/project/ProjectSettingsModal';
import { ProjectActivityDrawer } from '../../components/project/ProjectActivityDrawer';
import { EmptyColumnState } from '../../components/ui/EmptyState';
import { tasksApi } from '../../lib/api/client';
import type { Column, Task } from '../../types/kanban';
import type { TaskDetail } from '../../types/task-detail';

type TaskPriority = Task['priority'];

interface ProjectOption {
    id: string;
    name: string;
    description?: string;
    color?: string | null;
    is_archived?: number;
}

interface ProjectMember {
    user_id: string;
    full_name: string;
    email?: string;
    role?: string;
    avatar_url?: string | null;
}

interface ApiColumnRow {
    id: string;
    name: string;
    position: number;
    color?: string | null;
    wip_limit?: number | null;
}

interface ApiTaskRow {
    id: string;
    title: string;
    description?: string | null;
    priority?: string | null;
    column_id: string;
    position: number;
    labels?: unknown;
    due_date?: string | null;
    assignee_id?: string | null;
    assignee_name?: string | null;
    subtask_count?: number | null;
    subtask_completed?: number | null;
    comment_count?: number | null;
    attachment_count?: number | null;
    is_archived?: number | null;
    cover_attachment_id?: string | null;
    created_at: string;
    updated_at: string;
}

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

interface ProjectDataShape {
    project?: {
        owner_id?: string;
    };
    columns?: ApiColumnRow[];
    tasks?: ApiTaskRow[];
    members?: ProjectMember[];
}

export function BoardPage() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryProjectId = searchParams.get('project');
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
    const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
    const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
    const [activeAddTaskColumnId, setActiveAddTaskColumnId] = useState<string | undefined>();

    // Filter state
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isArchivedDrawerOpen, setIsArchivedDrawerOpen] = useState(false);
    const [isAutomationRulesOpen, setIsAutomationRulesOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [assigneeFilter, setAssigneeFilter] = useState('');
    const [labelFilter, setLabelFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    // Fetch projects list
    const { data: projectsData, isLoading: isLoadingProjects } = useProjects();
    const projects = useMemo<ProjectOption[]>(
        () => (projectsData?.projects ?? []) as ProjectOption[],
        [projectsData?.projects]
    );
    const effectiveProjectId = useMemo(() => {
        const validQuery = queryProjectId && projects.some((project) => project.id === queryProjectId)
            ? queryProjectId
            : null;
        if (validQuery) return validQuery;

        return projects[0]?.id || '';
    }, [projects, queryProjectId]);

    useEffect(() => {
        if (!effectiveProjectId) return;
        if (searchParams.get('project') === effectiveProjectId) return;
        const next = new URLSearchParams(searchParams);
        next.set('project', effectiveProjectId);
        setSearchParams(next, { replace: true });
    }, [effectiveProjectId, searchParams, setSearchParams]);

    // Fetch board data for selected project
    const { data: rawProjectData, isLoading: isLoadingBoard, error: boardError } = useProject(effectiveProjectId);
    const projectData = rawProjectData as ProjectDataShape | undefined;

    // API mutations
    const moveTask = useMoveTask(effectiveProjectId);
    const updateTask = useUpdateTask(effectiveProjectId);
    const deleteTask = useDeleteTask(effectiveProjectId);
    const addSubtask = useAddSubtask(effectiveProjectId);
    const toggleSubtask = useToggleSubtask(effectiveProjectId);
    const deleteSubtask = useDeleteSubtask(effectiveProjectId);
    const addComment = useAddComment(effectiveProjectId);
    const deleteComment = useDeleteComment(effectiveProjectId);
    const uploadAttachment = useUploadAttachment(effectiveProjectId);
    const deleteAttachment = useDeleteAttachment(effectiveProjectId);
    const updateColumn = useUpdateColumn(effectiveProjectId);
    const deleteColumn = useDeleteColumn(effectiveProjectId);
    const addColumn = useAddColumn(effectiveProjectId);
    const updateProject = useUpdateProject();
    const deleteProject = useDeleteProject();

    // Collect all unique labels from tasks for the filter dropdown
    const availableLabels = useMemo(() => {
        if (!projectData?.tasks) return [];
        const labelSet = new Set<string>();
        projectData.tasks.forEach((task) => {
            safeParseLabels(task.labels).forEach((l) => labelSet.add(l));
        });
        return Array.from(labelSet).sort();
    }, [projectData?.tasks]);

    // Active filter count for badge
    const activeFilterCount = useMemo(() => {
        return (searchQuery ? 1 : 0) + (priorityFilter ? 1 : 0) + (statusFilter ? 1 : 0) + (assigneeFilter ? 1 : 0) + (labelFilter ? 1 : 0) + (dateFilter ? 1 : 0);
    }, [searchQuery, priorityFilter, statusFilter, assigneeFilter, labelFilter, dateFilter]);

    const clearAllFilters = () => {
        setSearchQuery('');
        setPriorityFilter('');
        setStatusFilter('');
        setAssigneeFilter('');
        setLabelFilter('');
        setDateFilter('');
    };

    // Transform API columns to Board component format
    const columns: Column[] = useMemo(() => {
        if (!projectData?.columns) return [];

        let projectTasks = projectData.tasks || [];

        // Apply filters
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            projectTasks = projectTasks.filter((task) =>
                task.title.toLowerCase().includes(query) ||
                (task.description && task.description.toLowerCase().includes(query))
            );
        }

        if (priorityFilter) {
            projectTasks = projectTasks.filter((task) =>
                normalizePriority(task.priority) === priorityFilter
            );
        }

        if (assigneeFilter) {
            if (assigneeFilter === '__unassigned__') {
                projectTasks = projectTasks.filter((task) => !task.assignee_id);
            } else {
                projectTasks = projectTasks.filter((task) => task.assignee_id === assigneeFilter);
            }
        }

        if (labelFilter) {
            projectTasks = projectTasks.filter((task) => {
                const labels = safeParseLabels(task.labels);
                return labels.includes(labelFilter);
            });
        }

        if (dateFilter) {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const weekEnd = new Date(now);
            weekEnd.setDate(now.getDate() + (7 - now.getDay()));
            const weekEndStr = weekEnd.toISOString().split('T')[0];

            projectTasks = projectTasks.filter((task) => {
                const dueDate = task.due_date;
                if (dateFilter === 'no_date') return !dueDate;
                if (!dueDate) return false;
                if (dateFilter === 'today') return dueDate === todayStr;
                if (dateFilter === 'this_week') return dueDate >= todayStr && dueDate <= weekEndStr;
                if (dateFilter === 'overdue') return dueDate < todayStr;
                return true;
            });
        }

        let filteredColumns = projectData.columns;
        if (statusFilter) {
            filteredColumns = filteredColumns.filter((col) => col.id === statusFilter);
        }

        return filteredColumns.map((col) => ({
            id: col.id,
            name: col.name,
            position: col.position,
            color: col.color || '#6366f1',
            wipLimit: col.wip_limit || undefined,
            tasks: projectTasks
                .filter((task) => task.column_id === col.id)
                .map((task) => ({
                    id: task.id,
                    title: task.title,
                    description: task.description || undefined,
                    priority: normalizePriority(task.priority),
                    columnId: col.id,
                    position: task.position,
                    labels: safeParseLabels(task.labels),
                    dueDate: task.due_date || undefined,
                    assigneeId: task.assignee_id || undefined,
                    assigneeName: task.assignee_name || undefined,
                    subtaskCount: task.subtask_count || 0,
                    subtaskCompleted: task.subtask_completed || 0,
                    commentCount: task.comment_count || 0,
                    attachmentCount: task.attachment_count || 0,
                    isArchived: !!task.is_archived,
                    coverAttachmentId: task.cover_attachment_id || undefined,
                    createdAt: task.created_at,
                    updatedAt: task.updated_at,
                })),
        })).sort((a: Column, b: Column) => a.position - b.position);
    }, [priorityFilter, projectData, searchQuery, statusFilter, assigneeFilter, labelFilter, dateFilter]);

    const selectedProject = projects.find((p) => p.id === effectiveProjectId);

    // Handlers
    const handleTaskMove = (taskId: string, toColumnId: string, newPosition: number) => {
        moveTask.mutate({ taskId, columnId: toColumnId, position: newPosition });
    };

    const handleTaskClick = async (task: Task) => {
        try {
            const response = await tasksApi.getTask(task.id);
            if (response.success && response.data) {
                const taskData = response.data.task;
                const column = columns.find(c => c.id === task.columnId);
                const normalizedTaskData = taskData as ApiTaskDetails;
                const taskDetail: TaskDetail = {
                    id: normalizedTaskData.id,
                    title: normalizedTaskData.title,
                    description: normalizedTaskData.description || undefined,
                    priority: normalizePriority(normalizedTaskData.priority),
                    status: column?.name || t('common.unknown'),
                    columnId: task.columnId,
                    projectId: effectiveProjectId,
                    projectName: selectedProject?.name || t('common.project'),
                    assigneeId: normalizedTaskData.assignee_id || undefined,
                    assigneeName: normalizedTaskData.assignee_name || undefined,
                    dueDate: normalizedTaskData.due_date || undefined,
                    labels: safeParseLabels(normalizedTaskData.labels),
                    subtasks: (normalizedTaskData.subtasks || []).map((s) => ({
                        id: s.id,
                        taskId: normalizedTaskData.id,
                        title: s.title,
                        isCompleted: Boolean(s.is_completed),
                        position: s.position,
                        createdAt: s.created_at,
                    })),
                    comments: (normalizedTaskData.comments || []).map((c) => ({
                        id: c.id,
                        taskId: normalizedTaskData.id,
                        userId: c.user_id,
                        userName: c.full_name || t('common.user'),
                        content: c.content,
                        createdAt: c.created_at,
                    })),
                    attachments: (normalizedTaskData.attachments || []).map((a) => ({
                        id: a.id,
                        taskId: normalizedTaskData.id,
                        fileName: a.file_name,
                        fileSize: a.file_size,
                        mimeType: a.mime_type || undefined,
                        downloadUrl: a.download_url,
                        thumbnailUrl: a.thumbnail_url,
                        createdAt: a.created_at,
                    })),
                    coverAttachmentId: normalizedTaskData.cover_attachment_id || undefined,
                    isArchived: !!normalizedTaskData.is_archived,
                    createdAt: normalizedTaskData.created_at,
                    updatedAt: normalizedTaskData.updated_at,
                };
                setSelectedTask(taskDetail);
            }
        } catch (error) {
            console.error('Failed to load task details:', error);
        }
    };

    const handleAddTask = (columnId: string) => {
        setActiveAddTaskColumnId(columnId);
        setIsCreateTaskModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedTask(null);
    };

    const handleUpdateTask = (updates: Partial<TaskDetail>) => {
        if (selectedTask) {
            updateTask.mutate({
                id: selectedTask.id,
                title: updates.title,
                description: updates.description,
                priority: updates.priority,
                due_date: updates.dueDate === undefined ? undefined : (updates.dueDate || null),
                assignee_id: updates.assigneeId === undefined ? undefined : (updates.assigneeId || null),
                labels: updates.labels,
            });
            setSelectedTask((prev) => {
                if (!prev) return null;

                let nextAssigneeName = updates.assigneeName;
                if (updates.assigneeId !== undefined && updates.assigneeName === undefined) {
                    if (!updates.assigneeId) {
                        nextAssigneeName = null;
                    } else {
                        const matchedMember = (projectData?.members || []).find((m) => m.user_id === updates.assigneeId);
                        nextAssigneeName = matchedMember?.full_name || null;
                    }
                }

                return {
                    ...prev,
                    ...updates,
                    ...(nextAssigneeName !== undefined ? { assigneeName: nextAssigneeName } : {}),
                };
            });
        }
    };

    const handleAddSubtask = async (title: string) => {
        if (selectedTask) {
            try {
                const newSubtask = await addSubtask.mutateAsync({ taskId: selectedTask.id, title });
                if (newSubtask) {
                    setSelectedTask(prev => prev ? {
                        ...prev,
                        subtasks: [...prev.subtasks, {
                            id: newSubtask.id,
                            taskId: newSubtask.task_id,
                            title: newSubtask.title,
                            isCompleted: Boolean(newSubtask.is_completed),
                            position: newSubtask.position ?? 0,
                            createdAt: newSubtask.created_at || new Date().toISOString(),
                        }]
                    } : null);
                }
            } catch (error) {
                console.error('Failed to add subtask:', error);
            }
        }
    };

    const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
        if (selectedTask) {
            // Optimistic update
            setSelectedTask(prev => prev ? {
                ...prev,
                subtasks: prev.subtasks.map(st => st.id === subtaskId ? { ...st, isCompleted: completed } : st)
            } : null);
            try {
                await toggleSubtask.mutateAsync({ taskId: selectedTask.id, subtaskId, isCompleted: completed });
            } catch (error) {
                console.error('Failed to toggle subtask:', error);
                // Revert on error
                setSelectedTask(prev => prev ? {
                    ...prev,
                    subtasks: prev.subtasks.map(st => st.id === subtaskId ? { ...st, isCompleted: !completed } : st)
                } : null);
            }
        }
    };

    const handleAddComment = async (content: string) => {
        if (selectedTask) {
            try {
                const newComment = await addComment.mutateAsync({ taskId: selectedTask.id, content });
                if (newComment) {
                    setSelectedTask(prev => prev ? {
                        ...prev,
                        comments: [
                            {
                                id: newComment.id,
                                taskId: newComment.task_id,
                                userId: newComment.user_id || 'unknown',
                                userName: newComment.full_name || String(t('common.you')), // Backend returns full_name via join on return
                                content: newComment.content,
                                createdAt: newComment.created_at || new Date().toISOString(),
                            },
                            ...prev.comments
                        ]
                    } : null);
                }
            } catch (error) {
                console.error('Failed to add comment:', error);
            }
        }
    };

    const handleUploadAttachment = async (file: File) => {
        if (selectedTask) {
            try {
                const newAttachment = await uploadAttachment.mutateAsync({ taskId: selectedTask.id, file });
                if (newAttachment) {
                    setSelectedTask(prev => prev ? {
                        ...prev,
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
                            ...prev.attachments
                        ]
                    } : null);
                }
            } catch (error) {
                console.error('Failed to upload attachment:', error);
            }
        }
    };

    const handleDeleteSubtask = async (subtaskId: string) => {
        if (selectedTask) {
            setSelectedTask(prev => prev ? {
                ...prev,
                subtasks: prev.subtasks.filter(st => st.id !== subtaskId)
            } : null);
            try {
                await deleteSubtask.mutateAsync({ taskId: selectedTask.id, subtaskId });
            } catch (error) {
                console.error('Failed to delete subtask:', error);
            }
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (selectedTask) {
            setSelectedTask(prev => prev ? {
                ...prev,
                comments: prev.comments.filter(c => c.id !== commentId)
            } : null);
            try {
                await deleteComment.mutateAsync({ taskId: selectedTask.id, commentId });
            } catch (error) {
                console.error('Failed to delete comment:', error);
            }
        }
    };

    const handleDeleteAttachment = async (attachmentId: string) => {
        if (selectedTask) {
            setSelectedTask(prev => prev ? {
                ...prev,
                attachments: prev.attachments.filter(a => a.id !== attachmentId)
            } : null);
            try {
                await deleteAttachment.mutateAsync(attachmentId);
            } catch (error) {
                console.error('Failed to delete attachment:', error);
            }
        }
    };

    const handleSetCoverImage = async (attachmentId: string) => {
        if (selectedTask) {
            try {
                const { tasksApi } = await import('../../lib/api/client');
                await tasksApi.setCoverImage(selectedTask.id, attachmentId);
                setSelectedTask(prev => prev ? { ...prev, coverAttachmentId: attachmentId } : null);
            } catch (error) {
                console.error('Failed to set cover image:', error);
            }
        }
    };

    const handleRemoveCoverImage = async () => {
        if (selectedTask) {
            try {
                const { tasksApi } = await import('../../lib/api/client');
                await tasksApi.removeCoverImage(selectedTask.id);
                setSelectedTask(prev => prev ? { ...prev, coverAttachmentId: undefined } : null);
            } catch (error) {
                console.error('Failed to remove cover image:', error);
            }
        }
    };

    // Loading state
    if (isLoadingProjects) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 text-primary animate-spin" />
            </div>
        );
    }

    // No projects state
    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <FolderKanban className="size-12 text-text-muted mb-4" />
                <h3 className="text-xl font-semibold text-text mb-2">{t('projects.empty_state')}</h3>
                <p className="text-text-muted mb-4">{t('projects.empty_state_desc')}</p>
                <Link to="/projects" className="btn-primary px-4 py-2 rounded-lg">
                    {t('projects.view_projects')}
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 md:gap-8 lg:h-full">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <nav aria-label="Breadcrumb" className="flex gap-2 text-sm mb-1">
                        <Link to="/dashboard" className="text-text-muted hover:text-primary transition-colors">
                            {t('common.home')}
                        </Link>
                        <span className="text-border">/</span>
                        <span className="text-primary font-medium">{t('nav.board')}</span>
                    </nav>

                    {/* Project Selector */}
                    <div className="relative w-full sm:w-auto">
                        <button
                            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                            className="flex items-center gap-3 text-text text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight hover:text-primary transition-colors"
                        >
                            {selectedProject?.name || t('projects.select_project')}
                            <ChevronDown className={`size-6 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProjectDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-full sm:w-64 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                                {projects.map((project) => (
                                    <button
                                        key={project.id}
                                        onClick={() => {
                                            const next = new URLSearchParams(searchParams);
                                            next.set('project', project.id);
                                            setSearchParams(next, { replace: true });
                                            setIsProjectDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 hover:bg-surface-alt transition-colors ${project.id === effectiveProjectId ? 'bg-primary/10 text-primary' : 'text-white'
                                            }`}
                                    >
                                        <p className="font-medium">{project.name}</p>
                                        <p className="text-xs text-text-muted truncate">{project.description || t('projects.no_description')}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-text-muted text-sm max-w-2xl">
                        {selectedProject?.description || t('projects.default_description')}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {isLoadingBoard && <Loader2 className="size-5 text-primary animate-spin" />}

                    {/* Filter Button */}
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${isFilterOpen || activeFilterCount > 0
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-surface border-border hover:bg-surface-alt text-text'
                            }`}
                    >
                        <Filter className="size-4" />
                        {t('common.filter')}
                        {activeFilterCount > 0 && (
                            <span className="flex items-center justify-center size-4 rounded-full bg-primary text-black text-[10px] font-bold">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Archive Button */}
                    <button
                        onClick={() => setIsArchivedDrawerOpen(true)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface border border-border hover:bg-surface-alt text-text text-sm font-medium transition-all"
                    >
                        <Archive className="size-4" />
                        {t('archive.title', 'Archive')}
                    </button>

                    {/* Automation Rules Button */}
                    <button
                        onClick={() => setIsAutomationRulesOpen(true)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface border border-border hover:bg-surface-alt text-text text-sm font-medium transition-all"
                    >
                        <Lightning className="size-4" />
                        {t('automation.title', 'Automation')}
                    </button>

                    {/* Activity Button */}
                    <button
                        onClick={() => setIsActivityDrawerOpen(true)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface border border-border hover:bg-surface-alt text-text text-sm font-medium transition-all"
                    >
                        {t('projects.activity_feed', 'Activity')}
                    </button>

                    {/* Settings Button */}
                    <button
                        onClick={() => setIsProjectSettingsOpen(true)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface border border-border hover:bg-surface-alt text-text text-sm font-medium transition-all"
                    >
                        {t('nav.settings')}
                    </button>
                </div>
            </div>

            {/* Enhanced Filter Bar */}
            {isFilterOpen && (
                <BoardFilterBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    priorityFilter={priorityFilter}
                    onPriorityChange={setPriorityFilter}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    assigneeFilter={assigneeFilter}
                    onAssigneeChange={setAssigneeFilter}
                    labelFilter={labelFilter}
                    onLabelChange={setLabelFilter}
                    dateFilter={dateFilter}
                    onDateFilterChange={setDateFilter}
                    onClearAll={clearAllFilters}
                    members={(projectData?.members || []) as { user_id: string; full_name: string; avatar_url?: string | null }[]}
                    columns={(projectData?.columns || []).map((c) => ({ id: c.id, name: c.name }))}
                    availableLabels={availableLabels}
                    activeFilterCount={activeFilterCount}
                />
            )}

            {/* Error State */}
            {boardError && (
                <div className="flex items-center justify-center py-12 text-red-400">
                    <AlertCircle className="size-5 mr-2" />
                    {t('projects.load_failed')}
                </div>
            )}

            {/* Kanban Board */}
            {!boardError && columns.length > 0 && (
                <Board
                    columns={columns}
                    onTaskMove={handleTaskMove}
                    onTaskClick={handleTaskClick}
                    onAddTask={handleAddTask}
                    onAddColumn={(name) => addColumn.mutate({ name })}
                    onUpdateColumn={(id, data) => updateColumn.mutate({ id, ...data })}
                    onDeleteColumn={(id) => deleteColumn.mutate(id)}
                />
            )}

            {/* Empty Board */}
            {!boardError && !isLoadingBoard && columns.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <EmptyColumnState onAddTask={() => setIsCreateTaskModalOpen(true)} />
                </div>
            )}

            {/* Create Task Modal */}
            <CreateTaskModal
                isOpen={isCreateTaskModalOpen}
                onClose={() => {
                    setIsCreateTaskModalOpen(false);
                    setActiveAddTaskColumnId(undefined);
                }}
                defaultProjectId={effectiveProjectId || undefined}
                defaultColumnId={activeAddTaskColumnId}
            />

            {/* Project Settings Modal */}
            {selectedProject && isProjectSettingsOpen && (
                <ProjectSettingsModal
                    isOpen={true}
                    onClose={() => setIsProjectSettingsOpen(false)}
                    project={{
                        id: selectedProject.id,
                        name: selectedProject.name,
                        description: selectedProject.description,
                        color: selectedProject.color ?? undefined,
                        isArchived: Boolean(selectedProject.is_archived)
                    }}
                    onUpdate={(data) => {
                        updateProject.mutate({ id: selectedProject.id, ...data }, {
                            onSuccess: () => setIsProjectSettingsOpen(false)
                        });
                    }}
                    onDelete={() => {
                        deleteProject.mutate(selectedProject.id, {
                            onSuccess: () => {
                                setIsProjectSettingsOpen(false);
                                // Set another project if available, or clear
                                const nextProject = projects.find((p) => p.id !== selectedProject.id);
                                if (nextProject) {
                                    const next = new URLSearchParams(searchParams);
                                    next.set('project', nextProject.id);
                                    setSearchParams(next, { replace: true });
                                } else {
                                    window.location.href = '/projects';
                                }
                            }
                        });
                    }}
                    isUpdating={updateProject.isPending}
                    isDeleting={deleteProject.isPending}
                />
            )}

            {/* Project Activity Drawer */}
            {selectedProject && (
                <ProjectActivityDrawer
                    isOpen={isActivityDrawerOpen}
                    onClose={() => setIsActivityDrawerOpen(false)}
                    projectId={selectedProject.id}
                    mobileMode="sheet"
                />
            )}

            {/* Task Modal */}
            {selectedTask && (
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
                    columns={columns.map(c => ({ id: c.id, name: c.name }))}
                    members={projectData?.members || []}
                    onMoveTask={(columnId: string, position: number) => {
                        handleTaskMove(selectedTask.id, columnId, position);
                        setSelectedTask(prev => prev ? { ...prev, columnId, status: columns.find(c => c.id === columnId)?.name || prev.status } : null);
                    }}
                    onDeleteTask={() => {
                        deleteTask.mutate(selectedTask.id);
                        handleCloseModal();
                    }}
                    onArchiveTask={() => {
                        tasksApi.archiveTask(selectedTask.id).then(() => {
                            handleCloseModal();
                        });
                    }}
                    onDeleteSubtask={handleDeleteSubtask}
                    onDeleteComment={handleDeleteComment}
                    onDeleteAttachment={handleDeleteAttachment}
                    onSetCoverImage={handleSetCoverImage}
                    onRemoveCoverImage={handleRemoveCoverImage}
                />
            )}

            {/* Archived Tasks Drawer */}
            {selectedProject && (
                <ArchivedTasksDrawer
                    isOpen={isArchivedDrawerOpen}
                    onClose={() => setIsArchivedDrawerOpen(false)}
                    projectId={selectedProject.id}
                />
            )}

            {/* Automation Rules Modal */}
            {selectedProject && (
                <AutomationRulesModal 
                    isOpen={isAutomationRulesOpen}
                    onClose={() => setIsAutomationRulesOpen(false)}
                    projectId={selectedProject.id}
                    columns={columns}
                    members={projectData?.members || []}
                />
            )}
        </div>
    );
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
