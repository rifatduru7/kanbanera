import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import {
    X,
    Link as Link2,
    Trash as Trash2,
    DotsThreeVertical,
    CaretRight as ChevronRight,
    CalendarBlank,
    Check,
    Plus,
    PaperPlaneRight as Send,
    CloudArrowUp as CloudUpload,
    FileText,
    Eye,
    CircleNotch as Loader2,
} from '@phosphor-icons/react';
import { useTask, useUpdateTask, useMoveTask, useDeleteTask, useAddComment, useDeleteComment, useAddSubtask, useToggleSubtask, useDeleteSubtask } from '../../hooks/useKanbanData';
import type { Subtask, Comment, TaskDetail, Attachment } from '../../types/task-detail';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useAuthStore } from '../../stores/authStore';
import { useViewport } from '../../hooks/useViewport';

interface TaskModalProps {
    taskId: string;
    isOpen: boolean;
    onClose: () => void;
    task?: TaskDetail;
    onUpdate?: (updates: Partial<TaskDetail>) => void;
    onAddSubtask?: (title: string) => Promise<void>;
    onToggleSubtask?: (subtaskId: string, completed: boolean) => Promise<void>;
    onAddComment?: (content: string) => Promise<void>;
    onUploadAttachment?: (file: File) => Promise<void>;
    columns?: { id: string; name: string }[];
    members?: TaskMember[];
    onMoveTask?: (columnId: string, position: number) => void;
    onDeleteTask?: () => void;
    onDeleteSubtask?: (subtaskId: string) => Promise<void>;
    onDeleteComment?: (commentId: string) => Promise<void>;
    onDeleteAttachment?: (attachmentId: string) => Promise<void>;
}

type TaskPriority = TaskDetail['priority'];

interface TaskMember {
    user_id: string;
    full_name: string;
}

const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high', 'critical'];

