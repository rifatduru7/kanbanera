export function DashboardPage() {
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
                    value="12"
                    change="+2 this month"
                    color="primary"
                />
                <StatCard
                    title="Active Tasks"
                    value="48"
                    change="8 due today"
                    color="yellow"
                />
                <StatCard
                    title="Completed"
                    value="156"
                    change="+23 this week"
                    color="green"
                />
                <StatCard
                    title="Team Members"
                    value="8"
                    change="2 pending invites"
                    color="purple"
                />
            </div>

            {/* Recent Activity */}
            <div className="glass-panel rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <div className="text-slate-400 text-sm">
                    No recent activity to display. Create a project to get started!
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
}

function StatCard({ title, value, change, color }: StatCardProps) {
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
            <p className="text-3xl font-bold text-white mt-2">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{change}</p>
        </div>
    );
}
