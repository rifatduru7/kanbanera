import { useState, useMemo } from 'react';
import {
    CircleNotch as Loader2,
    Fire as Flame,
    CheckCircle,
    Clock,
    ArrowRight,
    Target,
    TrendUp,
    Users,
    Calendar,
    Lightning,
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
                    {/* My Overdue - If any */}
                    {dashboardData?.myOverdue && dashboardData.myOverdue.length > 0 && (
                        <div className="glass-panel rounded-xl p-5 border-red-500/20 bg-red-500/5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                                    <Clock className="size-5" />
                                    {t('dashboard.stats.my_overdue')}
                                </h3>
                                <span className="text-sm font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                                    {dashboardData.myOverdue.length}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {dashboardData.myOverdue.map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-text">{task.title}</p>
                                            <p className="text-xs text-text-muted">{task.projectName}</p>
                                        </div>
                                        <span className="text-xs text-red-400 font-medium">
                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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

                    {/* Upcoming Deadlines (Next 7 Days) */}
                    <div className="glass-panel rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                                <Clock className="size-5 text-primary" />
                                {t('dashboard.stats.upcoming')}
                            </h3>
                            <span className="text-sm text-text-muted">
                                {t('dashboard.tasks_count', { count: dashboardData?.dueThisWeek.length || 0 })}
                            </span>
                        </div>

                        {isDashboardLoading ? (
                            <div className="flex items-center justify-center h-24">
                                <Loader2 className="size-6 animate-spin text-primary" />
                            </div>
                        ) : (dashboardData?.dueThisWeek.length || 0) === 0 ? (
                            <p className="text-sm text-text-muted italic">{t('dashboard.no_tasks_due')}</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {dashboardData?.dueThisWeek.slice(0, 6).map((task) => (
                                    <div key={task.id} className="p-3 rounded-lg bg-surface/30 border border-border flex items-center gap-3">
                                        <div className={`w-1.5 h-8 rounded-full ${priorityColors[task.priority] || 'bg-gray-500'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-text truncate">{task.title}</p>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] text-text-muted uppercase tracking-wider">{task.projectName}</span>
                                                <span className="text-[10px] text-primary font-bold">{new Date(task.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                </div>

                {/* Right Column - 1/3 */}
                <div className="space-y-6">
                    {/* Smart Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="glass-panel rounded-xl p-3 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{t('dashboard.stats.total_projects')}</span>
                            <span className="text-xl font-bold text-text">{stats.totalProjects}</span>
                        </div>
                        <div className="glass-panel rounded-xl p-3 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{t('dashboard.stats.total_tasks')}</span>
                            <span className="text-xl font-bold text-text">{stats.totalTasks}</span>
                        </div>
                        <div className="glass-panel rounded-xl p-3 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{t('dashboard.stats.completed')}</span>
                            <span className="text-xl font-bold text-green-500">{stats.completedTasks}</span>
                        </div>
                        <div className={`glass-panel rounded-xl p-3 flex flex-col items-center justify-center text-center ${stats.overdueTasks > 0 ? 'bg-red-500/5 border-red-500/20' : ''}`}>
                            <span className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{t('dashboard.stats.overdue')}</span>
                            <span className={`text-xl font-bold ${stats.overdueTasks > 0 ? 'text-red-500' : 'text-text'}`}>{stats.overdueTasks}</span>
                        </div>
                    </div>

                    {/* Automation Impact - Compact version */}
                    <div className="glass-panel rounded-xl p-3 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20 text-primary">
                            <Lightning className="size-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-text truncate">{t('dashboard.stats.automation_impact')}</p>
                            <p className="text-[10px] text-text-muted truncate">
                                {t('dashboard.stats.automated_desc', { count: dashboardData?.summary.automationCount || 0 })}
                            </p>
                        </div>
                    </div>

                    {/* Weekly Velocity / Productivity trend */}
                    <div className="glass-panel rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                            <TrendUp className="size-4 text-green-500" />
                            {t('dashboard.stats.weekly_velocity')}
                        </h3>
                        <div className="flex items-end justify-between h-20 gap-1 px-1">
                            {Array.from({ length: 7 }).map((_, i) => {
                                const d = new Date();
                                d.setDate(d.getDate() - (6 - i));
                                const dateStr = d.toISOString().split('T')[0];
                                const dataPoint = dashboardData?.weeklyVelocity.find(v => v.day === dateStr);
                                const count = dataPoint?.count || 0;
                                const maxCount = Math.max(...(dashboardData?.weeklyVelocity.map(v => v.count) || [1]), 1);
                                const height = (count / maxCount) * 100;

                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                                        <div
                                            className="w-full bg-primary/40 group-hover:bg-primary transition-all rounded-t-[2px]"
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        />
                                        <span className="text-[9px] text-text-muted uppercase font-medium">{t(`common.days.${d.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase()}`)}</span>
                                        {count > 0 && (
                                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface text-text text-[9px] px-1.5 py-0.5 rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {count} {t('dashboard.tasks_count', { count: count }).split(' ')[1]}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Priority Distribution Widget */}
                    <div className="glass-panel rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-text mb-3">{t('dashboard.stats.priority_dist')}</h3>
                        <div className="space-y-3">
                            {['critical', 'high', 'medium', 'low'].map((p) => {
                                const count = dashboardData?.priorityDistribution.find(item => item.priority === p)?.count || 0;
                                const total = dashboardData?.priorityDistribution.reduce((acc, curr) => acc + curr.count, 0) || 1;
                                const percent = Math.round((count / total) * 100);

                                return (
                                    <div key={p} className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-text-muted capitalize">{t(`common.priority.${p}`)}</span>
                                            <span className="text-text font-bold">{count}</span>
                                        </div>
                                        <div className="h-1 bg-surface-alt rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${priorityColors[p] || 'bg-gray-500'}`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Team Members Activity - More compact */}
                    <div className="glass-panel rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                                <Users className="size-4 text-primary" />
                                {t('dashboard.team')}
                            </h3>
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider"
                            >
                                {t('dashboard.invite')}
                            </button>
                        </div>

                        {isDashboardLoading ? (
                            <div className="flex items-center justify-center h-12">
                                <Loader2 className="size-4 animate-spin text-primary" />
                            </div>
                        ) : dashboardData?.teamMembers.length === 0 ? (
                            <div className="text-center py-2 text-text-muted text-[10px]">
                                <p>{t('dashboard.no_team_members')}</p>
                            </div>
                        ) : (
                            <div className="flex -space-x-2 overflow-hidden py-1">
                                {dashboardData?.teamMembers.slice(0, 10).map((member) => (
                                    <div
                                        key={member.id}
                                        className="inline-block size-7 rounded-full ring-2 ring-background bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px] cursor-help"
                                        title={member.name}
                                    >
                                        {member.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                ))}
                                {dashboardData && dashboardData.teamMembers.length > 10 && (
                                    <div className="inline-block size-7 rounded-full ring-2 ring-background bg-surface-alt flex items-center justify-center text-text-muted font-bold text-[10px]">
                                        +{dashboardData.teamMembers.length - 10}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Recent Activity */}
                    <div className="mt-2">
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
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-surface/50 border border-border">
            <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${colorClasses[color]}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-text truncate">
                    {value}{suffix}
                </p>
                <p className="text-[10px] sm:text-xs text-text-muted truncate">{label}</p>
            </div>
        </div>
    );
}
