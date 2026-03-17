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
        avgCycleTimeDays: 0,
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
                        trend={completionRate > 0 ? { value: completionRate, isPositive: true } : undefined}
                        color="green"
                    />
                    <StatCard
                        title={t('metrics.avg_cycle_time') || 'Ort. Teslim Süresi'}
                        value={`${stats.avgCycleTimeDays % 1 === 0 ? stats.avgCycleTimeDays : stats.avgCycleTimeDays.toFixed(1)} ${t('common.days_label') || 'Gün'}`}
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

                {/* Main Row: Velocity & Completion */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Velocity Chart */}
                    <div className="lg:col-span-2 glass-card p-6 rounded-xl relative group">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                                <TrendingUp className="size-5 text-primary" />
                                {t('metrics.velocity') || 'Hız Grafiği (Son 14 Gün)'}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                                <div className="size-2 rounded-full bg-primary" />
                                <span>{t('metrics.completed_label') || 'Tamamlanan'}</span>
                            </div>
                        </div>

                        <div className="h-48 w-full flex items-end gap-2 px-2">
                            {data?.velocity.length ? (
                                data.velocity.map((v) => {
                                    const maxCount = Math.max(...data.velocity.map(d => d.count), 5);
                                    const height = (v.count / maxCount) * 100;
                                    return (
                                        <div key={v.day} className="flex-1 flex flex-col items-center gap-2 group/bar">
                                            <div className="relative w-full flex items-end justify-center h-32">
                                                {/* Tooltip */}
                                                <div className="absolute -top-8 bg-surface-alt text-text text-[10px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 border border-border">
                                                    {v.count} İş - {v.day}
                                                </div>
                                                <div
                                                    className="w-full max-w-[12px] rounded-t-sm bg-primary/40 group-hover/bar:bg-primary transition-all duration-300 relative overflow-hidden"
                                                    style={{ height: `${height}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-text-muted rotate-45 origin-left truncate w-8">
                                                {v.day.split('-').slice(1).join('/')}
                                            </span>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-muted text-sm italic">
                                    {t('metrics.no_velocity_data') || 'Yeterli veri yok'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Completion Rate Card */}
                    <div className="glass-card p-6 rounded-xl flex flex-col items-center justify-center text-center">
                        <h3 className="text-sm font-medium text-text-muted mb-6 w-full text-left">
                            {t('metrics.completion_status') || 'Genel Tamamlama Durumu'}
                        </h3>
                        <div className="relative size-44 mb-6">
                            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                <circle
                                    cx="18" cy="18" r="15.9155"
                                    className="text-white/5"
                                    strokeWidth="3.2"
                                    stroke="currentColor"
                                    fill="none"
                                />
                                <circle
                                    cx="18" cy="18" r="15.9155"
                                    className="text-primary drop-shadow-[0_0_8px_rgba(40,170,226,0.3)]"
                                    strokeWidth="3.2"
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="none"
                                    strokeDasharray={`${completionRate}, 100`}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-text">{completionRate}%</span>
                                <span className="text-xs text-text-muted uppercase tracking-wider">{t('metrics.success') || 'Başarı'}</span>
                            </div>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">
                            {t('metrics.completion_summary', { count: stats.completedTasks }) || `${stats.completedTasks} görev başarıyla sonuçlandırıldı.`}
                        </p>
                    </div>
                </div>

                {/* Bottom Row: Labels & Projects */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Label Distribution */}
                    <div className="glass-card p-6 rounded-xl">
                        <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
                            <BarChart3 className="size-5 text-primary" />
                            {t('metrics.label_distribution') || 'Etiket Dağılımı'}
                        </h3>
                        <div className="space-y-4">
                            {data?.labelDistribution.length ? (
                                data.labelDistribution.map((item, i) => (
                                    <ProgressBar
                                        key={item.label}
                                        label={item.label}
                                        value={item.count}
                                        max={Math.max(...data.labelDistribution.map(d => d.count))}
                                        color={teamColors[i % teamColors.length]}
                                    />
                                ))
                            ) : (
                                <p className="text-text-muted text-sm italic">{t('metrics.no_label_data') || 'Etiketli görev bulunamadı'}</p>
                            )}
                        </div>
                    </div>

                    {/* Project Performance */}
                    <div className="glass-card p-6 rounded-xl">
                        <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
                            <Users className="size-5 text-primary" />
                            {t('metrics.project_breakdown') || 'Proje Bazlı Performans'}
                        </h3>
                        <div className="space-y-5">
                            {data?.projectBreakdown.length ? (
                                data.projectBreakdown.map((project) => (
                                    <div key={project.id} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="size-2 rounded-full" style={{ backgroundColor: project.color }} />
                                                <span className="font-medium text-text">{project.name}</span>
                                            </div>
                                            <span className="text-text-muted">{project.percent}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-surface-alt rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${project.percent}%`,
                                                    backgroundColor: project.color
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-text-muted text-sm italic">{t('metrics.no_project_data') || 'Aktif proje bulunamadı'}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Team Performance Table/Grid */}
                <div className="bg-surface-alt/20 border border-border p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
                        <Users className="size-5 text-primary" />
                        {t('metrics.team_productivity') || 'Ekip Üretkenliği'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {data?.teamPerformance.length ? (
                            data.teamPerformance.map((member, index) => (
                                <div key={member.userId} className="glass-card hover:border-primary/30 transition-colors p-4 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Users className="size-12" />
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        {member.avatar ? (
                                            <img src={member.avatar} alt="" className="size-10 rounded-full border border-border" />
                                        ) : (
                                            <div className={`size-10 rounded-full ${teamColors[index % teamColors.length]} flex items-center justify-center text-white font-bold text-sm`}>
                                                {member.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-text font-semibold text-sm truncate">{member.name}</p>
                                            <p className="text-text-muted text-[10px] uppercase tracking-wider">{t('metrics.contributor') || 'Üye'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-primary">{member.completed}</p>
                                            <p className="text-[10px] text-text-muted uppercase">{t('metrics.done') || 'Biten'}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-blue-400">{member.inProgress}</p>
                                            <p className="text-[10px] text-text-muted uppercase">{t('metrics.doing') || 'Süren'}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-text-muted">{member.total}</p>
                                            <p className="text-[10px] text-text-muted uppercase">{t('metrics.all') || 'Hepsi'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-text-muted text-sm col-span-4 italic text-center py-4">{t('metrics.no_team_data')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
