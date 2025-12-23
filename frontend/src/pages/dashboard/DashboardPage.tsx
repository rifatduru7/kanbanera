import { ActivityFeed } from '../../components/activity/ActivityFeed';
import { useMetrics } from '../../hooks/useMetrics';
import { Loader2 } from 'lucide-react';

export function DashboardPage() {
    const { data, isLoading } = useMetrics();

    const stats = data?.stats || {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        totalProjects: 0,
        activeProjects: 0,
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2">
                <nav aria-label="Breadcrumb" className="flex gap-2 text-sm mb-1">
                    <a href="#" className="text-slate-400 hover:text-primary transition-colors">
                        Home
                    </a>
                    <span className="text-slate-600">/</span>
                    <span className="text-primary font-medium">Dashboard</span>
                </nav>
                <h2 className="text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                    Dashboard
                </h2>
                <p className="text-slate-400 text-sm max-w-2xl">
                    Welcome back! Here's an overview of your projects and tasks.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Projects"
                    value={isLoading ? '—' : String(stats.totalProjects)}
                    change={`${stats.activeProjects} active`}
                    color="primary"
                    loading={isLoading}
                />
                <StatCard
                    title="Active Tasks"
                    value={isLoading ? '—' : String(stats.inProgressTasks)}
                    change={`${stats.overdueTasks} overdue`}
                    color="yellow"
                    loading={isLoading}
                />
                <StatCard
                    title="Completed"
                    value={isLoading ? '—' : String(stats.completedTasks)}
                    change={`${stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% completion`}
                    color="green"
                    loading={isLoading}
                />
                <StatCard
                    title="Total Tasks"
                    value={isLoading ? '—' : String(stats.totalTasks)}
                    change="across all projects"
                    color="purple"
                    loading={isLoading}
                />
            </div>

            {/* Two Column Layout: Quick Actions + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-1 glass-panel rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                    <div className="flex flex-col gap-3">
                        <button className="btn-primary w-full py-2.5 rounded-lg text-sm font-medium">
                            + New Project
                        </button>
                        <button className="w-full py-2.5 rounded-lg text-sm font-medium text-white border border-white/10 hover:bg-white/5 transition-colors">
                            + Add Task
                        </button>
                        <button className="w-full py-2.5 rounded-lg text-sm font-medium text-white border border-white/10 hover:bg-white/5 transition-colors">
                            Invite Member
                        </button>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2">
                    <ActivityFeed compact={true} title="Recent Activity" />
                </div>
            </div>
        </div>
    );
}

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    color: 'primary' | 'yellow' | 'green' | 'purple';
    loading?: boolean;
}

function StatCard({ title, value, change, color, loading }: StatCardProps) {
    const colorClasses = {
        primary: 'from-primary/20 to-primary/5 border-primary/20',
        yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20',
        green: 'from-green-500/20 to-green-500/5 border-green-500/20',
        purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
    };

    return (
        <div
            className={`glass-panel rounded-xl p-5 bg-gradient-to-br ${colorClasses[color]} border`}
        >
            <p className="text-slate-400 text-sm font-medium">{title}</p>
            <div className="text-3xl font-bold text-white mt-2 flex items-center gap-2">
                {loading && <Loader2 className="size-5 animate-spin text-primary" />}
                {value}
            </div>
            <p className="text-xs text-slate-500 mt-1">{change}</p>
        </div>
    );
}
