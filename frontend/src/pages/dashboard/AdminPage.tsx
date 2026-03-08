import { useEffect, useState } from 'react';
import {
    Users,
    Folder,
    Checks,
    ShieldCheck,
    DownloadSimple,
    Trash,
    CircleNotch as Loader2,
    MagnifyingGlass,
    X,
    Gear,
    ToggleLeft,
    ToggleRight,
    ArrowsClockwise,
    Funnel,
    Calendar,
    TrendUp,
    WarningCircle,
    Database,
    Gauge,
    Lightning,
} from '@phosphor-icons/react';
import { useAuthStore } from '../../stores/authStore';
import { adminApi, type AdminUser, type AdminActivity, type AdminStats, type AdminProject, type PlatformStats, type SystemStats } from '../../lib/api/client';
import { toast } from 'react-hot-toast';

type TabType = 'overview' | 'users' | 'projects' | 'activities' | 'settings' | 'system';

import { useTranslation } from 'react-i18next';

export function AdminPage() {
    const { t } = useTranslation();
    const currentUser = useAuthStore((state) => state.user);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
    const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [projects, setProjects] = useState<AdminProject[]>([]);
    const [activities, setActivities] = useState<AdminActivity[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalProjects, setTotalProjects] = useState(0);
    const [totalActivities, setTotalActivities] = useState(0);
    const [page, setPage] = useState(1);
    const [userSearch, setUserSearch] = useState('');
    const [projectSearch, setProjectSearch] = useState('');
    const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Activity Filters
    const [activityFilters, setActivityFilters] = useState({
        userId: '',
        action: '',
        startDate: '',
        endDate: '',
    });

    // System Settings
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [isSettingsLoading, setIsSettingsLoading] = useState(false);

    useEffect(() => {
        if (currentUser?.role !== 'admin') {
            setIsLoading(false);
            return;
        }

        // If switching to settings, fetch them
        if (activeTab === 'settings') {
            fetchSettings();
        }

        // If switching to activities and we don't have users, fetch them for the dropdown
        if (activeTab === 'activities' && users.length === 0) {
            fetchUsersForFilter();
        }

        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, activeTab, activityFilters.userId, activityFilters.action, activityFilters.startDate, activityFilters.endDate, page, userSearch, projectSearch]);

    const fetchSettings = async () => {
        setIsSettingsLoading(true);
        try {
            const response = await adminApi.getSettings();
            if (response.success && response.data) {
                setSettings(response.data);
            }
        } catch {
            toast.error(t('admin.settings_fetch_failed', 'Failed to fetch system settings'));
        } finally {
            setIsSettingsLoading(false);
        }
    };

    const handleUpdateSettings = async (updates: Record<string, string>) => {
        try {
            await adminApi.updateSettings(updates);
            setSettings(prev => ({ ...prev, ...updates }));
            toast.success(t('admin.settings_updated', 'Settings updated successfully'));
        } catch {
            toast.error(t('admin.settings_update_failed', 'Failed to update settings'));
        }
    };

    const handleExportUsers = async () => {
        try {
            const blob = await adminApi.exportUsers();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `era-kanban-users-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success(t('admin.export_success', 'Export successful'));
        } catch {
            toast.error(t('admin.export_failed', 'Export failed'));
        }
    };

    const handleExportProjects = async () => {
        try {
            const blob = await adminApi.exportProjects();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `era-kanban-projects-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success(t('admin.export_success', 'Export successful'));
        } catch {
            toast.error(t('admin.export_failed', 'Export failed'));
        }
    };

    const handleExportActivities = async () => {
        try {
            const blob = await adminApi.exportActivities({
                userId: activityFilters.userId || undefined,
                action: activityFilters.action || undefined,
                startDate: activityFilters.startDate ? new Date(activityFilters.startDate).toISOString() : undefined,
                endDate: activityFilters.endDate ? new Date(activityFilters.endDate).toISOString() : undefined
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `era-kanban-activity-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success(t('admin.export_success', 'Export successful'));
        } catch {
            toast.error(t('admin.export_failed', 'Export failed'));
        }
    };

    const fetchUsersForFilter = async () => {
        try {
            const response = await adminApi.getUsers({ limit: 100 });
            if (response.success && response.data) {
                setUsers(response.data.users);
            }
        } catch (error) {
            console.error('Failed to fetch users for filter:', error);
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'overview') {
                const [statsResponse, platformResponse] = await Promise.all([
                    adminApi.getStats(),
                    adminApi.getPlatformStats(),
                ]);
                if (statsResponse.success && statsResponse.data) {
                    setStats(statsResponse.data);
                }
                if (platformResponse.success && platformResponse.data) {
                    setPlatformStats(platformResponse.data);
                }
            } else if (activeTab === 'system') {
                const response = await adminApi.getSystemStats();
                if (response.success && response.data) {
                    setSystemStats(response.data);
                }
            } else if (activeTab === 'users') {
                const response = await adminApi.getUsers({ page, limit: 20, search: userSearch || undefined });
                if (response.success && response.data) {
                    setUsers(response.data.users);
                    setTotalUsers(response.data.total);
                }
            } else if (activeTab === 'projects') {
                const response = await adminApi.getProjects({ page, limit: 20, search: projectSearch || undefined });
                if (response.success && response.data) {
                    setProjects(response.data.projects);
                    setTotalProjects(response.data.total);
                }
            } else if (activeTab === 'activities') {
                const response = await adminApi.getActivities({
                    page,
                    limit: 50,
                    userId: activityFilters.userId || undefined,
                    action: activityFilters.action || undefined,
                    startDate: activityFilters.startDate ? new Date(activityFilters.startDate).toISOString() : undefined,
                    endDate: activityFilters.endDate ? new Date(activityFilters.endDate).toISOString() : undefined
                });
                if (response.success && response.data) {
                    setActivities(response.data.activities);
                    setTotalActivities(response.data.total);
                }
            }
        } catch {
            toast.error(t('admin.fetch_failed', 'Failed to load data'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (value: string, searchType: 'user' | 'project') => {
        if (searchType === 'user') {
            setUserSearch(value);
        } else {
            setProjectSearch(value);
        }

        if (searchTimeout) clearTimeout(searchTimeout);
        const timeout = setTimeout(() => {
            setPage(1);
        }, 300);
        setSearchTimeout(timeout);
    };

    const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
        setActionLoading(userId);
        try {
            const response = await adminApi.updateUserRole(userId, role);
            if (response.success) {
                toast.success(t('admin.role_updated', { role }));
                setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
            } else {
                toast.error(response.message || t('admin.settings_update_failed'));
            }
        } catch {
            toast.error(t('admin.settings_update_failed'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm(t('admin.users.confirm_delete'))) {
            return;
        }
        setActionLoading(userId);
        try {
            const response = await adminApi.deleteUser(userId);
            if (response.success) {
                toast.success(t('admin.user_deleted', 'User deleted successfully'));
                setUsers(users.filter(u => u.id !== userId));
                setTotalUsers(prev => prev - 1);
            } else {
                toast.error(response.message || t('admin.fetch_failed'));
            }
        } catch {
            toast.error(t('admin.fetch_failed'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm(t('admin.projects.confirm_delete'))) {
            return;
        }
        setActionLoading(projectId);
        try {
            const response = await adminApi.deleteProject(projectId);
            if (response.success) {
                toast.success(t('admin.project_deleted', 'Project deleted successfully'));
                setProjects(projects.filter(p => p.id !== projectId));
                setTotalProjects(prev => prev - 1);
            } else {
                toast.error(response.message || t('admin.fetch_failed'));
            }
        } catch {
            toast.error(t('admin.fetch_failed'));
        } finally {
            setActionLoading(null);
        }
    };

    if (currentUser?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <ShieldCheck className="size-16 text-red-500" />
                <h2 className="text-2xl font-bold text-text">{t('admin.access_denied')}</h2>
                <p className="text-text-muted">{t('admin.access_denied_desc')}</p>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: t('admin.tabs.overview') },
        { id: 'system', label: t('admin.tabs.system') },
        { id: 'users', label: t('admin.tabs.users') },
        { id: 'projects', label: t('admin.tabs.projects') },
        { id: 'activities', label: t('admin.tabs.activities') },
        { id: 'settings', label: t('admin.tabs.settings') },
    ] as const;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <header className="flex-shrink-0 px-6 py-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="size-8 text-primary" />
                    <div>
                        <h2 className="text-3xl font-bold text-text tracking-tight">{t('admin.title')}</h2>
                        <p className="text-text-muted text-sm">{t('admin.subtitle')}</p>
                    </div>
                </div>
            </header>

            <div className="flex-shrink-0 px-6 py-4 border-b border-border">
                <div className="flex gap-1 bg-surface-alt rounded-lg p-1 w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setPage(1); }}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-surface text-text shadow-sm'
                                : 'text-text-muted hover:text-text'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="size-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'overview' && stats && platformStats && (
                            <div className="space-y-6">
                                {/* Main Stats Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-xl">
                                            <Users className="size-7 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-text-muted text-sm">{t('admin.stats.total_users')}</p>
                                            <p className="text-2xl font-bold text-text">{stats.totalUsers}</p>
                                            <p className="text-xs text-green-500">{t('admin.stats.this_month', { count: platformStats.users.newLast30Days })}</p>
                                        </div>
                                    </div>
                                    <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
                                        <div className="p-3 bg-green-500/10 rounded-xl">
                                            <Folder className="size-7 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="text-text-muted text-sm">{t('admin.stats.active_projects')}</p>
                                            <p className="text-2xl font-bold text-text">{stats.totalProjects}</p>
                                            <p className="text-xs text-green-500">{t('admin.stats.this_month', { count: platformStats.projects.newLast30Days })}</p>
                                        </div>
                                    </div>
                                    <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
                                        <div className="p-3 bg-blue-500/10 rounded-xl">
                                            <Checks className="size-7 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-text-muted text-sm">{t('admin.stats.total_tasks')}</p>
                                            <p className="text-2xl font-bold text-text">{stats.totalTasks}</p>
                                            <p className="text-xs text-green-500">{t('admin.stats.completed_today', { count: platformStats.tasks.completedToday })}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Activity & Engagement Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="glass-card rounded-2xl p-5">
                                        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                                            <TrendUp className="size-5 text-primary" />
                                            {t('admin.stats.activity')}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-surface/50">
                                                <p className="text-2xl font-bold text-text">{platformStats.activity.today}</p>
                                                <p className="text-sm text-text-muted">{t('admin.stats.today')}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-surface/50">
                                                <p className="text-2xl font-bold text-text">{platformStats.activity.thisWeek}</p>
                                                <p className="text-sm text-text-muted">{t('admin.stats.this_week')}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="glass-card rounded-2xl p-5">
                                        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                                            <Lightning className="size-5 text-yellow-500" />
                                            {t('admin.stats.engagement')}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-surface/50">
                                                <p className="text-2xl font-bold text-green-500">{platformStats.engagement.onlineNow}</p>
                                                <p className="text-sm text-text-muted">{t('admin.stats.online_now')}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-surface/50">
                                                <p className="text-2xl font-bold text-text">{platformStats.engagement.activeUsersLast7Days}</p>
                                                <p className="text-sm text-text-muted">{t('admin.stats.active_7d')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Task Status Distribution */}
                                <div className="glass-card rounded-2xl p-5">
                                    <h3 className="text-lg font-semibold text-text mb-4">{t('admin.stats.task_status')}</h3>
                                    <div className="space-y-3">
                                        {platformStats.taskStatus.map((item) => (
                                            <div key={item.status} className="flex items-center gap-3">
                                                <div className="w-24 text-sm text-text-muted capitalize">{item.status.replace('_', ' ')}</div>
                                                <div className="flex-1 h-3 bg-surface-alt rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${item.status === 'completed' ? 'bg-green-500' :
                                                            item.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-500'
                                                            }`}
                                                        style={{ width: `${stats.totalTasks > 0 ? (item.count / stats.totalTasks) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <div className="w-12 text-sm text-text text-right">{item.count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Top Projects */}
                                <div className="glass-card rounded-2xl p-5">
                                    <h3 className="text-lg font-semibold text-text mb-4">{t('admin.stats.top_projects')}</h3>
                                    {platformStats.topProjects.length === 0 ? (
                                        <p className="text-text-muted text-sm">{t('admin.stats.no_activity')}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {platformStats.topProjects.map((project) => (
                                                <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                                                    <span className="text-text font-medium">{project.name}</span>
                                                    <span className="text-text-muted text-sm">{t('admin.stats.activities_count', { count: project.activityCount })}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="relative flex-1 max-w-md">
                                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted size-5" />
                                        <input
                                            type="text"
                                            placeholder={t('admin.search.users')}
                                            value={userSearch}
                                            onChange={(e) => handleSearch(e.target.value, 'user')}
                                            className="glass-input w-full pl-10 pr-4 py-2.5 rounded-lg"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleExportUsers}
                                            className="flex items-center gap-2 px-4 py-2 bg-surface-alt border border-border-muted text-text-muted hover:text-text hover:border-border rounded-lg transition-all text-sm font-medium"
                                        >
                                            <DownloadSimple size={18} />
                                            {t('admin.export_csv')}
                                        </button>
                                        <button
                                            onClick={loadData}
                                            className="p-2.5 rounded-lg border border-border hover:bg-surface-alt transition-colors"
                                        >
                                            <ArrowsClockwise className="size-5 text-text-muted" />
                                        </button>
                                    </div>
                                </div>

                                <div className="glass-card rounded-2xl overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-surface-alt">
                                            <tr>
                                                <th className="text-left px-6 py-3 text-sm font-medium text-text-muted">{t('admin.users.table.user')}</th>
                                                <th className="text-left px-6 py-3 text-sm font-medium text-text-muted">{t('admin.users.table.role')}</th>
                                                <th className="text-left px-6 py-3 text-sm font-medium text-text-muted">{t('admin.users.table.projects')}</th>
                                                <th className="text-left px-6 py-3 text-sm font-medium text-text-muted">{t('admin.users.table.joined')}</th>
                                                <th className="text-right px-6 py-3 text-sm font-medium text-text-muted">{t('admin.users.table.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {users.map((user) => (
                                                <tr key={user.id} className="hover:bg-surface-alt/50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                                                                {user.full_name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-text">{user.full_name}</p>
                                                                <p className="text-sm text-text-muted">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <select
                                                            value={user.role}
                                                            onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'member')}
                                                            disabled={actionLoading === user.id || user.id === currentUser?.id}
                                                            className="glass-input px-3 py-1.5 rounded-lg text-sm"
                                                        >
                                                            <option value="member">{t('common.member')}</option>
                                                            <option value="admin">{t('common.admin')}</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 text-text">{user.projectsOwned}</td>
                                                    <td className="px-6 py-4 text-text-muted text-sm">
                                                        {new Date(user.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {user.id !== currentUser?.id && (
                                                            <button
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                disabled={actionLoading === user.id}
                                                                className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                                                            >
                                                                {actionLoading === user.id ? (
                                                                    <Loader2 className="size-5 animate-spin" />
                                                                ) : (
                                                                    <Trash className="size-5" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {totalUsers > 20 && (
                                    <div className="flex items-center justify-center gap-2 pt-4">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-4 py-2 rounded-lg border border-border disabled:opacity-50"
                                        >
                                            {t('admin.pagination.previous')}
                                        </button>
                                        <span className="text-text-muted">
                                            {t('admin.pagination.page_of', { page, total: Math.ceil(totalUsers / 20) })}
                                        </span>
                                        <button
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page >= Math.ceil(totalUsers / 20)}
                                            className="px-4 py-2 rounded-lg border border-border disabled:opacity-50"
                                        >
                                            {t('admin.pagination.next')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'projects' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="relative flex-1 max-w-md">
                                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted size-5" />
                                        <input
                                            type="text"
                                            placeholder={t('admin.search.projects')}
                                            value={projectSearch}
                                            onChange={(e) => handleSearch(e.target.value, 'project')}
                                            className="glass-input w-full pl-10 pr-4 py-2.5 rounded-lg"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleExportProjects}
                                            className="flex items-center gap-2 px-4 py-2 bg-surface-alt border border-border-muted text-text-muted hover:text-text hover:border-border rounded-lg transition-all text-sm font-medium"
                                        >
                                            <DownloadSimple size={18} />
                                            {t('admin.export_csv')}
                                        </button>
                                        <button
                                            onClick={loadData}
                                            className="p-2.5 rounded-lg border border-border hover:bg-surface-alt transition-colors"
                                        >
                                            <ArrowsClockwise className="size-5 text-text-muted" />
                                        </button>
                                    </div>
                                </div>

                                <div className="glass-card rounded-2xl overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-surface-alt">
                                            <tr>
                                                <th className="text-left px-6 py-3 text-sm font-medium text-text-muted">{t('admin.projects.table.name')}</th>
                                                <th className="text-left px-6 py-3 text-sm font-medium text-text-muted">{t('admin.projects.table.owner')}</th>
                                                <th className="text-left px-6 py-3 text-sm font-medium text-text-muted">{t('admin.projects.table.tasks')}</th>
                                                <th className="text-left px-6 py-3 text-sm font-medium text-text-muted">{t('admin.projects.table.created')}</th>
                                                <th className="text-right px-6 py-3 text-sm font-medium text-text-muted">{t('admin.projects.table.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {projects.map((project) => (
                                                <tr key={project.id} className="hover:bg-surface-alt/50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                                                                <Folder className="size-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-text">{project.name}</p>
                                                                {project.description && (
                                                                    <p className="text-sm text-text-muted truncate max-w-xs">{project.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium text-text text-sm">{project.owner_name || t('common.unknown')}</p>
                                                        <p className="text-xs text-text-muted truncate">{project.owner_email || t('common.no_email')}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-text">{project.task_count}</td>
                                                    <td className="px-6 py-4 text-text-muted text-sm">
                                                        {new Date(project.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleDeleteProject(project.id)}
                                                            disabled={actionLoading === project.id}
                                                            className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                                                        >
                                                            {actionLoading === project.id ? (
                                                                <Loader2 className="size-5 animate-spin" />
                                                            ) : (
                                                                <Trash className="size-5" />
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {projects.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-text-muted">
                                                        {t('admin.projects.no_results')}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {totalProjects > 20 && (
                                    <div className="flex items-center justify-center gap-2 pt-4">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-4 py-2 rounded-lg border border-border disabled:opacity-50"
                                        >
                                            {t('admin.pagination.previous')}
                                        </button>
                                        <span className="text-text-muted">
                                            {t('admin.pagination.page_of', { page, total: Math.ceil(totalProjects / 20) })}
                                        </span>
                                        <button
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page >= Math.ceil(totalProjects / 20)}
                                            className="px-4 py-2 rounded-lg border border-border disabled:opacity-50"
                                        >
                                            {t('admin.pagination.next')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'activities' && (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <h2 className="text-lg font-bold text-text">{t('admin.activities.title')}</h2>
                                        <div className="flex items-center gap-2">
                                            {(activityFilters.userId || activityFilters.action || activityFilters.startDate || activityFilters.endDate) && (
                                                <button
                                                    onClick={() => {
                                                        setActivityFilters({
                                                            userId: '',
                                                            action: '',
                                                            startDate: '',
                                                            endDate: '',
                                                        });
                                                        setPage(1);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text bg-surface-alt rounded-lg transition-colors"
                                                >
                                                    <X className="size-3.5" />
                                                    {t('admin.clear_filters')}
                                                </button>
                                            )}
                                            <button
                                                onClick={handleExportActivities}
                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text bg-surface-alt rounded-lg transition-colors border border-border-muted"
                                                title={t('admin.export_csv')}
                                            >
                                                <DownloadSimple className="size-3.5" />
                                                <span>{t('admin.export_csv')}</span>
                                            </button>
                                            <button
                                                onClick={loadData}
                                                className="p-2 rounded-lg border border-border hover:bg-surface-alt transition-colors"
                                                title={t('common.refresh')}
                                            >
                                                <ArrowsClockwise className="size-5 text-text-muted" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filters Bar */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 glass-panel !bg-surface-alt/30 rounded-xl border-border-muted">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-text-muted ml-1 flex items-center gap-1.5">
                                                <Users className="size-3.5" />
                                                {t('admin.activities.filter_user')}
                                            </label>
                                            <select
                                                value={activityFilters.userId}
                                                onChange={(e) => { setActivityFilters(prev => ({ ...prev, userId: e.target.value })); setPage(1); }}
                                                className="glass-input w-full px-3 py-2 rounded-lg text-sm bg-surface"
                                            >
                                                <option value="">{t('admin.all_users')}</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.full_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-text-muted ml-1 flex items-center gap-1.5">
                                                <Funnel className="size-3.5" />
                                                {t('admin.activities.filter_action')}
                                            </label>
                                            <select
                                                value={activityFilters.action}
                                                onChange={(e) => { setActivityFilters(prev => ({ ...prev, action: e.target.value })); setPage(1); }}
                                                className="glass-input w-full px-3 py-2 rounded-lg text-sm bg-surface"
                                            >
                                                <option value="">{t('admin.all_actions')}</option>
                                                <option value="task_created">{t('admin.action.task_created')}</option>
                                                <option value="task_moved">{t('admin.action.task_moved')}</option>
                                                <option value="task_deleted">{t('admin.action.task_deleted')}</option>
                                                <option value="project_created">{t('admin.action.project_created')}</option>
                                                <option value="project_updated">{t('admin.action.project_updated')}</option>
                                                <option value="project_deleted">{t('admin.action.project_deleted')}</option>
                                                <option value="member_joined">{t('admin.action.member_joined')}</option>
                                                <option value="comment_added">{t('admin.action.comment_added')}</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-text-muted ml-1 flex items-center gap-1.5">
                                                <Calendar className="size-3.5" />
                                                {t('admin.activities.from_date')}
                                            </label>
                                            <input
                                                type="date"
                                                value={activityFilters.startDate}
                                                onChange={(e) => { setActivityFilters(prev => ({ ...prev, startDate: e.target.value })); setPage(1); }}
                                                className="glass-input w-full px-3 py-2 rounded-lg text-sm bg-surface"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-text-muted ml-1 flex items-center gap-1.5">
                                                <Calendar className="size-3.5" />
                                                {t('admin.activities.to_date')}
                                            </label>
                                            <input
                                                type="date"
                                                value={activityFilters.endDate}
                                                onChange={(e) => { setActivityFilters(prev => ({ ...prev, endDate: e.target.value })); setPage(1); }}
                                                className="glass-input w-full px-3 py-2 rounded-lg text-sm bg-surface"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-card rounded-2xl overflow-hidden">
                                    {activities.length === 0 ? (
                                        <div className="p-8 text-center text-text-muted">
                                            {t('admin.activities.no_results_yet')}
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {activities.map((activity) => (
                                                <div key={activity.id} className="px-6 py-4 hover:bg-surface-alt/50">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="font-medium text-text">
                                                                {activity.user_name || activity.user_email || t('common.unknown_user')}
                                                            </p>
                                                            <p className="text-sm text-text-muted">
                                                                {t(`admin.action.${activity.action}`, activity.action.replace(/_/g, ' '))}
                                                                {activity.project_name && ` ${t('admin.activities.in_project', { name: activity.project_name })}`}
                                                            </p>
                                                        </div>
                                                        <span className="text-sm text-text-muted whitespace-nowrap">
                                                            {new Date(activity.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {totalActivities > 50 && (
                                    <div className="flex items-center justify-center gap-2 pt-4">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-4 py-2 rounded-lg border border-border disabled:opacity-50"
                                        >
                                            {t('admin.pagination.previous')}
                                        </button>
                                        <span className="text-text-muted">
                                            {t('admin.pagination.page_of', { page, total: Math.ceil(totalActivities / 50) })}
                                        </span>
                                        <button
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page >= Math.ceil(totalActivities / 50)}
                                            className="px-4 py-2 rounded-lg border border-border disabled:opacity-50"
                                        >
                                            {t('admin.pagination.next')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-semibold text-text">{t('admin.system_local_settings')}</h2>
                                        <p className="text-sm text-text-muted">{t('admin.configure_platform')}</p>
                                    </div>
                                    <button
                                        onClick={fetchSettings}
                                        className="p-2 rounded-lg border border-border hover:bg-surface-alt transition-colors"
                                        title={t('admin.refresh_settings')}
                                        disabled={isSettingsLoading}
                                    >
                                        <ArrowsClockwise className={`size-5 text-text-muted ${isSettingsLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                {isSettingsLoading && Object.keys(settings).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl">
                                        <Loader2 className="size-8 text-primary animate-spin mb-4" />
                                        <p className="text-text-muted">{t('admin.loading_settings')}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Maintenance Mode */}
                                        <div className="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-l-warning">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <h3 className="font-semibold text-text flex items-center gap-2">
                                                        <ShieldCheck className="size-5 text-warning" />
                                                        {t('admin.maintenance_mode')}
                                                    </h3>
                                                    <p className="text-sm text-text-muted leading-relaxed">
                                                        {t('admin.maintenance_desc')}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleUpdateSettings({ maintenance_mode: settings.maintenance_mode === 'true' ? 'false' : 'true' })}
                                                    disabled={actionLoading === 'maintenance_mode'}
                                                    className="p-1 rounded-md transition-colors"
                                                >
                                                    {settings.maintenance_mode === 'true' ? (
                                                        <ToggleRight className="size-10 text-primary" weight="fill" />
                                                    ) : (
                                                        <ToggleLeft className="size-10 text-text-muted opacity-40 hover:opacity-60" />
                                                    )}
                                                </button>
                                            </div>
                                            {settings.maintenance_mode === 'true' && (
                                                <div className="p-3 bg-warning/10 rounded-xl border border-warning/20">
                                                    <p className="text-xs text-warning font-medium flex items-center gap-2">
                                                        <Gear className="size-3.5 animate-spin" />
                                                        {t('admin.maintenance_active')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Registration Toggle */}
                                        <div className="glass-card p-6 rounded-2xl space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <h3 className="font-semibold text-text flex items-center gap-2">
                                                        <Users className="size-5 text-primary" />
                                                        {t('admin.allow_registration')}
                                                    </h3>
                                                    <p className="text-sm text-text-muted leading-relaxed">
                                                        {t('admin.reg_desc')}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleUpdateSettings({ allow_registration: settings.allow_registration === 'true' ? 'false' : 'true' })}
                                                    disabled={actionLoading === 'allow_registration'}
                                                    className="p-1 rounded-md transition-colors"
                                                >
                                                    {settings.allow_registration === 'true' ? (
                                                        <ToggleRight className="size-10 text-primary" weight="fill" />
                                                    ) : (
                                                        <ToggleLeft className="size-10 text-text-muted opacity-40 hover:opacity-60" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Default User Role */}
                                        <div className="md:col-span-2 glass-card p-6 rounded-2xl border-l-4 border-l-primary">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                                <div className="space-y-1">
                                                    <h3 className="font-semibold text-text flex items-center gap-2">
                                                        <ShieldCheck className="size-5 text-primary" />
                                                        {t('admin.default_role')}
                                                    </h3>
                                                    <p className="text-sm text-text-muted">
                                                        {t('admin.default_role_desc')}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 bg-surface-alt p-1 rounded-xl border border-border-muted w-fit">
                                                    {['member', 'admin'].map((role) => (
                                                        <button
                                                            key={role}
                                                            onClick={() => handleUpdateSettings({ default_user_role: role })}
                                                            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${settings.default_user_role === role
                                                                ? 'bg-primary text-text shadow-lg shadow-primary/20'
                                                                : 'text-text-muted hover:text-text hover:bg-surface'
                                                                }`}
                                                        >
                                                            {role === 'member' ? t('common.member') : t('common.admin')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            {settings.default_user_role === 'admin' && (
                                                <p className="text-[10px] text-warning font-medium uppercase tracking-wider flex items-center gap-1.5 px-1 mt-4">
                                                    ⚠️ {t('admin.admin_warning')}
                                                </p>
                                            )}
                                        </div>

                                        {/* SMTP Settings */}
                                        <div className="md:col-span-2 glass-card p-6 rounded-2xl border-l-4 border-l-blue-500 space-y-6">
                                            <div className="space-y-1">
                                                <h3 className="font-semibold text-text flex items-center gap-2">
                                                    <ArrowsClockwise className="size-5 text-blue-500" />
                                                    {t('admin.smtp_settings', 'SMTP Settings')}
                                                </h3>
                                                <p className="text-sm text-text-muted">
                                                    {t('admin.smtp_desc', 'Configure SMTP settings for outgoing emails (password resets, notifications, etc.)')}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-text-muted ml-1">{t('admin.smtp_host', 'SMTP Host')}</label>
                                                    <input
                                                        type="text"
                                                        value={settings.smtp_host || ''}
                                                        onChange={(e) => setSettings(prev => ({ ...prev, smtp_host: e.target.value }))}
                                                        className="glass-input w-full px-4 py-2 rounded-lg text-sm"
                                                        placeholder="smtp.example.com"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-text-muted ml-1">{t('admin.smtp_port', 'SMTP Port')}</label>
                                                    <input
                                                        type="text"
                                                        value={settings.smtp_port || ''}
                                                        onChange={(e) => setSettings(prev => ({ ...prev, smtp_port: e.target.value }))}
                                                        className="glass-input w-full px-4 py-2 rounded-lg text-sm"
                                                        placeholder="587"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-text-muted ml-1">{t('admin.smtp_user', 'SMTP Username')}</label>
                                                    <input
                                                        type="text"
                                                        value={settings.smtp_user || ''}
                                                        onChange={(e) => setSettings(prev => ({ ...prev, smtp_user: e.target.value }))}
                                                        className="glass-input w-full px-4 py-2 rounded-lg text-sm"
                                                        placeholder="user@example.com"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-text-muted ml-1">{t('admin.smtp_pass', 'SMTP Password')}</label>
                                                    <input
                                                        type="password"
                                                        value={settings.smtp_pass || ''}
                                                        onChange={(e) => setSettings(prev => ({ ...prev, smtp_pass: e.target.value }))}
                                                        className="glass-input w-full px-4 py-2 rounded-lg text-sm"
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-text-muted ml-1">{t('admin.smtp_from', 'From Email')}</label>
                                                    <input
                                                        type="email"
                                                        value={settings.smtp_from || ''}
                                                        onChange={(e) => setSettings(prev => ({ ...prev, smtp_from: e.target.value }))}
                                                        className="glass-input w-full px-4 py-2 rounded-lg text-sm"
                                                        placeholder="noreply@erakanban.com"
                                                    />
                                                </div>
                                                <div className="flex items-end">
                                                    <button
                                                        onClick={() => handleUpdateSettings({
                                                            smtp_host: settings.smtp_host,
                                                            smtp_port: settings.smtp_port,
                                                            smtp_user: settings.smtp_user,
                                                            smtp_pass: settings.smtp_pass,
                                                            smtp_from: settings.smtp_from,
                                                        })}
                                                        className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-bold transition-all"
                                                    >
                                                        {t('admin.save_smtp', 'Save SMTP Settings')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Integrations Settings */}
                                        <div className="md:col-span-2 glass-card p-6 rounded-2xl border-l-4 border-l-purple-500 space-y-6">
                                            <div className="space-y-1">
                                                <h3 className="font-semibold text-text flex items-center gap-2">
                                                    <Lightning className="size-5 text-purple-500" />
                                                    {t('admin.integrations', 'Third-Party Integrations')}
                                                </h3>
                                                <p className="text-sm text-text-muted">
                                                    {t('admin.integrations_desc', 'Configure external services for notifications and automation.')}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {/* Slack */}
                                                <div className="space-y-4 p-4 rounded-xl bg-surface/50 border border-border">
                                                    <h4 className="font-medium text-text flex items-center gap-2">
                                                        <span className="size-2 rounded-full bg-green-500" />
                                                        {t('admin.slack_settings', 'Slack Integration')}
                                                    </h4>
                                                    <p className="text-xs text-text-muted leading-relaxed">
                                                        {t('admin.slack_desc', 'Receive notifications in your Slack channels via Incoming Webhooks.')}
                                                    </p>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-medium text-text-muted ml-1">{t('admin.slack_webhook', 'Webhook URL')}</label>
                                                        <input
                                                            type="text"
                                                            value={settings.slack_webhook_url || ''}
                                                            onChange={(e) => setSettings(prev => ({ ...prev, slack_webhook_url: e.target.value }))}
                                                            className="glass-input w-full px-4 py-2 rounded-lg text-sm"
                                                            placeholder={t('admin.slack_webhook_placeholder', 'https://hooks.slack.com/services/...')}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Telegram */}
                                                <div className="space-y-4 p-4 rounded-xl bg-surface/50 border border-border">
                                                    <h4 className="font-medium text-text flex items-center gap-2">
                                                        <span className="size-2 rounded-full bg-blue-500" />
                                                        {t('admin.telegram_settings', 'Telegram Integration')}
                                                    </h4>
                                                    <p className="text-xs text-text-muted leading-relaxed">
                                                        {t('admin.telegram_desc', 'Receive notifications via a Telegram Bot.')}
                                                    </p>
                                                    <div className="space-y-3">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-text-muted ml-1">{t('admin.telegram_token', 'Bot Token')}</label>
                                                            <input
                                                                type="text"
                                                                value={settings.telegram_bot_token || ''}
                                                                onChange={(e) => setSettings(prev => ({ ...prev, telegram_bot_token: e.target.value }))}
                                                                className="glass-input w-full px-4 py-2 rounded-lg text-sm"
                                                                placeholder={t('admin.telegram_token_placeholder', '123456789:ABCdef...')}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-text-muted ml-1">{t('admin.telegram_chat_id', 'Chat ID')}</label>
                                                            <input
                                                                type="text"
                                                                value={settings.telegram_chat_id || ''}
                                                                onChange={(e) => setSettings(prev => ({ ...prev, telegram_chat_id: e.target.value }))}
                                                                className="glass-input w-full px-4 py-2 rounded-lg text-sm"
                                                                placeholder={t('admin.telegram_chat_id_placeholder', '123456789')}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-2">
                                                <button
                                                    onClick={() => handleUpdateSettings({
                                                        slack_webhook_url: settings.slack_webhook_url,
                                                        telegram_bot_token: settings.telegram_bot_token,
                                                        telegram_chat_id: settings.telegram_chat_id,
                                                    })}
                                                    className="px-8 py-2.5 bg-primary text-text rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                                                >
                                                    {t('admin.save_integrations', 'Save Integrations')}
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'system' && systemStats && (
                            <div className="space-y-6">
                                {/* Database Overview */}
                                <div className="glass-card rounded-2xl p-5">
                                    <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                                        <Database className="size-5 text-primary" />
                                        {t('admin.system.database')}
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                        <div className="p-4 rounded-xl bg-surface/50">
                                            <p className="text-2xl font-bold text-text">{systemStats.database.totalUsers}</p>
                                            <p className="text-sm text-text-muted">{t('admin.system.users')}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-surface/50">
                                            <p className="text-2xl font-bold text-text">{systemStats.database.totalProjects}</p>
                                            <p className="text-sm text-text-muted">{t('admin.system.projects')}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-surface/50">
                                            <p className="text-2xl font-bold text-text">{systemStats.database.totalTasks}</p>
                                            <p className="text-sm text-text-muted">{t('admin.system.tasks')}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-surface/50">
                                            <p className="text-2xl font-bold text-text">{systemStats.database.totalColumns}</p>
                                            <p className="text-sm text-text-muted">{t('admin.system.columns')}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-surface/50">
                                            <p className="text-2xl font-bold text-text">{systemStats.database.totalProjectMembers}</p>
                                            <p className="text-sm text-text-muted">{t('admin.system.members')}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-surface/50">
                                            <p className="text-2xl font-bold text-text">{systemStats.database.totalActivityLogs}</p>
                                            <p className="text-sm text-text-muted">{t('admin.system.activities')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Averages */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="glass-card rounded-2xl p-5">
                                        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                                            <Gauge className="size-5 text-green-500" />
                                            {t('admin.system.averages')}
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                                                <span className="text-text-muted">{t('admin.system.tasks_per_project')}</span>
                                                <span className="text-xl font-bold text-text">{systemStats.averages.tasksPerProject}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                                                <span className="text-text-muted">{t('admin.system.members_per_project')}</span>
                                                <span className="text-xl font-bold text-text">{systemStats.averages.membersPerProject}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="glass-card rounded-2xl p-5">
                                        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                                            <WarningCircle className="size-5 text-red-500" />
                                            {t('admin.system.health')}
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                                                <span className="text-text-muted">{t('admin.system.errors_24h')}</span>
                                                <span className="text-xl font-bold text-red-500">{systemStats.health.errorCountLast24h}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                                                <span className="text-text-muted">{t('admin.system.error_rate')}</span>
                                                <span className={`text-xl font-bold ${systemStats.health.errorRate > 5 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {systemStats.health.errorRate}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Most Active Users */}
                                <div className="glass-card rounded-2xl p-5">
                                    <h3 className="text-lg font-semibold text-text mb-4">{t('admin.system.most_active_users')}</h3>
                                    {systemStats.mostActiveUsers.length === 0 ? (
                                        <p className="text-text-muted text-sm">{t('admin.stats.no_activity')}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {systemStats.mostActiveUsers.map((user, index) => (
                                                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-text font-medium">{user.name}</p>
                                                            <p className="text-xs text-text-muted">{user.email}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-text-muted">{t('admin.stats.activities_count', { count: user.activityCount })}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
