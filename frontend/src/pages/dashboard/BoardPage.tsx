import { useState, useMemo } from 'react';
import { Board } from '../../components/kanban/Board';
import { TaskModal } from '../../components/kanban/TaskModal';
import { Funnel as Filter, CircleNotch as Loader2, WarningCircle as AlertCircle, Kanban as FolderKanban, CaretDown as ChevronDown } from '@phosphor-icons/react';
import { useProjects, useProject, useMoveTask, useUpdateTask, useDeleteTask, useAddSubtask, useToggleSubtask, useAddComment, useUploadAttachment } from '../../hooks/useKanbanData';
import { CreateTaskModal } from '../../components/task/CreateTaskModal';
import { tasksApi } from '../../lib/api/client';
import type { Column, Task } from '../../types/kanban';
import type { TaskDetail } from '../../types/task-detail';

export function BoardPage() {
    // Selected project state
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
    const [activeAddTaskColumnId, setActiveAddTaskColumnId] = useState<string | undefined>();

    // Fetch projects list
    const { data: projectsData, isLoading: isLoadingProjects } = useProjects();
    const projects = projectsData?.projects || [];

    // Auto-select first project if none selected
    if (!selectedProjectId && projects.length > 0) {
        setSelectedProjectId(projects[0].id);
    }

    // Fetch board data for selected project
    const { data: projectData, isLoading: isLoadingBoard, error: boardError } = useProject(selectedProjectId || '');

    // API mutations
    const moveTask = useMoveTask(selectedProjectId || '');
    const updateTask = useUpdateTask(selectedProjectId || '');
    const deleteTask = useDeleteTask(selectedProjectId || '');
    const addSubtask = useAddSubtask(selectedProjectId || '');
    const toggleSubtask = useToggleSubtask(selectedProjectId || '');
    const addComment = useAddComment(selectedProjectId || '');
    const uploadAttachment = useUploadAttachment(selectedProjectId || '');

    // Transform API columns to Board component format
    const columns: Column[] = useMemo(() => {
        if (!projectData?.columns) return [];

        const projectTasks = projectData.tasks || [];

        return projectData.columns.map((col: any) => ({
            id: col.id,
            name: col.name,
            position: col.position,
            color: col.color || '#6366f1',
            tasks: projectTasks
                .filter((task: any) => task.column_id === col.id)
                .map((task: any) => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    priority: task.priority || 'medium',
                    columnId: col.id,
                    position: task.position,
                    labels: task.labels ? (typeof task.labels === 'string' ? JSON.parse(task.labels) : task.labels) : [],
                    dueDate: task.due_date,
                    assigneeName: task.assignee_name,
                    subtaskCount: task.subtask_count || 0,
                    subtaskCompleted: task.subtask_completed || 0,
                    commentCount: task.comment_count || 0,
                    attachmentCount: task.attachment_count || 0,
                    createdAt: task.created_at,
                    updatedAt: task.updated_at,
                })),
        })).sort((a: Column, b: Column) => a.position - b.position);
    }, [projectData]);

    const selectedProject = projects.find(p => p.id === selectedProjectId);

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
                const taskDetail: TaskDetail = {
                    id: taskData.id,
                    title: taskData.title,
                    description: taskData.description,
                    priority: taskData.priority,
                    status: column?.name || 'Unknown',
                    columnId: task.columnId,
                    projectId: selectedProjectId || '',
                    projectName: selectedProject?.name || 'Project',
                    assigneeId: taskData.assignee_id,
                    assigneeName: taskData.assignee_name,
                    dueDate: taskData.due_date,
                    labels: taskData.labels ? (typeof taskData.labels === 'string' ? JSON.parse(taskData.labels) : taskData.labels) : [],
                    subtasks: (taskData.subtasks || []).map((s: any) => ({
                        id: s.id,
                        taskId: taskData.id,
                        title: s.title,
                        isCompleted: s.is_completed,
                        position: s.position,
                        createdAt: s.created_at,
                    })),
                    comments: (taskData.comments || []).map((c: any) => ({
                        id: c.id,
                        taskId: taskData.id,
                        userId: c.user_id,
                        userName: c.full_name || 'User',
                        content: c.content,
                        createdAt: c.created_at,
                    })),
                    attachments: (taskData.attachments || []).map((a: any) => ({
                        id: a.id,
                        taskId: taskData.id,
                        fileName: a.file_name,
                        fileSize: a.file_size,
                        mimeType: a.mime_type,
                        downloadUrl: a.url,
                        thumbnailUrl: a.thumbnail_url,
                        createdAt: a.created_at,
                    })),
                    createdAt: taskData.created_at,
                    updatedAt: taskData.updated_at,
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
                            isCompleted: newSubtask.is_completed,
                            position: newSubtask.position,
                            createdAt: newSubtask.created_at,
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
                                userId: newComment.user_id,
                                userName: newComment.full_name || 'You', // Backend returns full_name via join on return
                                content: newComment.content,
                                createdAt: newComment.created_at,
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
                                fileName: newAttachment.file_name,
                                fileSize: newAttachment.file_size,
                                mimeType: newAttachment.mime_type,
                                downloadUrl: newAttachment.url,
                                thumbnailUrl: newAttachment.thumbnail_url,
                                createdAt: newAttachment.created_at,
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
                <h3 className="text-xl font-semibold text-white mb-2">No Projects Yet</h3>
                <p className="text-text-muted mb-4">Create your first project to get started</p>
                <a href="/projects" className="btn-primary px-4 py-2 rounded-lg">
                    Go to Projects
                </a>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 h-full">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div className="flex flex-col gap-2">
                    <nav aria-label="Breadcrumb" className="flex gap-2 text-sm mb-1">
                        <a href="#" className="text-slate-400 hover:text-primary transition-colors">
                            Home
                        </a>
                        <span className="text-slate-600">/</span>
                        <span className="text-primary font-medium">Board</span>
                    </nav>

                    {/* Project Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                            className="flex items-center gap-3 text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight hover:text-primary transition-colors"
                        >
                            {selectedProject?.name || 'Select Project'}
                            <ChevronDown className={`size-6 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProjectDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                                {projects.map((project: any) => (
                                    <button
                                        key={project.id}
                                        onClick={() => {
                                            setSelectedProjectId(project.id);
                                            setIsProjectDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${project.id === selectedProjectId ? 'bg-primary/10 text-primary' : 'text-white'
                                            }`}
                                    >
                                        <p className="font-medium">{project.name}</p>
                                        <p className="text-xs text-text-muted truncate">{project.description || 'No description'}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-slate-400 text-sm max-w-2xl">
                        {selectedProject?.description || 'Manage tasks and track progress'}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {isLoadingBoard && <Loader2 className="size-5 text-primary animate-spin" />}

                    {/* Filter Button */}
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-sm font-medium transition-all">
                        <Filter className="size-4" />
                        Filter
                    </button>
                </div>
            </div>

            {/* Error State */}
            {boardError && (
                <div className="flex items-center justify-center py-12 text-red-400">
                    <AlertCircle className="size-5 mr-2" />
                    Failed to load board
                </div>
            )}

            {/* Kanban Board */}
            {!boardError && columns.length > 0 && (
                <Board
                    columns={columns}
                    onTaskMove={handleTaskMove}
                    onTaskClick={handleTaskClick}
                    onAddTask={handleAddTask}
                />
            )}

            {/* Empty Board */}
            {!boardError && !isLoadingBoard && columns.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <FolderKanban className="size-12 text-text-muted mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Columns Yet</h3>
                    <p className="text-text-muted">Add columns to organize your tasks</p>
                </div>
            )}

            {/* Create Task Modal */}
            <CreateTaskModal
                isOpen={isCreateTaskModalOpen}
                onClose={() => {
                    setIsCreateTaskModalOpen(false);
                    setActiveAddTaskColumnId(undefined);
                }}
                defaultProjectId={selectedProjectId || undefined}
                defaultColumnId={activeAddTaskColumnId}
            />

            {/* Task Modal */}
            {selectedTask && (
                <TaskModal
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
                    onMoveTask={(columnId, position) => {
                        handleTaskMove(selectedTask.id, columnId, position);
                        setSelectedTask(prev => prev ? { ...prev, columnId, status: columns.find(c => c.id === columnId)?.name || prev.status } : null);
                    }}
                    onDeleteTask={() => {
                        deleteTask.mutate(selectedTask.id);
                        handleCloseModal();
                    }}
                />
            )}
        </div>
    );
}
