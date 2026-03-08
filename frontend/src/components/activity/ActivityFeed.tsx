import { useMemo, useState } from 'react';
import { Plus, ChatCircle as MessageSquare, Paperclip, ArrowRight, UserPlus, Funnel as Filter, CircleNotch as Loader2, WarningCircle as AlertCircle, CheckCircle } from '@phosphor-icons/react';
import { useActivities, type Activity, type ActivityType } from '../../hooks/useActivities';
import { NoActivityState } from '../ui/EmptyState';

type FeedActivityType = Exclude<ActivityType, 'all'>;

interface ActivityItem {
    id: string;
    type: FeedActivityType;
    user: {
        name: string;
        avatar?: string;
        initials: string;
    };
    taskName?: string;
    columnFrom?: string;
    columnTo?: string;
    comment?: string;
    fileName?: string;
    fileSize?: string;
    timestamp: string;
}

const activityIcons: Record<FeedActivityType, { icon: React.ElementType; color: string }> = {
    task_created: { icon: Plus, color: 'bg-blue-500' },
    comment: { icon: MessageSquare, color: 'bg-yellow-500' },
    file_uploaded: { icon: Paperclip, color: 'bg-purple-500' },
    task_moved: { icon: ArrowRight, color: 'bg-orange-500' },
    member_joined: { icon: UserPlus, color: 'bg-pink-500' },
};

function transformApiActivity(activity: Activity): ActivityItem {
    return {
        id: activity.id,
        type: activity.type as FeedActivityType,
        user: {
            name: activity.user.name,
            avatar: activity.user.avatar,
            initials: activity.user.initials,
        },
        taskName: activity.taskName,
        columnFrom: (activity.details?.from_column as string) || undefined,
        columnTo: (activity.details?.to_column as string) || undefined,
        comment: (activity.details?.comment as string) || undefined,
        fileName: (activity.details?.fileName as string) || undefined,
        fileSize: (activity.details?.fileSize as string) || undefined,
        timestamp: activity.timestamp,
    };
}

interface ActivityFeedProps {
    title?: string;
    compact?: boolean;
    limit?: number;
    projectId?: string;
}

export function ActivityFeed({ title = 'Recent Activity', compact = false, limit = 20, projectId }: ActivityFeedProps) {
    const [typeFilter, setTypeFilter] = useState<ActivityType>('all');

    const {
        data,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useActivities({ limit, type: typeFilter, projectId });

    const activities = useMemo(
        () => (data?.pages || []).flatMap((page) => page.activities).map(transformApiActivity),
        [data?.pages]
    );

    return (
        <div className={`glass-card rounded-2xl flex flex-col overflow-hidden ${compact ? 'max-h-[400px]' : 'h-full'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-border bg-surface/50 backdrop-blur-sm">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-text text-lg font-bold">{title}</h3>
                    <p className="text-text-muted text-xs">Real-time updates across the project</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="size-4 text-primary" />
                    <select
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value as ActivityType)}
                        className="glass-input h-10 sm:h-8 rounded-md px-2 text-xs flex-1 sm:flex-none"
                    >
                        <option value="all">All</option>
                        <option value="task_created">Task created</option>
                        <option value="task_moved">Task moved</option>
                        <option value="comment">Comments</option>
                        <option value="file_uploaded">Files</option>
                        <option value="member_joined">Members</option>
                    </select>
                </div>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-6 text-primary animate-spin" />
                </div>
            )}

            {error && (
                <div className="flex items-center justify-center py-12 text-red-400">
                    <AlertCircle className="size-5 mr-2" />
                    <span className="text-sm">Failed to load activities</span>
                </div>
            )}

            {!isLoading && !error && (
                <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-0 mobile-scroll">
                    {activities.length === 0 ? (
                        <NoActivityState />
                    ) : (
                        activities.map((activity, index) => {
                            const activityConfig = activityIcons[activity.type] || activityIcons.task_created;
                            const Icon = activityConfig.icon;
                            const isLast = index === activities.length - 1;

                            return (
                                <div key={activity.id} className="group flex gap-4">
                                    <div className="flex flex-col items-center flex-shrink-0 w-8">
                                        <div className="relative z-10">
                                            <div className="size-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-text text-xs font-bold ring-2 ring-background">
                                                {activity.user.initials}
                                            </div>
                                            <div className={`absolute -bottom-1 -right-1 size-4 ${activityConfig.color} rounded-full flex items-center justify-center ring-2 ring-background`}>
                                                <Icon className="size-2.5 text-text" />
                                            </div>
                                        </div>
                                        {!isLast && <div className="w-px bg-border flex-grow my-2 min-h-[32px]" />}
                                    </div>

                                    <div className={`flex flex-col ${isLast ? 'pb-2' : 'pb-8'} pt-1 min-w-0`}>
                                        <p className="text-sm text-text-muted leading-relaxed break-words">
                                            <span className="font-semibold text-text">{activity.user.name}</span>
                                            {activity.type === 'task_created' && <> created task <span className="text-primary font-medium">{activity.taskName}</span></>}
                                            {activity.type === 'comment' && <> commented on <span className="text-primary font-medium">{activity.taskName}</span></>}
                                            {activity.type === 'file_uploaded' && <> uploaded a file to <span className="text-primary font-medium">{activity.taskName}</span></>}
                                            {activity.type === 'task_moved' && (
                                                <>
                                                    {' '}moved <span className="text-primary font-medium">{activity.taskName}</span>{' '}
                                                    from <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mx-1 truncate max-w-[120px] align-middle">{activity.columnFrom}</span>
                                                    to <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 mx-1 truncate max-w-[120px] align-middle">{activity.columnTo}</span>
                                                </>
                                            )}
                                            {activity.type === 'member_joined' && <> joined the project team</>}
                                        </p>

                                        {activity.type === 'comment' && activity.comment && (
                                            <div className="mt-3 p-3 rounded-lg bg-background border border-border text-sm text-text italic">
                                                &quot;{activity.comment}&quot;
                                            </div>
                                        )}

                                        {activity.type === 'file_uploaded' && activity.fileName && (
                                            <div className="mt-3 flex items-center gap-3 p-2 pr-4 rounded-lg bg-background border border-border w-fit max-w-full">
                                                <div className="size-10 rounded bg-surface flex items-center justify-center text-primary shrink-0">
                                                    <Paperclip className="size-5" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium text-text truncate">{activity.fileName}</span>
                                                    <span className="text-xs text-text-muted">{activity.fileSize}</span>
                                                </div>
                                            </div>
                                        )}

                                        <span className="text-xs text-text-muted mt-1.5">{activity.timestamp}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            <div className="p-4 border-t border-border bg-background/30">
                {hasNextPage ? (
                    <button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="w-full py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-background rounded-lg transition-colors uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                        {isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                        {isFetchingNextPage ? 'Loading...' : 'Load older activity'}
                    </button>
                ) : (
                    <p className="w-full py-2 text-center text-xs text-text-muted uppercase tracking-wider">No older activity</p>
                )}
            </div>
        </div>
    );
}
