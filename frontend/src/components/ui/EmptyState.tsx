import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { FolderOpen, ClipboardText as ClipboardList, MagnifyingGlass as Search, Clock, Plus, ListChecks as ListTodo } from '@phosphor-icons/react';

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
        <div className="flex flex-col items-center justify-center p-12 text-center group animate-in fade-in zoom-in-95 duration-700">
            {/* Illustration Area */}
            <div className="relative mb-8 size-48 flex items-center justify-center">
                {/* Magnetic Glow Effect */}
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-[60px] scale-75 group-hover:scale-100 group-hover:bg-primary/20 transition-all duration-700 animate-pulse-slow" />

                {/* Floating Element */}
                <div className="relative z-10 glass-card size-32 rounded-[2.5rem] flex items-center justify-center border border-border shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3 group-hover:shadow-primary/20">
                    {icon || (
                        <IconComponent
                            className="size-16 text-primary drop-shadow-[0_0_15px_rgba(40,170,226,0.4)] transition-all duration-500 group-hover:scale-110"
                        />
                    )}
                </div>

                {/* Decorative particles */}
                <div className="absolute top-1/4 right-1/4 size-2 bg-primary/40 rounded-full blur-sm animate-float delay-150" />
                <div className="absolute bottom-1/4 left-1/4 size-3 bg-cyan-400/30 rounded-full blur-sm animate-float delay-500" />
            </div>

            {/* Content Section */}
            <div className="space-y-3 max-w-sm">
                <h3 className="text-2xl font-bold text-text tracking-tight group-hover:text-primary transition-colors duration-500">{title}</h3>
                <p className="text-text-muted leading-relaxed text-sm">
                    {description}
                </p>
            </div>

            {/* Action Button */}
            {actionLabel && onAction && (
                <div className="mt-8 pt-4">
                    <button
                        onClick={onAction}
                        className={`
                            group/btn font-bold py-3 px-8 rounded-2xl flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 shadow-lg
                            ${variant === 'primary'
                                ? 'bg-primary text-black shadow-primary/25 hover:shadow-primary/40'
                                : variant === 'secondary'
                                    ? 'bg-surface/80 backdrop-blur-md border border-border text-text hover:bg-surface hover:border-border'
                                    : 'text-primary hover:text-text border-b-2 border-primary/20 hover:border-primary pb-1 rounded-none shadow-none'
                            }
                        `}
                    >
                        {variant !== 'subtle' && (
                            <div className="bg-black/10 rounded-full p-1 group-hover/btn:bg-black/20 transition-colors">
                                <Plus weight="bold" className="size-4" />
                            </div>
                        )}
                        <span className="tracking-wide uppercase text-xs">{actionLabel}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// Pre-configured empty states for common use cases
export function NoProjectsEmptyState({ onCreateProject }: { onCreateProject?: () => void }) {
    const { t } = useTranslation();
    return (
        <EmptyState
            type="projects"
            title={t('common.empty_states.no_projects.title')}
            description={t('common.empty_states.no_projects.description')}
            actionLabel={t('common.empty_states.no_projects.action')}
            onAction={onCreateProject}
            variant="primary"
        />
    );
}

export function EmptyColumnState({ onAddTask }: { onAddTask?: () => void }) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center opacity-60 hover:opacity-100 transition-opacity">
            <div className="relative mb-4">
                <div className="absolute inset-0 border-2 border-dashed border-border rounded-lg w-16 h-20 rotate-6" />
                <ClipboardList className="size-12 text-text-muted relative z-10" />
            </div>
            <p className="text-text-muted text-sm mb-3">{t('common.empty_states.no_tasks.title')}</p>
            {onAddTask && (
                <button
                    onClick={onAddTask}
                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                    <Plus className="size-3" />
                    {t('common.empty_states.no_tasks.action')}
                </button>
            )}
        </div>
    );
}

export function NoSearchResultsState({ onClearFilters }: { onClearFilters?: () => void }) {
    const { t } = useTranslation();
    return (
        <EmptyState
            type="search"
            title={t('common.empty_states.search.title')}
            description={t('common.empty_states.search.description')}
            actionLabel={onClearFilters ? t('common.empty_states.search.clear') : undefined}
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
    const { t } = useTranslation();
    return (
        <EmptyState
            type="activity"
            title={t('common.empty_states.activity.title')}
            description={t('common.empty_states.activity.description')}
        />
    );
}

export function NoCalendarTasksState() {
    const { t } = useTranslation();
    return (
        <EmptyState
            type="tasks"
            title={t('common.empty_states.calendar.title')}
            description={t('common.empty_states.calendar.description')}
        />
    );
}
