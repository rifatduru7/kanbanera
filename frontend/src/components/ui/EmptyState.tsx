import type { ReactNode } from 'react';
import { FolderOpen, ClipboardList, Search, Clock, Plus, ListTodo } from 'lucide-react';

interface EmptyStateProps {
    type?: 'projects' | 'tasks' | 'search' | 'activity' | 'custom';
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    icon?: ReactNode;
    variant?: 'primary' | 'secondary' | 'subtle';
}

const iconMap = {
    projects: FolderOpen,
    tasks: ClipboardList,
    search: Search,
    activity: Clock,
    custom: ListTodo,
};

export function EmptyState({
    type = 'custom',
    title,
    description,
    actionLabel,
    onAction,
    icon,
    variant = 'primary',
}: EmptyStateProps) {
    const IconComponent = iconMap[type];

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center group">
            {/* Illustration Area */}
            <div className="relative mb-8 size-48 flex items-center justify-center">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl scale-75 group-hover:scale-100 transition-transform duration-500" />

                {/* Icon */}
                {icon || (
                    <IconComponent
                        className="size-28 text-primary/80 drop-shadow-[0_0_15px_rgba(19,185,165,0.3)] relative z-10 transition-transform duration-300 group-hover:scale-110"
                    />
                )}
            </div>

            {/* Text */}
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-text-muted max-w-xs mb-8 leading-relaxed">{description}</p>

            {/* Action Button */}
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className={`
                        font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105
                        ${variant === 'primary'
                            ? 'bg-primary hover:bg-primary/90 text-background shadow-[0_0_20px_rgba(19,185,165,0.2)]'
                            : variant === 'secondary'
                                ? 'bg-transparent hover:bg-white/5 border border-white/20 hover:border-white/40 text-white'
                                : 'text-primary hover:text-primary/80 border-b border-primary/30 hover:border-primary pb-0.5 rounded-none'
                        }
                    `}
                >
                    {variant !== 'subtle' && <Plus className="size-5" />}
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// Pre-configured empty states for common use cases
export function NoProjectsEmptyState({ onCreateProject }: { onCreateProject?: () => void }) {
    return (
        <EmptyState
            type="projects"
            title="No projects yet"
            description="Create your first project to get started with your agile workflow."
            actionLabel="Create Project"
            onAction={onCreateProject}
            variant="primary"
        />
    );
}

export function EmptyColumnState({ onAddTask }: { onAddTask?: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center opacity-60 hover:opacity-100 transition-opacity">
            <div className="relative mb-4">
                <div className="absolute inset-0 border-2 border-dashed border-white/10 rounded-lg w-16 h-20 rotate-6" />
                <ClipboardList className="size-12 text-text-muted relative z-10" />
            </div>
            <p className="text-text-muted text-sm mb-3">No tasks yet</p>
            {onAddTask && (
                <button
                    onClick={onAddTask}
                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                    <Plus className="size-3" />
                    Add Task
                </button>
            )}
        </div>
    );
}

export function NoSearchResultsState({ onClearFilters }: { onClearFilters?: () => void }) {
    return (
        <EmptyState
            type="search"
            title="No results found"
            description="We couldn't find anything matching your search. Try adjusting your search or filters."
            actionLabel={onClearFilters ? "Clear all filters" : undefined}
            onAction={onClearFilters}
            variant="subtle"
            icon={
                <div className="relative">
                    <Search className="size-24 text-text-muted/50" />
                    <div className="absolute -right-2 -top-2 size-8 bg-surface rounded-full flex items-center justify-center border border-border">
                        <span className="text-red-400 text-lg">✕</span>
                    </div>
                </div>
            }
        />
    );
}

export function NoActivityState() {
    return (
        <EmptyState
            type="activity"
            title="No recent activity"
            description="When you or your team makes changes, a timeline of actions will appear here to keep you updated."
        />
    );
}

export function NoCalendarTasksState() {
    return (
        <EmptyState
            type="tasks"
            title="No tasks scheduled"
            description="No tasks are due this month. Create tasks with due dates to see them on the calendar."
        />
    );
}
