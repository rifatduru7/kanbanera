import { Plus, MessageSquare, Paperclip, ArrowRight, Check, UserPlus, Filter, Loader2, AlertCircle, Clock } from 'lucide-react';
import { useActivities, type Activity } from '../../hooks/useActivities';

type ActivityType = 'task_created' | 'comment' | 'file_uploaded' | 'task_moved' | 'task_completed' | 'member_joined';

interface ActivityItem {
    id: string;
    type: ActivityType;
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

const activityIcons: Record<ActivityType, { icon: React.ElementType; color: string }> = {
    task_created: { icon: Plus, color: 'bg-blue-500' },
    comment: { icon: MessageSquare, color: 'bg-yellow-500' },
    file_uploaded: { icon: Paperclip, color: 'bg-purple-500' },
    task_moved: { icon: ArrowRight, color: 'bg-orange-500' },
    task_completed: { icon: Check, color: 'bg-primary' },
    member_joined: { icon: UserPlus, color: 'bg-pink-500' },
};

// Transform API data to component format
function transformApiActivity(activity: Activity): ActivityItem {
    return {
        id: activity.id,
        type: activity.type as ActivityType,
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

// Fallback mock data for empty states
const fallbackActivities: ActivityItem[] = [
    {
        id: 'empty-1',
        type: 'task_created',
        user: { name: 'Get Started', initials: 'GS' },
        taskName: 'Your first activity',
        timestamp: 'Now',
    },
];

interface ActivityFeedProps {
    title?: string;
    compact?: boolean;
    limit?: number;
}

export function ActivityFeed({ title = 'Recent Activity', compact = false, limit = 20 }: ActivityFeedProps) {
    const { data: apiActivities, isLoading, error } = useActivities(limit);

    // Transform API data or use fallback
    const activities: ActivityItem[] = apiActivities?.length
        ? apiActivities.map(transformApiActivity)
        : fallbackActivities;

    return (
        <div className={`glass-card rounded-2xl flex flex-col overflow-hidden ${compact ? 'max-h-[400px]' : 'h-full'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-surface/50 backdrop-blur-sm">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-white text-lg font-bold">{title}</h3>
                    <p className="text-text-muted text-xs">Real-time updates across the project</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border hover:border-text-muted transition-all text-sm font-medium text-white">
                    <Filter className="size-4 text-primary" />
                    <span>Filter</span>
                </button>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-6 text-primary animate-spin" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="flex items-center justify-center py-12 text-red-400">
                    <AlertCircle className="size-5 mr-2" />
                    <span className="text-sm">Failed to load activities</span>
                </div>
            )}

            {/* Scrollable List */}
            {!isLoading && !error && (
                <div className="overflow-y-auto p-6 flex-1 space-y-0">
                    {activities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Clock className="size-12 text-text-muted/50 mb-3" />
                            <p className="text-white font-medium mb-1">No recent activity</p>
                            <p className="text-text-muted text-xs max-w-[200px]">When you or your team makes changes, they'll appear here.</p>
                        </div>
                    ) : (
                        activities.map((activity, index) => {
                            const activityConfig = activityIcons[activity.type] || activityIcons.task_created;
                            const Icon = activityConfig.icon;
                            const isLast = index === activities.length - 1;

                            return (
                                <div key={activity.id} className="group flex gap-4">
                                    {/* Timeline Column */}
                                    <div className="flex flex-col items-center flex-shrink-0 w-8">
                                        <div className="relative z-10">
                                            {/* Avatar */}
                                            <div className="size-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background">
                                                {activity.user.initials}
                                            </div>
                                            {/* Action Icon Badge */}
                                            <div className={`absolute -bottom-1 -right-1 size-4 ${activityConfig.color} rounded-full flex items-center justify-center ring-2 ring-background`}>
                                                <Icon className="size-2.5 text-white" />
                                            </div>
                                        </div>
                                        {/* Timeline line */}
                                        {!isLast && (
                                            <div className="w-px bg-border flex-grow my-2 min-h-[32px]" />
                                        )}
                                    </div>

                                    {/* Content Column */}
                                    <div className={`flex flex-col ${isLast ? 'pb-2' : 'pb-8'} pt-1`}>
                                        <p className="text-sm text-gray-300 leading-relaxed">
                                            <span className="font-semibold text-white">{activity.user.name}</span>
                                            {activity.type === 'task_created' && (
                                                <> created task <a href="#" className="text-primary hover:underline font-medium">{activity.taskName}</a></>
                                            )}
                                            {activity.type === 'comment' && (
                                                <> commented on <a href="#" className="text-primary hover:underline font-medium">{activity.taskName}</a></>
                                            )}
                                            {activity.type === 'file_uploaded' && (
                                                <> uploaded a file to <a href="#" className="text-primary hover:underline font-medium">{activity.taskName}</a></>
                                            )}
                                            {activity.type === 'task_moved' && (
                                                <>
                                                    {' '}moved <a href="#" className="text-primary hover:underline font-medium">{activity.taskName}</a>{' '}
                                                    from <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mx-1">{activity.columnFrom}</span>
                                                    to <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 mx-1">{activity.columnTo}</span>
                                                </>
                                            )}
                                            {activity.type === 'task_completed' && (
                                                <> completed <a href="#" className="text-primary hover:underline font-medium line-through decoration-primary/50">{activity.taskName}</a></>
                                            )}
                                            {activity.type === 'member_joined' && (
                                                <> joined the project team</>
                                            )}
                                        </p>

                                        {/* Comment Preview */}
                                        {activity.type === 'comment' && activity.comment && (
                                            <div className="mt-3 p-3 rounded-lg bg-background border border-border text-sm text-gray-300 italic">
                                                "{activity.comment}"
                                            </div>
                                        )}

                                        {/* File Preview */}
                                        {activity.type === 'file_uploaded' && activity.fileName && (
                                            <a href="#" className="mt-3 flex items-center gap-3 p-2 pr-4 rounded-lg bg-background border border-border hover:border-primary/50 transition-all w-fit">
                                                <div className="size-10 rounded bg-surface flex items-center justify-center text-primary">
                                                    <Paperclip className="size-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-white">{activity.fileName}</span>
                                                    <span className="text-xs text-text-muted">{activity.fileSize}</span>
                                                </div>
                                            </a>
                                        )}

                                        <span className="text-xs text-text-muted mt-1.5">{activity.timestamp}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-border bg-background/30">
                <button className="w-full py-2 text-xs font-medium text-text-muted hover:text-white hover:bg-background rounded-lg transition-colors uppercase tracking-wider">
                    Load older activity
                </button>
            </div>
        </div>
    );
}
