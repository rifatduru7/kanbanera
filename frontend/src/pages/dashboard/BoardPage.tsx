import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Board } from '../../components/kanban/Board';
import { TaskModal } from '../../components/kanban/TaskModal';
import { Funnel as Filter, CircleNotch as Loader2, WarningCircle as AlertCircle, Kanban as FolderKanban, CaretDown as ChevronDown } from '@phosphor-icons/react';
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
    assignee_name?: string | null;
    subtask_count?: number | null;
    subtask_completed?: number | null;
    comment_count?: number | null;
    attachment_count?: number | null;
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
    url?: string;
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
    // Selected project state
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
    const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
    const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
    const [activeAddTaskColumnId, setActiveAddTaskColumnId] = useState<string | undefined>();

    // Filter state
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Fetch projects list
    const { data: projectsData, isLoading: isLoadingProjects } = useProjects();
    const projects = useMemo<ProjectOption[]>(
        () => (projectsData?.projects ?? []) as ProjectOption[],
        [projectsData?.projects]
    );
    const effectiveProjectId = selectedProjectId || projects[0]?.id || '';

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
                    assigneeName: task.assignee_name || undefined,
                    subtaskCount: task.subtask_count || 0,
                    subtaskCompleted: task.subtask_completed || 0,
                    commentCount: task.comment_count || 0,
                    attachmentCount: task.attachment_count || 0,
                    createdAt: task.created_at,
                    updatedAt: task.updated_at,
                })),
        })).sort((a: Column, b: Column) => a.position - b.position);
    }, [priorityFilter, projectData, searchQuery, statusFilter]);

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
                        downloadUrl: a.url,
                        thumbnailUrl: a.thumbnail_url,
                        createdAt: a.created_at,
                    })),
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
                due_date: updates.dueDate,
                assignee_id: updates.assigneeId,
                labels: updates.labels,
            });
            setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
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
                                downloadUrl: typeof newAttachment.url === 'string' ? newAttachment.url : undefined,
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
        <div className="flex flex-col gap-8 h-full">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div className="flex flex-col gap-2">
                    <nav aria-label="Breadcrumb" className="flex gap-2 text-sm mb-1">
                        <Link to="/dashboard" className="text-text-muted hover:text-primary transition-colors">
                            {t('common.home')}
                        </Link>
                        <span className="text-border">/</span>
                        <span className="text-primary font-medium">{t('nav.board')}</span>
                    </nav>

                    {/* Project Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                            className="flex items-center gap-3 text-text text-3xl md:text-4xl font-bold leading-tight tracking-tight hover:text-primary transition-colors"
                        >
                            {selectedProject?.name || t('projects.select_project')}
                            <ChevronDown className={`size-6 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProjectDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                                {projects.map((project) => (
                                    <button
                                        key={project.id}
                                        onClick={() => {
                                            setSelectedProjectId(project.id);
                                            setIsProjectDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 hover:bg-surface-alt transition-colors ${project.id === selectedProjectId ? 'bg-primary/10 text-primary' : 'text-white'
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
                <div className="flex items-center gap-3">
                    {isLoadingBoard && <Loader2 className="size-5 text-primary animate-spin" />}

                    {/* Filter Button */}
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${isFilterOpen || searchQuery || priorityFilter || statusFilter
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-surface border-border hover:bg-surface-alt text-text'
                            }`}
                    >
                        <Filter className="size-4" />
                        {t('common.filter')}
                        {(searchQuery || priorityFilter || statusFilter) && (
                            <span className="flex items-center justify-center size-4 rounded-full bg-primary text-black text-[10px] font-bold">
                                {(searchQuery ? 1 : 0) + (priorityFilter ? 1 : 0) + (statusFilter ? 1 : 0)}
                            </span>
                        )}
                    </button>

                    {/* Activity Button */}
                    <button
                        onClick={() => setIsActivityDrawerOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border hover:bg-surface-alt text-text text-sm font-medium transition-all"
                    >
                        {t('projects.activity_feed', 'Activity')}
                    </button>

                    {/* Settings Button */}
                    <button
                        onClick={() => setIsProjectSettingsOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border hover:bg-surface-alt text-text text-sm font-medium transition-all"
                    >
                        {t('nav.settings')}
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            {isFilterOpen && (
                <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-xl bg-surface border border-border shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder={t('common.search_tasks')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full glass-input h-10 px-3 rounded-lg text-text text-sm"
                        />
                    </div>
                    <div className="w-full sm:w-48 shrink-0">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full glass-input h-10 px-3 rounded-lg text-text text-sm appearance-none bg-surface/50 cursor-pointer focus:ring-2 focus:ring-primary"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
                        >
                            <option value="">{t('common.all_statuses')}</option>
                            {projectData?.columns?.map((col) => (
                                <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full sm:w-48 shrink-0">
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="w-full glass-input h-10 px-3 rounded-lg text-text text-sm appearance-none bg-surface/50 cursor-pointer focus:ring-2 focus:ring-primary"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
                        >
                            <option value="">{t('common.all_priorities')}</option>
                            <option value="high">{t('common.priority.high')}</option>
                            <option value="medium">{t('common.priority.medium')}</option>
                            <option value="low">{t('common.priority.low')}</option>
                        </select>
                    </div>
                    <div className="w-full sm:w-auto shrink-0 flex items-center">
                        {(searchQuery || priorityFilter || statusFilter) ? (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setPriorityFilter('');
                                    setStatusFilter('');
                                }}
                                className="w-full px-4 h-10 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-surface-alt transition-colors whitespace-nowrap"
                            >
                                {t('common.clear_filters')}
                            </button>
                        ) : null}
                    </div>
                </div>
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
                                    setSelectedProjectId(nextProject.id);
                                } else {
                                    setSelectedProjectId(null);
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
                    onDeleteSubtask={handleDeleteSubtask}
                    onDeleteComment={handleDeleteComment}
                    onDeleteAttachment={handleDeleteAttachment}
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
