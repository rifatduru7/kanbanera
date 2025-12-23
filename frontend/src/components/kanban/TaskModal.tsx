import { useState } from 'react';
import {
    X,
    Link2,
    Trash2,
    MoreVertical,
    ChevronRight,
    Calendar,
    Check,
    Plus,
    Send,
    CloudUpload,
    FileText,
    Eye,
} from 'lucide-react';
import type { TaskDetail, Subtask, Comment } from '../../types/task-detail';

interface TaskModalProps {
    task: TaskDetail;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: (task: Partial<TaskDetail>) => void;
    onAddSubtask?: (title: string) => void;
    onToggleSubtask?: (subtaskId: string, completed: boolean) => void;
    onAddComment?: (content: string) => void;
    onUploadAttachment?: (file: File) => void;
}

export function TaskModal({
    task,
    isOpen,
    onClose,
    onUpdate,
    onAddSubtask,
    onToggleSubtask,
    onAddComment,
}: TaskModalProps) {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [newSubtask, setNewSubtask] = useState('');
    const [newComment, setNewComment] = useState('');

    if (!isOpen) return null;

    const completedSubtasks = task.subtasks.filter((s) => s.isCompleted).length;
    const subtaskProgress = task.subtasks.length > 0
        ? (completedSubtasks / task.subtasks.length) * 100
        : 0;

    const handleAddSubtask = () => {
        if (newSubtask.trim()) {
            onAddSubtask?.(newSubtask.trim());
            setNewSubtask('');
        }
    };

    const handleAddComment = () => {
        if (newComment.trim()) {
            onAddComment?.(newComment.trim());
            setNewComment('');
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="glass-panel w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden relative z-10 mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                    <div className="flex flex-col gap-1">
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-text-muted font-medium hover:text-primary cursor-pointer transition-colors">
                                {task.projectName}
                            </span>
                            <ChevronRight className="text-text-muted/50 size-4" />
                            <span className="text-text-muted font-medium hover:text-primary cursor-pointer transition-colors">
                                {task.status}
                            </span>
                            <ChevronRight className="text-text-muted/50 size-4" />
                            <span className="text-white font-medium">TASK-{task.id.slice(0, 3).toUpperCase()}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/10 text-text-muted transition-colors"
                            title="Copy Link"
                        >
                            <Link2 className="size-5" />
                        </button>
                        <button
                            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/10 text-text-muted transition-colors"
                            title="Delete Task"
                        >
                            <Trash2 className="size-5" />
                        </button>
                        <button
                            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/10 text-text-muted transition-colors"
                            title="More Options"
                        >
                            <MoreVertical className="size-5" />
                        </button>
                        <div className="h-6 w-px bg-white/10 mx-1" />
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-text-muted transition-colors"
                            title="Close"
                        >
                            <X className="size-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                    {/* LEFT COLUMN: Main Content */}
                    <div className="flex-1 overflow-y-auto p-6 lg:p-8 flex flex-col gap-8 border-b lg:border-b-0 lg:border-r border-white/10">
                        {/* Title Input */}
                        <div className="group">
                            <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">
                                Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={() => onUpdate?.({ title })}
                                className="w-full bg-transparent border-none p-0 text-2xl lg:text-3xl font-bold text-white focus:ring-0 placeholder:text-white/20 leading-tight"
                            />
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-muted">
                                <FileText className="size-4" />
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={() => onUpdate?.({ description })}
                                className="glass-input w-full min-h-[160px] rounded-xl text-white placeholder:text-text-muted/50 p-4 text-base font-normal leading-relaxed resize-none"
                                placeholder="Add a more detailed description..."
                            />
                        </div>

                        {/* Subtasks */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm font-medium text-text-muted">
                                    <Check className="size-4" />
                                    Subtasks
                                </label>
                                <span className="text-xs font-medium text-text-muted bg-white/5 px-2 py-1 rounded">
                                    {completedSubtasks}/{task.subtasks.length} Completed
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1.5 w-full bg-surface-dark rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${subtaskProgress}%` }}
                                />
                            </div>

                            {/* Checklist */}
                            <div className="flex flex-col gap-2">
                                {task.subtasks.map((subtask) => (
                                    <SubtaskItem
                                        key={subtask.id}
                                        subtask={subtask}
                                        onToggle={() => onToggleSubtask?.(subtask.id, !subtask.isCompleted)}
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
                                        placeholder="Add a subtask"
                                        className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-text-muted/50 focus:ring-0 p-0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Attachments */}
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-muted">
                                <CloudUpload className="size-4" />
                                Attachments
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {task.attachments.map((attachment) => (
                                    <AttachmentCard key={attachment.id} attachment={attachment} />
                                ))}

                                {/* Upload Button */}
                                <button className="border border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 rounded-lg h-full min-h-[140px] flex flex-col items-center justify-center gap-2 text-text-muted transition-all">
                                    <CloudUpload className="size-6" />
                                    <span className="text-xs font-medium">Upload to R2</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Sidebar & Comments */}
                    <div className="w-full lg:w-[360px] flex flex-col bg-black/20 backdrop-blur-sm">
                        {/* Metadata Panel */}
                        <div className="p-6 flex flex-col gap-6 border-b border-white/10">
                            {/* Status */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                    Status
                                </label>
                                <button className="flex items-center justify-between w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white hover:border-primary/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                                        {task.status}
                                    </div>
                                    <ChevronRight className="size-4 text-text-muted rotate-90" />
                                </button>
                            </div>

                            {/* Assignee & Due Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                        Assignee
                                    </label>
                                    <button className="flex items-center gap-2 w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white hover:bg-white/10 transition-colors">
                                        {task.assigneeName ? (
                                            <>
                                                <div className="size-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-[10px] font-semibold text-primary">
                                                    {task.assigneeName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <span className="truncate">{task.assigneeName}</span>
                                            </>
                                        ) : (
                                            <span className="text-text-muted">Unassigned</span>
                                        )}
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                        Due Date
                                    </label>
                                    <button className="flex items-center gap-2 w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white hover:bg-white/10 transition-colors">
                                        <Calendar className="size-4" />
                                        <span>
                                            {task.dueDate
                                                ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                : 'No date'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-col gap-3">
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                    Tags
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {task.labels?.map((label) => (
                                        <span
                                            key={label}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30"
                                        >
                                            <span className="size-1.5 rounded-full bg-primary" />
                                            {label}
                                            <button
                                                className="hover:bg-primary/30 rounded-full p-0.5 transition-colors ml-0.5"
                                                onClick={() => {/* TODO: Remove tag */ }}
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    ))}
                                    <button className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-dashed border-text-muted/50 text-text-muted hover:border-primary hover:text-primary transition-all text-xs font-medium">
                                        <Plus className="size-3" />
                                        Add Tag
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="flex-1 flex flex-col overflow-hidden min-h-[300px] bg-black/10">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm font-medium text-text-muted">
                                    <span>💬</span>
                                    Activity
                                </label>
                                <span className="text-[10px] text-text-muted uppercase tracking-wider cursor-pointer hover:text-primary">
                                    Show Details
                                </span>
                            </div>

                            {/* Comment List */}
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                                {task.comments.map((comment) => (
                                    <CommentItem
                                        key={comment.id}
                                        comment={comment}
                                        isOwn={comment.userName === 'You'}
                                        formatTimeAgo={formatTimeAgo}
                                    />
                                ))}
                            </div>

                            {/* Comment Input */}
                            <div className="p-4 border-t border-white/10 bg-surface-dark/30">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                        className="glass-input w-full rounded-lg pl-3 pr-10 py-2.5 text-sm text-white placeholder:text-text-muted/50 focus:ring-0"
                                        placeholder="Write a comment..."
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        className="absolute right-1.5 top-1.5 p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                    >
                                        <Send className="size-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-surface-dark/50 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onUpdate?.({ title, description });
                            onClose();
                        }}
                        className="px-6 py-2 rounded-lg text-sm font-bold text-black bg-primary hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(19,146,236,0.3)] hover:shadow-[0_0_20px_rgba(19,146,236,0.5)]"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

// Subtask Item Component
function SubtaskItem({
    subtask,
    onToggle,
}: {
    subtask: Subtask;
    onToggle: () => void;
}) {
    return (
        <div
            onClick={onToggle}
            className="group flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
            <div
                className={`relative flex items-center justify-center w-5 h-5 rounded border transition-colors ${subtask.isCompleted
                    ? 'border-primary bg-primary text-black'
                    : 'border-text-muted/50 group-hover:border-primary bg-transparent'
                    }`}
            >
                {subtask.isCompleted && <Check className="size-3" strokeWidth={3} />}
            </div>
            <span
                className={`text-sm ${subtask.isCompleted
                    ? 'text-text-muted line-through decoration-primary decoration-2'
                    : 'text-white'
                    }`}
            >
                {subtask.title}
            </span>
        </div>
    );
}

// Comment Item Component
function CommentItem({
    comment,
    isOwn,
    formatTimeAgo,
}: {
    comment: Comment;
    isOwn: boolean;
    formatTimeAgo: (date: string) => string;
}) {
    return (
        <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <div className="size-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-[10px] font-semibold text-primary flex-shrink-0 mt-1">
                {comment.userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : ''}`}>
                <div className={`flex items-baseline gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-bold text-white">{comment.userName}</span>
                    <span className="text-[10px] text-text-muted">{formatTimeAgo(comment.createdAt)}</span>
                </div>
                <p
                    className={`text-sm leading-relaxed p-3 rounded-lg ${isOwn
                        ? 'bg-primary/20 border border-primary/20 text-white rounded-tr-none text-right'
                        : 'bg-white/5 text-gray-300 rounded-tl-none'
                        }`}
                >
                    {comment.content}
                </p>
            </div>
        </div>
    );
}

// Attachment Card Component
import type { Attachment } from '../../types/task-detail';

function AttachmentCard({ attachment }: { attachment: Attachment }) {
    const isImage = attachment.mimeType?.startsWith('image/');

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col gap-2 hover:bg-white/10 transition-colors cursor-pointer group relative">
            <div className="w-full h-24 bg-surface-dark rounded overflow-hidden relative flex items-center justify-center">
                {isImage && attachment.thumbnailUrl ? (
                    <img
                        src={attachment.thumbnailUrl}
                        alt={attachment.fileName}
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <FileText className="size-10 text-text-muted/50" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="size-5 text-white" />
                </div>
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-medium text-white truncate">{attachment.fileName}</span>
                <span className="text-[10px] text-text-muted">
                    {formatFileSize(attachment.fileSize)} • {formatTimeAgo(attachment.createdAt)}
                </span>
            </div>
        </div>
    );

    function formatTimeAgo(dateStr: string) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return `${days}d ago`;
    }
}
