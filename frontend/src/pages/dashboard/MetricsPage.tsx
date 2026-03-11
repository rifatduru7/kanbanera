import { useTranslation } from 'react-i18next';
import { ChartBar as BarChart3, CheckCircle, Clock, Warning as AlertTriangle, TrendUp as TrendingUp, Users, CircleNotch as Loader2 } from '@phosphor-icons/react';
import { useMetrics, useCompletionRate } from '../../hooks/useMetrics';

// Stat Card Component
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
    color: 'primary' | 'green' | 'yellow' | 'red' | 'blue';
}

const colorClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

function StatCard({ title, value, icon, trend, color }: StatCardProps) {
    return (
        <div className="glass-card p-6 rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-muted">{title}</span>
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-text">{value}</span>
                {trend && (
                    <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        <TrendingUp className={`size-4 ${!trend.isPositive && 'rotate-180'}`} />
                        <span>{trend.value}%</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Simple Progress Bar Chart
interface ProgressBarProps {
    label: string;
    value: number;
    max: number;
    color: string;
}

function ProgressBar({ label, value, max, color }: ProgressBarProps) {
    const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted w-24 truncate capitalize">{label}</span>
            <div className="flex-1 h-2 bg-surface-alt rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-sm font-medium text-text w-12 text-right">{value}</span>
        </div>
    );
}

const priorityColors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
    none: 'bg-gray-500',
};

const teamColors = ['bg-primary', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];

export function MetricsPage() {
    const { t } = useTranslation();
    const { data, isLoading, error } = useMetrics();
    const completionRate = useCompletionRate();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 text-primary animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64 text-red-400">
                <AlertTriangle className="size-6 mr-2" />
                {t('metrics.failed_load')}
            </div>
        );
    }

    const stats = data?.stats || {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
    };

    return (
        <div className="flex flex-col lg:h-full min-h-0 overflow-visible lg:overflow-hidden">
            {/* Header */}
            <header className="flex-shrink-0 px-4 sm:px-6 py-5 sm:py-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <BarChart3 className="size-8 text-primary" />
                    <div>
                        <h2 className="text-3xl font-bold text-text tracking-tight">{t('metrics.title')}</h2>
                        <p className="text-text-muted text-sm">{t('metrics.subtitle')}</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-6 lg:flex-1 lg:min-h-0 lg:overflow-y-auto mobile-scroll">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title={t('metrics.total_tasks')}
                        value={stats.totalTasks}
                        icon={<CheckCircle className="size-5" />}
                        color="primary"
                    />
                    <StatCard
                        title={t('metrics.completed')}
                        value={stats.completedTasks}
                        icon={<CheckCircle className="size-5" />}
                        trend={{ value: 12, isPositive: true }}
                        color="green"
                    />
                    <StatCard
                        title={t('metrics.in_progress')}
                        value={stats.inProgressTasks}
                        icon={<Clock className="size-5" />}
                        color="blue"
                    />
                    <StatCard
                        title={t('metrics.overdue')}
                        value={stats.overdueTasks}
                        icon={<AlertTriangle className="size-5" />}
                        trend={stats.overdueTasks > 0 ? { value: stats.overdueTasks, isPositive: false } : undefined}
                        color="red"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Completion Rate Card */}
                    <div className="glass-card p-6 rounded-xl">
                        <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
                            <TrendingUp className="size-5 text-primary" />
                            {t('metrics.project_completion')}
                        </h3>

                        <div className="flex items-center justify-center mb-6">
                            <div className="relative size-40">
                                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className="text-white/10"
                                        strokeWidth="3"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="text-primary"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        strokeDasharray={`${completionRate}, 100`}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold text-text">{completionRate}%</span>
                                    <span className="text-sm text-text-muted">{t('metrics.complete_label')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="size-3 rounded-full bg-primary" />
                                <span className="text-text-muted">{t('metrics.completed_count', { count: stats.completedTasks })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="size-3 rounded-full bg-surface-alt" />
                                <span className="text-text-muted">{t('metrics.remaining_label', { count: stats.totalTasks - stats.completedTasks })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Priority Distribution */}
                    <div className="glass-card p-6 rounded-xl">
                        <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
                            <AlertTriangle className="size-5 text-primary" />
                            {t('metrics.priority_distribution')}
                        </h3>

                        <div className="space-y-4">
                            {data?.priorityDistribution.length ? (
                                data.priorityDistribution.map((item) => (
                                    <ProgressBar
                                        key={item.priority}
                                        label={t(`common.priority.${item.priority}`)}
                                        value={item.count}
                                        max={stats.totalTasks}
                                        color={priorityColors[item.priority] || 'bg-gray-500'}
                                    />
                                ))
                            ) : (
                                <p className="text-text-muted text-sm">{t('metrics.no_priority_data')}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Team Performance */}
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
                        <Users className="size-5 text-primary" />
                        {t('metrics.team_performance')}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {data?.teamPerformance.length ? (
                            data.teamPerformance.map((member, index) => (
                                <div key={member.userId} className="bg-surface rounded-xl p-4 border border-border">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`size-10 rounded-full ${teamColors[index % teamColors.length]} flex items-center justify-center text-text font-bold`}>
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-text font-medium text-sm">{member.name}</p>
                                            <p className="text-text-muted text-xs">#{index + 1} {t('metrics.contributor')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-2xl font-bold text-text">{member.completed}</span>
                                        <span className="text-xs text-text-muted">{t('metrics.tasks_completed')}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-text-muted text-sm col-span-4">{t('metrics.no_team_data')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