export function TaskModal({
    taskId,
    isOpen,
    onClose,
    task: propTask,
    onUpdate,
    onAddSubtask,
    onToggleSubtask,
    onAddComment,
    onUploadAttachment,
    columns,
    members,
    onMoveTask,
    onDeleteTask,
    onDeleteSubtask,
    onDeleteComment,
    onDeleteAttachment,
}: TaskModalProps) {
    const { t, i18n } = useTranslation();
    const { isMobile } = useViewport();
    const currentUserId = useAuthStore((state) => state.user?.id);
    const { data: fetchedTask } = useTask(taskId);
    const task = propTask || fetchedTask;

    // We need projectId for the other hooks, but we only get it once task is loaded
    const projectId = task?.projectId || '';

    const updateTask = useUpdateTask(projectId);
    const moveTask = useMoveTask(projectId);
    const deleteTask = useDeleteTask(projectId);
    const addComment = useAddComment(projectId);
    const deleteComment = useDeleteComment(projectId);
    const addSubtask = useAddSubtask(projectId);
    const toggleSubtask = useToggleSubtask(projectId);
    const deleteSubtask = useDeleteSubtask(projectId);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [newSubtask, setNewSubtask] = useState('');
    const [comment, setComment] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Confirmation states
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteSubtaskData, setDeleteSubtaskData] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });
    const [deleteAttachmentData, setDeleteAttachmentData] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });
    const [deleteCommentData, setDeleteCommentData] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });

    // New states for custom UI
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTagInput, setNewTagInput] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
    const [isPriorityOpen, setIsPriorityOpen] = useState(false);

    const closeDropdowns = () => {
        setIsStatusOpen(false);
        setIsAssigneeOpen(false);
        setIsPriorityOpen(false);
    };

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
        }
    }, [task]);

    if (!isOpen || !task) return null; // Render nothing if not open or task data is not loaded

    const completedSubtasks = task.subtasks.filter((s: Subtask) => s.isCompleted).length;
    const subtaskProgress = task.subtasks.length > 0
        ? (completedSubtasks / task.subtasks.length) * 100
        : 0;

    const handleTitleUpdate = () => {
        if (title.trim() !== task.title) {
            if (onUpdate) {
                onUpdate({ title: title.trim() });
            } else {
                updateTask.mutate({ id: task.id, title: title.trim() });
            }
        }
    };

    const handleDescriptionUpdate = () => {
        if (description.trim() !== task.description) {
            if (onUpdate) {
                onUpdate({ description: description.trim() });
            } else {
                updateTask.mutate({ id: task.id, description: description.trim() });
            }
        }
    };

    const handleAddSubtask = () => {
        if (newSubtask.trim()) {
            if (onAddSubtask) {
                onAddSubtask(newSubtask.trim());
            } else {
                addSubtask.mutate({ taskId: task.id, title: newSubtask.trim() });
            }
            setNewSubtask('');
        }
    };

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (comment.trim()) {
            if (onAddComment) {
                onAddComment(comment.trim());
            } else {
                addComment.mutate({ taskId: task.id, content: comment.trim() });
            }
            setComment('');
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            try {
                if (onUploadAttachment) {
                    await onUploadAttachment(file);
                } else {
                    // Internal hook for upload if we implement it later
                }
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);

        if (mins < 1) return t('common.time.just_now', 'Just now');
        if (mins < 60) return `${mins}${t('common.time.mins_ago', 'm ago')}`;
        if (hours < 24) return `${hours}${t('common.time.hours_ago', 'h ago')}`;
        return `${days}${t('common.time.days_ago', 'd ago')}`;
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="glass-panel w-full h-[100dvh] lg:h-auto lg:max-h-[90vh] lg:max-w-6xl flex flex-col lg:rounded-2xl shadow-2xl overflow-hidden relative z-20 mx-0 lg:mx-4 bg-surface lg:bg-transparent">
                {/* Header */}
                <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 border-b border-border-muted shrink-0 bg-surface/50 backdrop-blur-md">
                    <div className="flex flex-col gap-1 min-w-0 overflow-hidden">
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-1.5 lg:gap-2 text-xs lg:text-sm whitespace-nowrap overflow-hidden">
                            <span className="text-text-muted font-medium hover:text-primary cursor-pointer transition-colors truncate max-w-[80px] lg:max-w-[150px]">
                                {task.projectName}
                            </span>
                            <ChevronRight className="text-text-muted/50 size-3 lg:size-4 shrink-0" />
                            <span className="text-text-muted font-medium hover:text-primary cursor-pointer transition-colors truncate max-w-[80px] lg:max-w-[150px]">
                                {task.status}
                            </span>
                            <ChevronRight className="text-text-muted/50 size-3 lg:size-4 shrink-0" />
                            <span className="text-text font-medium truncate">TASK-{task.id.slice(0, 3).toUpperCase()}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 lg:gap-3 shrink-0 ml-2">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/dashboard?task=${task.id}`);
                                setLinkCopied(true);
                                setTimeout(() => setLinkCopied(false), 2000);
                            }}
                            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-alt text-text-muted transition-colors"
                            title={t('common.copy_link', 'Copy Link')}
                        >
                            {linkCopied ? <Check className="size-5 text-green-500" /> : <Link2 className="size-5" />}
                        </button>
                        <button
                            onClick={() => setIsDeleteOpen(true)}
                            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-alt text-text-muted transition-colors hover:text-red-400"
                            title={t('common.delete', 'Delete')}
                        >
                            <Trash2 className="size-5" />
                        </button>
                        <button
                            className="flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg hover:bg-surface-alt text-text-muted transition-colors"
                            title="More Options"
                        >
                            <DotsThreeVertical className="size-5" />
                        </button>
                        <div className="h-6 w-px bg-border-muted mx-1 hidden lg:block" />
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-white/70 transition-colors"
                            title={t('common.close', 'Close')}
                        >
                            <X className="size-5" />
                        </button>
                    </div>
                </div>

                {(isStatusOpen || isAssigneeOpen || isPriorityOpen) && (
                    <div className="fixed inset-0 z-30" onClick={closeDropdowns} />
                )}

                {/* Body - Unified scroll on mobile, split on desktop */}
                <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto mobile-scroll lg:overflow-hidden bg-surface-dark/50 lg:bg-transparent">
                    {/* LEFT COLUMN: Main Content */}
                    <div className="flex-1 p-4 lg:p-8 flex flex-col gap-6 lg:gap-8 border-b lg:border-b-0 lg:border-r border-border lg:overflow-y-auto custom-scrollbar">
                        {/* Title Input */}
                        <div className="group">
                            <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">
                                {t('tasks.title', 'Title')}
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={handleTitleUpdate}
                                placeholder={t('board.task_placeholder')}
                                className="w-full bg-transparent border-none p-0 text-2xl lg:text-3xl font-bold text-text focus:ring-0 placeholder:text-text-muted/20 leading-tight"
                            />
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-muted">
                                <FileText className="size-4" />
                                {t('tasks.description', 'Description')}
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={handleDescriptionUpdate}
                                className="glass-input w-full min-h-[160px] rounded-xl text-text placeholder:text-text-muted/50 p-4 text-base font-normal leading-relaxed resize-none"
                                placeholder={t('tasks.description_placeholder', 'Add a more detailed description...')}
                            />
                        </div>

                        {/* Subtasks */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm font-medium text-text-muted">
                                    <Check className="size-4" />
                                    {t('tasks.subtasks', 'Subtasks')}
                                </label>
                                <span className="text-xs font-medium text-text-muted bg-surface-alt px-2 py-1 rounded">
                                    {completedSubtasks}/{task.subtasks.length} {t('tasks.completed', 'Completed')}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1.5 w-full bg-surface-alt rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${subtaskProgress}%` }}
                                />
                            </div>

                            {/* Checklist */}
                            <div className="flex flex-col gap-2">
                                {task.subtasks.map((subtask: Subtask) => (
                                    <SubtaskItem
                                        key={subtask.id}
                                        subtask={subtask}
                                        onToggle={() => {
                                            if (onToggleSubtask) {
                                                onToggleSubtask(subtask.id, !subtask.isCompleted);
                                            } else {
                                                toggleSubtask.mutate({ taskId: task.id, subtaskId: subtask.id, isCompleted: !subtask.isCompleted });
                                            }
                                        }}
                                        onDelete={() => setDeleteSubtaskData({ isOpen: true, id: subtask.id })}
                                    />
                                ))}

                                {/* Add New Subtask */}
                                <div className="flex items-center gap-3 p-2 mt-1">
                                    <button
                                        onClick={handleAddSubtask}
                                        className="flex items-center justify-center w-5 h-5 rounded border border-dashed border-text-muted/50 text-text-muted hover:border-primary hover:text-primary transition-colors"
                                    >
                                        <Plus className="size-3" />
                                    </button>
                                    <input
                                        type="text"
                                        value={newSubtask}
                                        onChange={(e) => setNewSubtask(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                        placeholder={t('tasks.add_subtask', 'Add a subtask')}
                                        className="flex-1 bg-transparent border-none text-sm text-text placeholder:text-text-muted/50 focus:ring-0 p-0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Attachments */}
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-muted">
                                <CloudUpload className="size-4" />
                                {t('tasks.attachments', 'Attachments')}
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {task.attachments.map((attachment: Attachment) => (
                                    <AttachmentCard
                                        key={attachment.id}
                                        attachment={attachment}
                                        onDelete={() => setDeleteAttachmentData({ isOpen: true, id: attachment.id })}
                                    />
                                ))}

                                {/* Upload Button */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="border border-dashed border-border-muted hover:border-primary/50 hover:bg-primary/5 rounded-lg h-full min-h-[140px] flex flex-col items-center justify-center gap-2 text-white/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="size-6 animate-spin" />
                                            <span className="text-xs font-medium">{t('common.uploading', 'Uploading...')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <CloudUpload className="size-6" />
                                            <span className="text-xs font-medium">{t('tasks.upload_file', 'Upload File')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Sidebar & Comments */}
                    <div className="w-full lg:w-[360px] flex flex-col bg-black/20 backdrop-blur-sm lg:h-full lg:overflow-hidden">
                        {/* Metadata Panel */}
                        <div className="p-6 flex flex-col gap-6 border-b border-border">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                    {t('tasks.status', 'Status')}
                                </label>
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setIsStatusOpen(!isStatusOpen);
                                            setIsAssigneeOpen(false);
                                            setIsPriorityOpen(false);
                                        }}
                                        className="flex items-center justify-between w-full bg-surface-alt border border-border-muted rounded-lg px-3 py-2 text-sm text-text hover:border-primary/50 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                                            {task.status}
                                        </div>
                                        <ChevronRight className={`size-4 text-text-muted transition-transform ${isStatusOpen ? '-rotate-90' : 'rotate-90'}`} />
                                    </button>

                                    {isStatusOpen && (
                                        <div className="absolute top-full left-0 w-full mt-1.5 bg-surface border border-border-muted rounded-lg shadow-xl overflow-hidden z-40 py-1">
                                            {(columns || []).map((col: { id: string; name: string }) => (
                                                <button
                                                    key={col.id}
                                                    onClick={() => {
                                                        if (onMoveTask) {
                                                            onMoveTask(col.id, 0);
                                                        } else {
                                                            moveTask.mutate({ taskId: task.id, columnId: col.id, position: 0 });
                                                        }
                                                        setIsStatusOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-alt transition-colors ${task.columnId === col.id ? 'text-primary bg-primary/10' : 'text-white'}`}
                                                >
                                                    {col.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                    {t('tasks.priority', 'Priority')}
                                </label>
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setIsPriorityOpen(!isPriorityOpen);
                                            setIsAssigneeOpen(false);
                                            setIsStatusOpen(false);
                                        }}
                                        className="flex items-center justify-between w-full bg-surface-alt border border-border-muted rounded-lg px-3 py-2 text-sm text-text hover:border-primary/50 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 capitalize">
                                            {task.priority === 'low' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                                            {task.priority === 'medium' && <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                                            {task.priority === 'high' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />}
                                            {task.priority === 'critical' && <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                                            {task.priority || 'medium'}
                                        </div>
                                        <ChevronRight className={`size-4 text-text-muted transition-transform ${isPriorityOpen ? '-rotate-90' : 'rotate-90'}`} />
                                    </button>

                                    {isPriorityOpen && (
                                        <div className="absolute top-full left-0 w-full mt-1.5 bg-surface border border-border-muted rounded-lg shadow-xl overflow-hidden z-40 py-1">
                                            {PRIORITY_OPTIONS.map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => {
                                                        if (onUpdate) {
                                                            onUpdate({ priority: p });
                                                        } else {
                                                            updateTask.mutate({ id: task.id, priority: p });
                                                        }
                                                        setIsPriorityOpen(false);
                                                    }}
                                                    className={`w-full flex justify-start items-center gap-2 px-3 py-2 text-sm hover:bg-surface-alt transition-colors capitalize ${task.priority === p ? 'text-primary bg-primary/10' : 'text-white'}`}
                                                >
                                                    {p === 'low' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                                                    {p === 'medium' && <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                                                    {p === 'high' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />}
                                                    {p === 'critical' && <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Assignee & Due Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                        {t('tasks.assignee', 'Assignee')}
                                    </label>
                                    <div className="relative h-full">
                                        <div
                                            onClick={() => {
                                                setIsAssigneeOpen(!isAssigneeOpen);
                                                setIsStatusOpen(false);
                                                setIsPriorityOpen(false);
                                            }}
                                            className="flex items-center gap-2 w-full h-full cursor-pointer bg-surface-alt border border-border-muted rounded-lg px-2 py-1.5 text-sm text-text hover:bg-surface-alt/80 transition-colors"
                                        >
                                            {task.assigneeName ? (
                                                <>
                                                    <div className="size-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                                                        {task.assigneeName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="truncate">{task.assigneeName}</span>
                                                </>
                                            ) : (
                                                <span className="text-text-muted">{t('tasks.unassigned', 'Unassigned')}</span>
                                            )}
                                        </div>

                                        {isAssigneeOpen && (
                                                <div className={`absolute top-full left-0 mt-1.5 bg-surface border border-border-muted rounded-lg shadow-xl overflow-hidden z-40 py-1 max-h-48 overflow-y-auto custom-scrollbar ${isMobile ? 'w-full' : 'w-[200px]'}`}>
                                                    <button
                                                        onClick={() => {
                                                            if (onUpdate) {
                                                                onUpdate({ assigneeId: undefined });
                                                            } else {
                                                                updateTask.mutate({ id: task.id, assignee_id: undefined });
                                                            }
                                                            setIsAssigneeOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-alt transition-colors ${!task.assigneeId ? 'text-primary bg-primary/10' : 'text-white/70'}`}
                                                    >
                                                        {t('tasks.unassigned', 'Unassigned')}
                                                    </button>
                                                    {(members || []).map((m: { user_id: string; full_name: string }) => (
                                                        <button
                                                            key={m.user_id}
                                                            onClick={() => {
                                                                if (onUpdate) {
                                                                    onUpdate({ assigneeId: m.user_id });
                                                                } else {
                                                                    updateTask.mutate({ id: task.id, assignee_id: m.user_id });
                                                                }
                                                                setIsAssigneeOpen(false);
                                                            }}
                                                            className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-surface-alt transition-colors ${task.assigneeId === m.user_id ? 'text-primary bg-primary/10' : 'text-white'}`}
                                                        >
                                                            <div className="size-5 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-[9px] font-semibold text-primary shrink-0">
                                                                {m.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                                            </div>
                                                            <span className="truncate">{m.full_name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                        {t('tasks.due_date', 'Due Date')}
                                    </label>
                                    <div className="relative group h-full">
                                        <input
                                            type="date"
                                            value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                                            onChange={(e) => {
                                                const newDate = e.target.value || undefined;
                                                if (onUpdate) {
                                                    onUpdate({ dueDate: newDate });
                                                } else {
                                                    updateTask.mutate({ id: task.id, due_date: newDate });
                                                }
                                            }}
                                            className="appearance-none absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <button className="flex items-center gap-2 w-full h-full bg-surface-alt border border-border-muted rounded-lg px-2 py-1.5 text-sm text-text group-hover:bg-surface-alt/80 transition-colors">
                                            <CalendarBlank className="size-4 shrink-0 text-text-muted group-hover:text-primary transition-colors" />
                                            <span className="truncate">
                                                {task.dueDate
                                                    ? new Date(task.dueDate).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', day: 'numeric' })
                                                    : t('tasks.no_date', 'No date')}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-col gap-3">
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                    {t('tasks.tags', 'Tags')}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {task.labels?.map((label: string) => (
                                        <span
                                            key={label}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30"
                                        >
                                            <span className="size-1.5 rounded-full bg-primary" />
                                            {label}
                                            <button
                                                className="hover:bg-primary/30 rounded-full p-0.5 transition-colors ml-0.5"
                                                onClick={() => {
                                                    const newLabels = task.labels?.filter((l: string) => l !== label);
                                                    if (onUpdate) {
                                                        onUpdate({ labels: newLabels });
                                                    } else {
                                                        updateTask.mutate({ id: task.id, labels: newLabels });
                                                    }
                                                }}
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    ))}
                                    {isAddingTag ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="text"
                                                autoFocus
                                                value={newTagInput}
                                                onChange={(e) => setNewTagInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && newTagInput.trim()) {
                                                        const newLabels = [...(task.labels || []), newTagInput.trim()];
                                                        if (onUpdate) {
                                                            onUpdate({ labels: newLabels });
                                                        } else {
                                                            updateTask.mutate({ id: task.id, labels: newLabels });
                                                        }
                                                        setNewTagInput('');
                                                        setIsAddingTag(false);
                                                    } else if (e.key === 'Escape') {
                                                        setIsAddingTag(false);
                                                        setNewTagInput('');
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (newTagInput.trim()) {
                                                        const newLabels = [...(task.labels || []), newTagInput.trim()];
                                                        if (onUpdate) {
                                                            onUpdate({ labels: newLabels });
                                                        } else {
                                                            updateTask.mutate({ id: task.id, labels: newLabels });
                                                        }
                                                    }
                                                    setNewTagInput('');
                                                    setIsAddingTag(false);
                                                }}
                                                className="h-7 px-2 w-[100px] text-xs bg-surface-alt border border-primary/50 text-text rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-muted/50 transition-all"
                                                placeholder="Type & Enter"
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-dashed border-text-muted/50 text-text-muted hover:border-primary hover:text-primary transition-all text-xs font-medium"
                                            onClick={() => setIsAddingTag(true)}
                                        >
                                            <Plus className="size-3" />
                                            {t('tasks.add_tag', 'Add Tag')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="flex-1 flex flex-col bg-black/10 min-h-[400px] lg:min-h-0 lg:overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm font-medium text-text-muted">
                                    <span>💬</span>
                                    {t('tasks.activity', 'Activity')}
                                </label>
                                <span className="text-[10px] text-text-muted uppercase tracking-wider cursor-pointer hover:text-primary">
                                    {t('tasks.show_details', 'Show Details')}
                                </span >
                            </div >

                            {/* Comment List */}
                            <div className="flex-1 p-4 flex flex-col gap-4 lg:overflow-y-auto custom-scrollbar">
                                {task.comments.map((comment: Comment) => (
                                    <CommentItem
                                        key={comment.id}
                                        comment={comment}
                                        isOwn={comment.userId === currentUserId}
                                        formatTimeAgo={formatTimeAgo}
                                        onDelete={() => setDeleteCommentData({ isOpen: true, id: comment.id })}
                                    />
                                ))}
                            </div>

                            {/* Comment Input */}
                            <div className="p-4 border-t border-border-muted bg-surface-alt/30">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(e)}
                                        className="glass-input w-full rounded-lg pl-3 pr-10 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:ring-0"
                                        placeholder={t('tasks.comment_placeholder', 'Write a comment...')}
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        className="absolute right-1.5 top-1.5 p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                    >
                                        <Send className="size-5" />
                                    </button>
                                </div>
                            </div>
                        </div >
                    </div >
                </div >

                {/* Footer */}
                <div className="p-4 sm:px-6 pt-4 pb-[max(0.75rem,var(--safe-bottom))] border-t border-border-muted flex justify-end gap-3 bg-surface/50 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-alt border border-transparent hover:border-border transition-all"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={() => {
                            handleTitleUpdate();
                            handleDescriptionUpdate();
                            onClose();
                        }}
                        className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        {t('common.save_changes')}
                    </button>
                </div>
            </div >

            {/* Confirmation Dialogs */}
            <ConfirmDialog
                isOpen={isDeleteOpen}
                title={t('tasks.confirm_delete_title', 'Delete Task')}
                message={t('tasks.confirm_delete_message', 'Are you sure you want to delete this task? This action cannot be undone.')}
                confirmText={t('common.delete', 'Delete')}
                isDanger={true}
                onCancel={() => setIsDeleteOpen(false)}
                onConfirm={() => {
                    if (onDeleteTask) {
                        onDeleteTask();
                    } else {
                        deleteTask.mutate(task.id);
                        onClose();
                    }
                    setIsDeleteOpen(false);
                }}
            />

            <ConfirmDialog
                isOpen={deleteSubtaskData.isOpen}
                title={t('tasks.confirm_delete_subtask_title', 'Delete Subtask')}
                message={t('tasks.confirm_delete_subtask_message', 'Are you sure you want to delete this subtask?')}
                confirmText={t('common.delete', 'Delete')}
                isDanger={true}
                onCancel={() => setDeleteSubtaskData({ isOpen: false, id: '' })}
                onConfirm={() => {
                    if (onDeleteSubtask) {
                        onDeleteSubtask(deleteSubtaskData.id);
                    } else {
                        deleteSubtask.mutate({ taskId: task.id, subtaskId: deleteSubtaskData.id });
                    }
                    setDeleteSubtaskData({ isOpen: false, id: '' });
                }}
            />

            <ConfirmDialog
                isOpen={deleteAttachmentData.isOpen}
                title={t('tasks.confirm_delete_attachment_title', 'Delete Attachment')}
                message={t('tasks.confirm_delete_attachment_message', 'Are you sure you want to delete this attachment? The file will be permanently removed.')}
                confirmText={t('common.delete', 'Delete')}
                isDanger={true}
                onCancel={() => setDeleteAttachmentData({ isOpen: false, id: '' })}
                onConfirm={() => {
                    if (onDeleteAttachment) {
                        onDeleteAttachment(deleteAttachmentData.id);
                    } else {
                        // deleteAttachment.mutate(deleteAttachmentData.id); // Assuming hook exists
                    }
                    setDeleteAttachmentData({ isOpen: false, id: '' });
                }}
            />

            <ConfirmDialog
                isOpen={deleteCommentData.isOpen}
                title={t('tasks.confirm_delete_comment_title', 'Delete Comment')}
                message={t('tasks.confirm_delete_comment_message', 'Are you sure you want to delete this comment?')}
                confirmText={t('common.delete', 'Delete')}
                isDanger={true}
                onCancel={() => setDeleteCommentData({ isOpen: false, id: '' })}
                onConfirm={() => {
                    if (onDeleteComment) {
                        onDeleteComment(deleteCommentData.id);
                    } else {
                        deleteComment.mutate({ taskId: task.id, commentId: deleteCommentData.id });
                    }
                    setDeleteCommentData({ isOpen: false, id: '' });
                }}
            />
        </div>,
        document.body
    );
}

// Subtask Item Component
function SubtaskItem({
    subtask,
    onToggle,
    onDelete,
}: {
    subtask: Subtask;
    onToggle: () => void;
    onDelete?: () => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="group flex items-center justify-between p-3 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer">
            <div onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0">
                <div
                    className={`relative flex items-center justify-center w-5 h-5 rounded border transition-colors shrink-0 ${subtask.isCompleted
                        ? 'border-primary bg-primary text-black'
                        : 'border-text-muted/50 group-hover:border-primary bg-transparent'
                        }`}
                >
                    {subtask.isCompleted && <Check className="size-3" weight="bold" />}
                </div>
                <span
                    className={`text-sm truncate ${subtask.isCompleted
                        ? 'text-text-muted line-through decoration-primary decoration-2'
                        : 'text-text'
                        }`}
                >
                    {subtask.title}
                </span>
            </div>

            {onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-red-400 hover:bg-surface-alt rounded-md transition-all shrink-0 ml-2"
                    title={t('tasks.delete_subtask', 'Delete subtask')}
                >
                    <Trash2 className="size-4" />
                </button>
            )}
        </div>
    );
}

// Comment Item Component
function CommentItem({
    comment,
    isOwn,
    formatTimeAgo,
    onDelete,
}: {
    comment: Comment;
    isOwn: boolean;
    formatTimeAgo: (date: string) => string;
    onDelete?: () => void;
}) {
    const { t } = useTranslation();
    return (
        <div className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}>
            <div className="size-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-[10px] font-semibold text-primary flex-shrink-0 mt-1">
                {comment.userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className={`flex flex-col gap-1 max-w-[85%] ${isOwn ? 'items-end' : ''}`}>
                <div className={`flex items-baseline gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-bold text-text">{comment.userName}</span>
                    <span className="text-[10px] text-text-muted">{formatTimeAgo(comment.createdAt)}</span>
                </div>
                <div className={`relative flex items-start gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <p
                        className={`text-sm leading-relaxed p-3 rounded-lg ${isOwn
                            ? 'bg-primary/20 border border-primary/20 text-white rounded-tr-none text-right'
                            : 'bg-surface-alt text-text/80 rounded-tl-none'
                            }`}
                    >
                        {comment.content}
                    </p>

                    {onDelete && isOwn && (
                        <button
                            onClick={onDelete}
                            className="opacity-0 group-hover:opacity-100 p-1.5 mt-1 text-text-muted hover:text-red-400 hover:bg-surface-alt rounded-md transition-all shrink-0"
                            title={t ? t('common.delete', 'Delete') : 'Delete'}
                        >
                            <Trash2 className="size-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Attachment Card Component

function AttachmentCard({ attachment, onDelete }: { attachment: Attachment, onDelete?: () => void }) {
    const isImage = attachment.mimeType?.startsWith('image/');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string;

        const loadPreview = async () => {
            if (isImage) {
                try {
                    const { attachmentsApi } = await import('../../lib/api/client');
                    const url = await attachmentsApi.getDownloadUrl(attachment.id);
                    setPreviewUrl(url);
                    objectUrl = url;
                } catch (err) {
                    console.error('Failed to load preview', err);
                }
            }
        };

        loadPreview();

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [attachment.id, isImage]);

    const handleDownload = async () => {
        try {
            const { attachmentsApi } = await import('../../lib/api/client');
            const url = previewUrl || await attachmentsApi.getDownloadUrl(attachment.id);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (!previewUrl) URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download', err);
        }
    };

    const { t } = useTranslation();

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    function formatTimeAgo(dateStr: string) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return t('common.time.today', 'Today');
        if (days === 1) return t('common.time.yesterday', 'Yesterday');
        return `${days}${t('common.time.days_ago', 'd ago')}`;
    }

    return (
        <div
            onClick={handleDownload}
            className="bg-surface-alt border border-white/5 rounded-lg p-3 flex flex-col gap-2 hover:bg-surface-alt transition-colors cursor-pointer group relative"
        >
            <div className="w-full h-24 bg-surface-dark rounded overflow-hidden relative flex items-center justify-center">
                {isImage && previewUrl ? (
                    <img
                        src={previewUrl}
                        alt={attachment.fileName}
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <FileText className="size-10 text-text-muted/50" />
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 bg-black/50 hover:bg-black/80 rounded-md text-text transition-colors" title="View">
                        <Eye className="size-4" />
                    </button>
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1.5 bg-black/50 hover:bg-red-500/80 rounded-md text-white transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="size-4" />
                        </button>
                    )}
                </div>
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-medium text-text truncate" title={attachment.fileName}>{attachment.fileName}</span>
                <span className="text-[10px] text-text-muted">
                    {formatFileSize(attachment.fileSize)} • {formatTimeAgo(attachment.createdAt)}
                </span>
            </div>
        </div>
    );
}
