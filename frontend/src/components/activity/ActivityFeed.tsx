import { Plus, MessageSquare, Paperclip, ArrowRight, Check, UserPlus, Filter } from 'lucide-react';

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

// Mock data
const mockActivities: ActivityItem[] = [
    {
        id: '1',
        type: 'task_created',
        user: { name: 'Admin', initials: 'AD' },
        taskName: 'Q3 Planning',
        timestamp: '5h ago',
    },
    {
        id: '2',
        type: 'comment',
        user: { name: 'Sarah L.', initials: 'SL' },
        taskName: 'API Integration',
        comment: "I've updated the documentation endpoint. Please review the new schema.",
        timestamp: '3h ago',
    },
    {
        id: '3',
        type: 'file_uploaded',
        user: { name: 'Design Team', initials: 'DT' },
        taskName: 'Landing Page',
        fileName: 'mockup_v2.png',
        fileSize: '2.4 MB',
        timestamp: '2h ago',
    },
    {
        id: '4',
        type: 'task_moved',
        user: { name: 'Mike R.', initials: 'MR' },
        taskName: 'Login Flow',
        columnFrom: 'In Progress',
        columnTo: 'Testing',
        timestamp: '45m ago',
    },
    {
        id: '5',
        type: 'task_completed',
        user: { name: 'You', initials: 'YO' },
        taskName: 'Update Dependencies',
        timestamp: '15m ago',
    },
    {
        id: '6',
        type: 'member_joined',
        user: { name: 'Alex K.', initials: 'AK' },
        timestamp: 'Just now',
    },
];

interface ActivityFeedProps {
    activities?: ActivityItem[];
    title?: string;
    compact?: boolean;
}

export function ActivityFeed({ activities = mockActivities, title = 'Recent Activity', compact = false }: ActivityFeedProps) {
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

            {/* Scrollable List */}
            <div className="overflow-y-auto p-6 flex-1 space-y-0">
                {activities.map((activity, index) => {
                    const activityConfig = activityIcons[activity.type];
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
                })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-background/30">
                <button className="w-full py-2 text-xs font-medium text-text-muted hover:text-white hover:bg-background rounded-lg transition-colors uppercase tracking-wider">
                    Load older activity
                </button>
            </div>
        </div>
    );
}
