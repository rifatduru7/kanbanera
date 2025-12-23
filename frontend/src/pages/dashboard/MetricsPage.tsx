import { BarChart3, CheckCircle, Clock, AlertTriangle, TrendingUp, Users } from 'lucide-react';

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
                <span className="text-3xl font-bold text-white">{value}</span>
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
    const percentage = Math.round((value / max) * 100);
    return (
        <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted w-24 truncate">{label}</span>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-sm font-medium text-white w-12 text-right">{value}</span>
        </div>
    );
}

// Mock data
const mockStats = {
    totalTasks: 156,
    completedTasks: 89,
    inProgressTasks: 42,
    overdueTasks: 7,
};

const mockTeamPerformance = [
    { name: 'Alex Morgan', completed: 28, color: 'bg-primary' },
    { name: 'Sarah Chen', completed: 24, color: 'bg-blue-500' },
    { name: 'Mike Johnson', completed: 19, color: 'bg-purple-500' },
    { name: 'Emily Davis', completed: 18, color: 'bg-pink-500' },
];

const mockPriorityDistribution = [
    { label: 'Critical', value: 12, color: 'bg-red-500' },
    { label: 'High', value: 34, color: 'bg-orange-500' },
    { label: 'Medium', value: 67, color: 'bg-yellow-500' },
    { label: 'Low', value: 43, color: 'bg-green-500' },
];

export function MetricsPage() {
    const completionRate = Math.round((mockStats.completedTasks / mockStats.totalTasks) * 100);

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <header className="flex-shrink-0 px-6 py-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <BarChart3 className="size-8 text-primary" />
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Metrics & Analytics</h2>
                        <p className="text-text-muted text-sm">Track your project performance and team productivity</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 p-6 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Tasks"
                        value={mockStats.totalTasks}
                        icon={<CheckCircle className="size-5" />}
                        color="primary"
                    />
                    <StatCard
                        title="Completed"
                        value={mockStats.completedTasks}
                        icon={<CheckCircle className="size-5" />}
                        trend={{ value: 12, isPositive: true }}
                        color="green"
                    />
                    <StatCard
                        title="In Progress"
                        value={mockStats.inProgressTasks}
                        icon={<Clock className="size-5" />}
                        color="blue"
                    />
                    <StatCard
                        title="Overdue"
                        value={mockStats.overdueTasks}
                        icon={<AlertTriangle className="size-5" />}
                        trend={{ value: 2, isPositive: false }}
                        color="red"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Completion Rate Card */}
                    <div className="glass-card p-6 rounded-xl">
                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <TrendingUp className="size-5 text-primary" />
                            Project Completion
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
                                    <span className="text-4xl font-bold text-white">{completionRate}%</span>
                                    <span className="text-sm text-text-muted">Complete</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="size-3 rounded-full bg-primary" />
                                <span className="text-text-muted">Completed ({mockStats.completedTasks})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="size-3 rounded-full bg-white/10" />
                                <span className="text-text-muted">Remaining ({mockStats.totalTasks - mockStats.completedTasks})</span>
                            </div>
                        </div>
                    </div>

                    {/* Priority Distribution */}
                    <div className="glass-card p-6 rounded-xl">
                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <AlertTriangle className="size-5 text-primary" />
                            Priority Distribution
                        </h3>

                        <div className="space-y-4">
                            {mockPriorityDistribution.map((item) => (
                                <ProgressBar
                                    key={item.label}
                                    label={item.label}
                                    value={item.value}
                                    max={156}
                                    color={item.color}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Team Performance */}
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <Users className="size-5 text-primary" />
                        Team Performance
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {mockTeamPerformance.map((member, index) => (
                            <div key={member.name} className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`size-10 rounded-full ${member.color} flex items-center justify-center text-white font-bold`}>
                                        {member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium text-sm">{member.name}</p>
                                        <p className="text-text-muted text-xs">#{index + 1} Contributor</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-bold text-white">{member.completed}</span>
                                    <span className="text-xs text-text-muted">tasks completed</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
