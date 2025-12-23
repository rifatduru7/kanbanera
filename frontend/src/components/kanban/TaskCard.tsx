import { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Flag,
    MessageCircle,
    Paperclip,
    CheckCircle,
    Calendar,
    MoreHorizontal,
} from 'lucide-react';
import type { Task } from '../../types/kanban';
import { PRIORITY_COLORS, LABEL_COLORS } from '../../types/kanban';

interface TaskCardProps {
    task: Task;
    onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: { type: 'task', task },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const priorityStyle = PRIORITY_COLORS[task.priority];

    const primaryLabel = task.labels?.[0];
    const labelStyle = primaryLabel
        ? LABEL_COLORS[primaryLabel.toLowerCase() as keyof typeof LABEL_COLORS]
        : null;

    const subtaskProgress = useMemo(() => {
        if (!task.subtaskCount || task.subtaskCount === 0) return null;
        return `${task.subtaskCompleted || 0}/${task.subtaskCount}`;
    }, [task.subtaskCount, task.subtaskCompleted]);

    const formatDueDate = (dateStr?: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return { text: 'Overdue', color: 'text-red-400' };
        if (days === 0) return { text: 'Today', color: 'text-yellow-400' };
        if (days === 1) return { text: 'Tomorrow', color: 'text-yellow-400' };
        if (days <= 7) return { text: `${days}d left`, color: 'text-primary' };
        return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'text-slate-400' };
    };

    const dueInfo = formatDueDate(task.dueDate);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`
        group relative flex flex-col gap-3 glass-panel rounded-xl p-4 
        transition-all duration-200 cursor-grab active:cursor-grabbing
        hover:-translate-y-1 hover:shadow-lg hover:border-primary/50
        ${isDragging ? 'shadow-2xl scale-105 z-50' : ''}
      `}
        >
            {/* Top Row: Label & Menu */}
            <div className="flex w-full items-start justify-between">
                {labelStyle ? (
                    <span className={`px-2 py-1 rounded ${labelStyle.bg} ${labelStyle.text} text-[10px] font-bold uppercase`}>
                        {primaryLabel}
                    </span>
                ) : (
                    <div />
                )}
                <button
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <MoreHorizontal className="size-4" />
                </button>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium leading-snug text-slate-200 group-hover:text-white">
                    {task.title}
                </h3>
                {task.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                        {task.description}
                    </p>
                )}
            </div>

            {/* Priority & Due Date */}
            <div className="flex items-center gap-2 flex-wrap">
                {task.priority !== 'medium' && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${priorityStyle.bg} ${priorityStyle.text} text-xs font-medium`}>
                        <Flag className="size-3" />
                        <span className="capitalize">{task.priority}</span>
                    </div>
                )}
                {dueInfo && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${dueInfo.color}`}>
                        <Calendar className="size-3" />
                        <span>{dueInfo.text}</span>
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-white/5" />

            {/* Bottom Row: Metadata & Assignee */}
            <div className="flex items-center justify-between">
                {/* Reaction/Metadata Bar */}
                <div className="flex items-center gap-3">
                    {subtaskProgress && (
                        <div className="flex items-center gap-1.5 text-slate-500 hover:text-primary transition-colors">
                            <CheckCircle className="size-4" />
                            <span className="text-xs font-bold">{subtaskProgress}</span>
                        </div>
                    )}
                    {task.commentCount && task.commentCount > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-500 hover:text-primary transition-colors">
                            <MessageCircle className="size-4" />
                            <span className="text-xs font-bold">{task.commentCount}</span>
                        </div>
                    )}
                    {task.attachmentCount && task.attachmentCount > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-500 hover:text-primary transition-colors">
                            <Paperclip className="size-4" />
                            <span className="text-xs font-bold">{task.attachmentCount}</span>
                        </div>
                    )}
                </div>

                {/* Assignee Avatar */}
                {task.assigneeName && (
                    <div
                        className="size-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-[10px] font-semibold text-primary border border-white/10"
                        title={task.assigneeName}
                    >
                        {task.assigneeName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Hover Accent Line */}
            <div className="absolute left-0 top-4 h-[calc(100%-32px)] w-1 rounded-r bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
    );
}
