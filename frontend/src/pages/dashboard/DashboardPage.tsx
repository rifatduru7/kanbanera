import { useState, useMemo } from 'react';
import {
    CircleNotch as Loader2,
    Fire as Flame,
    CheckCircle,
    Clock,
    ArrowRight,
    Plus,
    Target,
    TrendUp,
    Users,
    Calendar,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ActivityFeed } from '../../components/activity/ActivityFeed';
import { CreateProjectModal } from '../../components/project/CreateProjectModal';
import { CreateTaskModal } from '../../components/task/CreateTaskModal';
import { InviteMemberModal } from '../../components/member/InviteMemberModal';
import { useMetrics, useDashboardMetrics, useCompletionRate } from '../../hooks/useMetrics';

const priorityColors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
};

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
}

export function DashboardPage() {
    const { t } = useTranslation();
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const { data } = useMetrics();
    const { data: dashboardData, isLoading: isDashboardLoading } = useDashboardMetrics();
    const completionRate = useCompletionRate();

    const greeting = useMemo(() => getGreeting(), []);
    const greetingText = t(`common.greeting.${greeting}`, t(`common.time.${greeting}`, greeting));

    const stats = data?.stats || {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        totalProjects: 0,
        activeProjects: 0,
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Hero Section */}
            <div className="glass-panel rounded-2xl p-6 bg-gradient-to-br from-primary/10 via-background to-blue-500/5 border border-primary/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-text">
                            {t('dashboard.greeting_full', { greeting: greetingText })}
                        </h1>
                        <p className="text-text-muted mt-1">
                            {dashboardData?.summary?.dueTodayCount
                                ? t('dashboard.tasks_due_today', { count: dashboardData.summary.dueTodayCount })
                                : t('dashboard.no_tasks_due')}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:flex items-center gap-3">
                        <button
                            onClick={() => setIsProjectModalOpen(true)}
                            className="btn-primary w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20"
                        >
                            {t('dashboard.new_project_btn')}
                        </button>
                        <button
                            onClick={() => setIsTaskModalOpen(true)}
                            className="btn-secondary w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold"
                        >
                            {t('dashboard.add_task_btn')}
                        </button>
                    </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <StatRing
                        label={t('dashboard.stats.completion')}
                        value={completionRate}
                        color="primary"
                        icon={<CheckCircle className="size-5" />}
                    />
                    <StatRing
                        label={t('dashboard.stats.due_today')}
                        value={dashboardData?.summary?.dueTodayCount || 0}
                        color={(dashboardData?.summary?.dueTodayCount ?? 0) > 0 ? 'yellow' : 'green'}
                        icon={<Clock className="size-5" />}
                    />
                    <StatRing
                        label={t('dashboard.stats.streak')}
                        value={dashboardData?.streak || 0}
                        suffix={t('dashboard.stats.days_suffix')}
                        color="orange"
                        icon={<Flame className="size-5" />}
                    />
                    <StatRing
                        label={t('dashboard.stats.in_progress')}
                        value={stats.inProgressTasks}
                        color="blue"
                        icon={<Target className="size-5" />}
                    />
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - 2/3 */}
                <div className="lg:col-span-2 space-y-6">
                    {/* My Focus - Tasks due today */}
                    <div className="glass-panel rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                                <Calendar className="size-5 text-primary" />
                                {t('dashboard.my_focus')}
                            </h3>
                            <span className="text-sm text-text-muted">
                                {t('dashboard.tasks_count', { count: dashboardData?.dueToday.length || 0 })}
                            </span>
                        </div>

                        {isDashboardLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="size-6 animate-spin text-primary" />
                            </div>
                        ) : dashboardData?.dueToday.length === 0 ? (
                            <div className="text-center py-8 text-text-muted">
                                <CheckCircle className="size-12 mx-auto mb-2 text-green-500/50" />
                                <p>{t('dashboard.no_tasks_due_today')}</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {dashboardData?.dueToday.slice(0, 5).map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-surface/50 border border-border hover:border-primary/30 transition-colors"
                                    >
                                        <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority] || 'bg-gray-500'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-text truncate">{task.title}</p>
                                            <p className="text-xs text-text-muted">{task.projectName}</p>
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded bg-surface-alt text-text-muted">
                                            {task.columnName}
                                        </span>
                                    </div>
                                ))}
                                {dashboardData && dashboardData.dueToday.length > 5 && (
                                    <Link
                                        to="/board"
                                        className="flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-2"
                                    >
                                        {t('dashboard.view_all_tasks', { count: dashboardData.dueToday.length })}
                                        <ArrowRight className="size-4" />
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Project Progress */}
                    <div className="glass-panel rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                                <TrendUp className="size-5 text-primary" />
                                {t('dashboard.project_progress')}
                            </h3>
                            <Link to="/projects" className="text-sm text-primary hover:underline">
                                {t('common.view_all')}
                            </Link>
                        </div>

                        {isDashboardLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="size-6 animate-spin text-primary" />
                            </div>
                        ) : dashboardData?.projectProgress.length === 0 ? (
                            <div className="text-center py-8 text-text-muted">
                                <p>{t('dashboard.no_active_projects')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {dashboardData?.projectProgress.map((project) => (
                                    <div key={project.id} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-text">{project.name}</span>
                                            <span className="text-sm text-text-muted">
                                                {project.completedTasks}/{project.totalTasks} ({project.progressPercent}%)
                                            </span>
                                        </div>
                                        <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${project.progressPercent >= 80
                                                    ? 'bg-green-500'
                                                    : project.progressPercent >= 50
                                                        ? 'bg-yellow-500'
                                                        : 'bg-primary'
                                                    }`}
                                                style={{ width: `${project.progressPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Team Members Activity */}
                    <div className="glass-panel rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                                <Users className="size-5 text-primary" />
                                {t('dashboard.team')}
                            </h3>
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="text-sm text-primary hover:underline"
                            >
                                {t('dashboard.invite')}
                            </button>
                        </div>

                        {isDashboardLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="size-6 animate-spin text-primary" />
                            </div>
                        ) : dashboardData?.teamMembers.length === 0 ? (
                            <div className="text-center py-8 text-text-muted">
                                <p>{t('dashboard.no_team_members')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {dashboardData?.teamMembers.slice(0, 4).map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-surface/50 border border-border"
                                    >
                                        <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                                            {member.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-text truncate">{member.name}</p>
                                            <p className="text-xs text-text-muted truncate">{member.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - 1/3 */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="glass-panel rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-text mb-4">{t('dashboard.quick_actions')}</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => setIsProjectModalOpen(true)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg text-left text-text hover:bg-surface-alt transition-colors"
                            >
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Plus className="size-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{t('dashboard.actions.new_project')}</p>
                                    <p className="text-xs text-text-muted">{t('dashboard.actions.new_project_desc')}</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setIsTaskModalOpen(true)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg text-left text-text hover:bg-surface-alt transition-colors"
                            >
                                <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                    <CheckCircle className="size-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{t('dashboard.actions.add_task')}</p>
                                    <p className="text-xs text-text-muted">{t('dashboard.actions.add_task_desc')}</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg text-left text-text hover:bg-surface-alt transition-colors"
                            >
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <Users className="size-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{t('dashboard.actions.invite_member')}</p>
                                    <p className="text-xs text-text-muted">{t('dashboard.actions.invite_member_desc')}</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="glass-panel rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-text mb-4">{t('dashboard.overview')}</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                                <span className="text-sm text-text-muted">{t('dashboard.stats.total_projects')}</span>
                                <span className="text-lg font-bold text-text">{stats.totalProjects}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                                <span className="text-sm text-text-muted">{t('dashboard.stats.total_tasks')}</span>
                                <span className="text-lg font-bold text-text">{stats.totalTasks}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                                <span className="text-sm text-text-muted">{t('dashboard.stats.completed')}</span>
                                <span className="text-lg font-bold text-green-500">{stats.completedTasks}</span>
                            </div>
                            {stats.overdueTasks > 0 && (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10">
                                    <span className="text-sm text-red-400">{t('dashboard.stats.overdue')}</span>
                                    <span className="text-lg font-bold text-red-400">{stats.overdueTasks}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                        <ActivityFeed compact={true} title={t('dashboard.recent_activity')} />
                    </div>
                </div>
            </div>

            <CreateProjectModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
            />
            <CreateTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
            />
            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />
        </div>
    );
}

interface StatRingProps {
    label: string;
    value: number;
    color: 'primary' | 'green' | 'yellow' | 'orange' | 'blue' | 'purple';
    icon: React.ReactNode;
    suffix?: string;
}

function StatRing({ label, value, color, icon, suffix = '' }: StatRingProps) {
    const colorClasses = {
        primary: 'text-primary bg-primary/10',
        green: 'text-green-500 bg-green-500/10',
        yellow: 'text-yellow-500 bg-yellow-500/10',
        orange: 'text-orange-500 bg-orange-500/10',
        blue: 'text-blue-500 bg-blue-500/10',
        purple: 'text-purple-500 bg-purple-500/10',
    };

    return (
        <div className="flex flex-col xs:flex-row items-center gap-2 xs:gap-3 p-2.5 xs:p-3 rounded-xl bg-surface/50 border border-border">
            <div className={`p-1.5 xs:p-2 rounded-lg shrink-0 ${colorClasses[color]}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-lg xs:text-xl md:text-2xl font-bold text-text truncate">
                    {value}{suffix}
                </p>
                <p className="text-[10px] xs:text-xs text-text-muted truncate">{label}</p>
            </div>
        </div>
    );
}
