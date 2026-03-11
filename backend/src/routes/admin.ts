import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { getEmailProviderStatus, getEmailService } from '../services/email/getEmailService';

export const adminRoutes = new Hono<{ Bindings: Env }>();

adminRoutes.use('/*', authMiddleware);

const ALLOWED_SETTING_KEYS = new Set([
    'maintenance_mode',
    'allow_registration',
    'default_user_role',
    'email_provider',
    'smtp_host',
    'smtp_port',
    'smtp_user',
    'smtp_pass',
    'smtp_from',
    'slack_webhook_url',
    'telegram_bot_token',
    'telegram_chat_id',
]);
const SMTP_TEST_TIMEOUT_MS = 12_000;

function sanitizeCsvValue(value: unknown): string {
    const raw = String(value ?? '');
    const escaped = raw.replace(/"/g, '""');
    const trimmedLeft = escaped.trimStart();
    if (/^[=+\-@]/.test(trimmedLeft)) {
        return `'${escaped}`;
    }
    return escaped;
}

function normalizeSettingValue(key: string, value: unknown): string | null {
    if (!ALLOWED_SETTING_KEYS.has(key)) {
        return null;
    }

    if (key === 'maintenance_mode' || key === 'allow_registration') {
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (value === 'true' || value === 'false') return String(value);
        return null;
    }

    if (key === 'default_user_role') {
        if (value === 'admin' || value === 'member') return String(value);
        return null;
    }

    if (key === 'email_provider') {
        if (value === 'smtp' || value === 'resend') return String(value);
        return null;
    }

    if (key === 'smtp_port') {
        if (value === '' || value === null) return '';
        const port = Number(value);
        if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
        return String(port);
    }

    if (key === 'smtp_from') {
        if (value === '' || value === null) return '';
        const email = String(value).trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
        return email;
    }

    return String(value ?? '').trim();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);

        promise
            .then((value) => {
                clearTimeout(timeout);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timeout);
                reject(error);
            });
    });
}

interface SystemStatsRow {
    users: number;
    projects: number;
    tasks: number;
    columns: number;
    activity_logs: number;
    project_members: number;
}

interface AdminUserListRow {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'member';
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

interface AdminUsersExportRow {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'member';
    created_at: string;
    project_count: number;
}

interface AdminActivitiesExportRow {
    id: string;
    action: string;
    created_at: string;
    user_email: string | null;
    user_name: string | null;
    project_name: string | null;
}

interface AdminProjectsExportRow {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    owner_email: string | null;
    owner_name: string | null;
    task_count: number;
}

interface SmtpSettingRow {
    key: string;
    value: string;
}

interface AttachmentStorageStatsRow {
    total_files: number;
    total_bytes: number | null;
    last_upload_at: string | null;
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function getSmtpSettings(env: Env): Promise<Record<string, string>> {
    const { results } = await env.DB.prepare('SELECT key, value FROM system_settings WHERE key LIKE "smtp_%"').all<SmtpSettingRow>();
    return (results || []).reduce<Record<string, string>>((acc, row) => {
        acc[row.key] = row.value;
        return acc;
    }, {});
}

adminRoutes.get('/stats', async (c) => {
    const user = c.get('user');

    if (user.role !== 'admin') {
        return c.json(
            { success: false, error: 'Forbidden', message: 'Admin access required' },
            403
        );
    }

    try {
        const [userCount, projectCount, taskCount, recentUsers] = await Promise.all([
            c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
            c.env.DB.prepare('SELECT COUNT(*) as count FROM projects WHERE is_archived = 0').first<{ count: number }>(),
            c.env.DB.prepare('SELECT COUNT(*) as count FROM tasks').first<{ count: number }>(),
            c.env.DB.prepare(`
                SELECT id, email, full_name, role, created_at 
                FROM users 
                ORDER BY created_at DESC 
                LIMIT 10
            `).all(),
        ]);

        return c.json({
            success: true,
            data: {
                totalUsers: userCount?.count || 0,
                totalProjects: projectCount?.count || 0,
                totalTasks: taskCount?.count || 0,
                recentUsers: recentUsers.results || [],
            },
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch stats' },
            500
        );
    }
});

// GET /api/admin/stats/platform - Enhanced platform statistics
adminRoutes.get('/stats/platform', async (c) => {
    const user = c.get('user');

    if (user.role !== 'admin') {
        return c.json(
            { success: false, error: 'Forbidden', message: 'Admin access required' },
            403
        );
    }

    try {
        // Total counts
        const [userCount, projectCount, taskCount, attachmentStats] = await Promise.all([
            c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
            c.env.DB.prepare('SELECT COUNT(*) as count FROM projects').first<{ count: number }>(),
            c.env.DB.prepare('SELECT COUNT(*) as count FROM tasks').first<{ count: number }>(),
            c.env.DB.prepare(`
                SELECT
                    COUNT(*) as total_files,
                    COALESCE(SUM(COALESCE(file_size, 0)), 0) as total_bytes,
                    MAX(created_at) as last_upload_at
                FROM attachments
            `).first<AttachmentStorageStatsRow>(),
        ]);

        // User growth - new users in last 30 days
        const userGrowth = await c.env.DB.prepare(`
            SELECT COUNT(*) as count FROM users 
            WHERE created_at >= datetime('now', '-30 days')
        `).first<{ count: number }>();

        // Project growth - new projects in last 30 days
        const projectGrowth = await c.env.DB.prepare(`
            SELECT COUNT(*) as count FROM projects 
            WHERE created_at >= datetime('now', '-30 days')
        `).first<{ count: number }>();

        // Activity today
        const activityToday = await c.env.DB.prepare(`
            SELECT COUNT(*) as count FROM activity_log 
            WHERE created_at >= datetime('now', 'start of day')
        `).first<{ count: number }>();

        // Activity last 7 days
        const activityWeek = await c.env.DB.prepare(`
            SELECT COUNT(*) as count FROM activity_log 
            WHERE created_at >= datetime('now', '-7 days')
        `).first<{ count: number }>();

        // Completed tasks today
        const completedToday = await c.env.DB.prepare(`
            SELECT COUNT(*) as count FROM activity_log 
            WHERE action = 'task_completed' 
            AND created_at >= datetime('now', 'start of day')
        `).first<{ count: number }>();

        // Online users (active in last 5 minutes - simulated by recent activity)
        const onlineUsers = await c.env.DB.prepare(`
            SELECT COUNT(DISTINCT user_id) as count FROM activity_log 
            WHERE created_at >= datetime('now', '-5 minutes')
        `).first<{ count: number }>();

        // Task status distribution
        const taskStatus = await c.env.DB.prepare(`
            SELECT 
                CASE 
                    WHEN c.name IN ('Done', 'Completed', 'Finished') THEN 'completed'
                    WHEN c.name IN ('In Progress', 'Doing', 'Working') THEN 'in_progress'
                    ELSE 'todo'
                END as status,
                COUNT(*) as count
            FROM tasks t
            JOIN columns c ON t.column_id = c.id
            GROUP BY status
        `).all();

        // Top projects by activity
        const topProjects = await c.env.DB.prepare(`
            SELECT p.id, p.name, COUNT(al.id) as activity_count
            FROM projects p
            LEFT JOIN activity_log al ON p.id = al.project_id AND al.created_at >= datetime('now', '-7 days')
            GROUP BY p.id
            ORDER BY activity_count DESC
            LIMIT 5
        `).all();

        // User engagement - users with activity in last 7 days
        const activeUsers = await c.env.DB.prepare(`
            SELECT COUNT(DISTINCT user_id) as count FROM activity_log 
            WHERE created_at >= datetime('now', '-7 days')
        `).first<{ count: number }>();

        const usedBytes = Number(attachmentStats?.total_bytes || 0);
        const totalFiles = Number(attachmentStats?.total_files || 0);
        const lastUploadAt = attachmentStats?.last_upload_at || null;

        const quotaGb = Number(c.env.B2_STORAGE_QUOTA_GB || '');
        const hasQuota = Number.isFinite(quotaGb) && quotaGb > 0;
        const quotaBytes = hasQuota ? Math.floor(quotaGb * 1024 * 1024 * 1024) : null;
        const remainingBytes = quotaBytes !== null ? Math.max(quotaBytes - usedBytes, 0) : null;
        const usagePercent = quotaBytes !== null && quotaBytes > 0
            ? Math.min(100, Math.round((usedBytes / quotaBytes) * 1000) / 10)
            : null;

        return c.json({
            success: true,
            data: {
                users: {
                    total: userCount?.count || 0,
                    newLast30Days: userGrowth?.count || 0,
                    growthPercent: userGrowth?.count && userCount?.count
                        ? Math.round((userGrowth.count / userCount.count) * 100)
                        : 0,
                },
                projects: {
                    total: projectCount?.count || 0,
                    newLast30Days: projectGrowth?.count || 0,
                },
                tasks: {
                    total: taskCount?.count || 0,
                    completedToday: completedToday?.count || 0,
                },
                activity: {
                    today: activityToday?.count || 0,
                    thisWeek: activityWeek?.count || 0,
                },
                engagement: {
                    activeUsersLast7Days: activeUsers?.count || 0,
                    onlineNow: onlineUsers?.count || 0,
                },
                taskStatus: (taskStatus.results || []).map((s: Record<string, unknown>) => ({
                    status: s.status,
                    count: Number(s.count),
                })),
                topProjects: (topProjects.results || []).map((p: Record<string, unknown>) => ({
                    id: p.id,
                    name: p.name,
                    activityCount: Number(p.activity_count),
                })),
                storage: {
                    provider: 'b2',
                    bucket: c.env.B2_BUCKET_NAME,
                    configured: Boolean(c.env.B2_BUCKET_NAME && c.env.B2_ENDPOINT && c.env.B2_KEY_ID && c.env.B2_APP_KEY),
                    totalFiles,
                    usedBytes,
                    quotaBytes,
                    remainingBytes,
                    usagePercent,
                    lastUploadAt,
                },
            },
        });
    } catch (error) {
        console.error('Admin platform stats error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch platform stats' },
            500
        );
    }
});

// GET /api/admin/stats/system - System health metrics
adminRoutes.get('/stats/system', async (c) => {
    const user = c.get('user');

    if (user.role !== 'admin') {
        return c.json(
            { success: false, error: 'Forbidden', message: 'Admin access required' },
            403
        );
    }

    try {
        // Database stats
        const dbStats = await c.env.DB.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM projects) as projects,
                (SELECT COUNT(*) FROM tasks) as tasks,
                (SELECT COUNT(*) FROM columns) as columns,
                (SELECT COUNT(*) FROM activity_log) as activity_logs,
                (SELECT COUNT(*) FROM project_members) as project_members
        `).first<SystemStatsRow>();

        // Average tasks per project
        const avgTasksPerProject = dbStats && Number(dbStats.projects) > 0
            ? Math.round((Number(dbStats.tasks) / Number(dbStats.projects)) * 10) / 10
            : 0;

        // Average members per project
        const avgMembersPerProject = dbStats && Number(dbStats.projects) > 0
            ? Math.round((Number(dbStats.project_members) / Number(dbStats.projects)) * 10) / 10
            : 0;

        // Error rate (failed logins or actions in last 24h)
        const errorCount = await c.env.DB.prepare(`
            SELECT COUNT(*) as count FROM activity_log 
            WHERE created_at >= datetime('now', '-24 hours')
            AND (action LIKE '%error%' OR action LIKE '%failed%')
        `).first<{ count: number }>();

        // Most active users (last 7 days)
        const mostActiveUsers = await c.env.DB.prepare(`
            SELECT u.id, u.full_name, u.email, COUNT(al.id) as activity_count
            FROM users u
            LEFT JOIN activity_log al ON u.id = al.user_id AND al.created_at >= datetime('now', '-7 days')
            GROUP BY u.id
            ORDER BY activity_count DESC
            LIMIT 5
        `).all();

        // Recent errors (last 24 hours)
        const recentErrors = await c.env.DB.prepare(`
            SELECT al.*, u.full_name as user_name
            FROM activity_log al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.created_at >= datetime('now', '-24 hours')
            AND al.action IN ('login_failed', 'action_failed')
            ORDER BY al.created_at DESC
            LIMIT 10
        `).all();

        return c.json({
            success: true,
            data: {
                database: {
                    totalUsers: dbStats?.users || 0,
                    totalProjects: dbStats?.projects || 0,
                    totalTasks: dbStats?.tasks || 0,
                    totalColumns: dbStats?.columns || 0,
                    totalActivityLogs: dbStats?.activity_logs || 0,
                    totalProjectMembers: dbStats?.project_members || 0,
                },
                averages: {
                    tasksPerProject: avgTasksPerProject,
                    membersPerProject: avgMembersPerProject,
                },
                health: {
                    errorCountLast24h: errorCount?.count || 0,
                    errorRate: dbStats && dbStats.activity_logs
                        ? Math.round(((errorCount?.count || 0) / Number(dbStats.activity_logs)) * 10000) / 100
                        : 0,
                },
                mostActiveUsers: (mostActiveUsers.results || []).map((u: Record<string, unknown>) => ({
                    id: u.id,
                    name: u.full_name,
                    email: u.email,
                    activityCount: Number(u.activity_count),
                })),
                recentErrors: recentErrors.results || [],
            },
        });
    } catch (error) {
        console.error('Admin system stats error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch system stats' },
            500
        );
    }
});

adminRoutes.get('/users', async (c) => {
    const user = c.get('user');

    if (user.role !== 'admin') {
        return c.json(
            { success: false, error: 'Forbidden', message: 'Admin access required' },
            403
        );
    }

    try {
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '20');
        const offset = (page - 1) * limit;
        const search = c.req.query('search') || '';

        let whereClause = '';
        const params: string[] = [];

        if (search) {
            whereClause = 'WHERE email LIKE ? OR full_name LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }

        const [totalResult, users] = await Promise.all([
            c.env.DB.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).bind(...params).first<{ count: number }>(),
            c.env.DB.prepare(`
                SELECT id, email, full_name, role, avatar_url, created_at, updated_at
                FROM users 
                ${whereClause}
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `).bind(...params, limit, offset).all<AdminUserListRow>(),
        ]);

        const projectsOwned = await c.env.DB.prepare(`
            SELECT owner_id, COUNT(*) as count 
            FROM projects 
            GROUP BY owner_id
        `).all<{ owner_id: string; count: number }>();

        const projectsOwnedMap = new Map(projectsOwned.results?.map(p => [p.owner_id, p.count]) || []);

        const usersWithStats = (users.results || []).map((u) => ({
            ...u,
            projectsOwned: projectsOwnedMap.get(u.id) || 0,
        }));

        return c.json({
            success: true,
            data: {
                users: usersWithStats,
                total: totalResult?.count || 0,
                page,
                limit,
                totalPages: Math.ceil((totalResult?.count || 0) / limit),
            },
        });
    } catch (error) {
        console.error('Admin users error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch users' },
            500
        );
    }
});

adminRoutes.put('/users/:id/role', async (c) => {
    const user = c.get('user');
    const targetUserId = c.req.param('id');

    if (user.role !== 'admin') {
        return c.json(
            { success: false, error: 'Forbidden', message: 'Admin access required' },
            403
        );
    }

    if (user.sub === targetUserId) {
        return c.json(
            { success: false, error: 'Bad Request', message: 'Cannot change your own role' },
            400
        );
    }

    try {
        const body = await c.req.json();
        const { role } = body;

        if (!role || !['admin', 'member'].includes(role)) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Role must be admin or member' },
                400
            );
        }

        const existing = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?')
            .bind(targetUserId)
            .first<{ id: string; role: string }>();

        if (!existing) {
            return c.json(
                { success: false, error: 'Not Found', message: 'User not found' },
                404
            );
        }

        await c.env.DB.prepare('UPDATE users SET role = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(role, targetUserId)
            .run();

        return c.json({
            success: true,
            message: `User role updated to ${role}`,
        });
    } catch (error) {
        console.error('Admin update role error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to update user role' },
            500
        );
    }
});

adminRoutes.delete('/users/:id', async (c) => {
    const user = c.get('user');
    const targetUserId = c.req.param('id');

    if (user.role !== 'admin') {
        return c.json(
            { success: false, error: 'Forbidden', message: 'Admin access required' },
            403
        );
    }

    if (user.sub === targetUserId) {
        return c.json(
            { success: false, error: 'Bad Request', message: 'Cannot delete your own account' },
            400
        );
    }

    try {
        const existing = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?')
            .bind(targetUserId)
            .first();

        if (!existing) {
            return c.json(
                { success: false, error: 'Not Found', message: 'User not found' },
                404
            );
        }

        // Get projects owned by user to delete them and their dependencies
        const userProjects = await c.env.DB.prepare('SELECT id FROM projects WHERE owner_id = ?')
            .bind(targetUserId)
            .all<{ id: string }>();
        const projectIds = userProjects.results?.map(p => p.id) || [];

        const batch = [];

        // 1. Clean up dependencies for projects owned by the user
        for (const projectId of projectIds) {
            batch.push(c.env.DB.prepare('DELETE FROM activity_log WHERE project_id = ?').bind(projectId));
            batch.push(c.env.DB.prepare('DELETE FROM tasks WHERE project_id = ?').bind(projectId));
            batch.push(c.env.DB.prepare('DELETE FROM project_members WHERE project_id = ?').bind(projectId));
            batch.push(c.env.DB.prepare('DELETE FROM integrations WHERE project_id = ?').bind(projectId));
            batch.push(c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(projectId));
        }

        // 2. Global user cleanup
        // Remove from other projects
        batch.push(c.env.DB.prepare('DELETE FROM project_members WHERE user_id = ?').bind(targetUserId));

        // Remove preferences and notifications
        batch.push(c.env.DB.prepare('DELETE FROM user_preferences WHERE user_id = ?').bind(targetUserId));
        batch.push(c.env.DB.prepare('DELETE FROM notifications WHERE user_id = ?').bind(targetUserId));
        batch.push(c.env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(targetUserId));

        // Remove interactions
        batch.push(c.env.DB.prepare('DELETE FROM comments WHERE user_id = ?').bind(targetUserId));
        batch.push(c.env.DB.prepare('DELETE FROM attachments WHERE user_id = ?').bind(targetUserId));
        batch.push(c.env.DB.prepare('DELETE FROM activity_log WHERE user_id = ?').bind(targetUserId));

        // Handle tasks: reassign or delete. 
        // Setting assignee_id to NULL for tasks assigned to them.
        batch.push(c.env.DB.prepare('UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?').bind(targetUserId));

        // Deleting tasks created by them in other people's projects to avoid foreign key violations.
        batch.push(c.env.DB.prepare('DELETE FROM tasks WHERE created_by = ?').bind(targetUserId));

        // 3. Finally delete the user
        batch.push(c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetUserId));

        await c.env.DB.batch(batch);

        return c.json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error('Admin delete user error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to delete user' },
            500
        );
    }
});

adminRoutes.get('/projects', async (c) => {
    const user = c.get('user');

    if (user.role !== 'admin') {
        return c.json(
            { success: false, error: 'Forbidden', message: 'Admin access required' },
            403
        );
    }

    try {
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '20');
        const offset = (page - 1) * limit;
        const search = c.req.query('search') || '';

        let whereClause = 'WHERE p.is_archived = 0';
        const params: string[] = [];

        if (search) {
            whereClause += ' AND (p.name LIKE ? OR u.full_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const countQuery = `
            SELECT COUNT(*) as count 
            FROM projects p 
            LEFT JOIN users u ON p.owner_id = u.id 
            ${whereClause}
        `;

        const dataQuery = `
            SELECT 
                p.id, p.name, p.description, p.created_at, 
                u.full_name as owner_name, 
                u.email as owner_email,
                (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count
            FROM projects p
            LEFT JOIN users u ON p.owner_id = u.id
            ${whereClause}
            ORDER BY p.created_at DESC 
            LIMIT ? OFFSET ?
        `;

        const [totalResult, projects] = await Promise.all([
            c.env.DB.prepare(countQuery).bind(...params).first<{ count: number }>(),
            c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all(),
        ]);

        return c.json({
            success: true,
            data: {
                projects: projects.results || [],
                total: totalResult?.count || 0,
                page,
                limit,
                totalPages: Math.ceil((totalResult?.count || 0) / limit),
            },
        });
    } catch (error) {
        console.error('Admin projects error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch projects' },
            500
        );
    }
});

adminRoutes.delete('/projects/:id', async (c) => {
    const user = c.get('user');
    const targetProjectId = c.req.param('id');

    if (user.role !== 'admin') {
        return c.json(
            { success: false, error: 'Forbidden', message: 'Admin access required' },
            403
        );
    }

    try {
        const existing = await c.env.DB.prepare('SELECT id FROM projects WHERE id = ?')
            .bind(targetProjectId)
            .first();

        if (!existing) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Project not found' },
                404
            );
        }

        await c.env.DB.batch([
            c.env.DB.prepare('DELETE FROM activity_log WHERE project_id = ?').bind(targetProjectId),
            c.env.DB.prepare('DELETE FROM tasks WHERE project_id = ?').bind(targetProjectId),
            c.env.DB.prepare('DELETE FROM project_members WHERE project_id = ?').bind(targetProjectId),
            c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(targetProjectId),
        ]);

        return c.json({
            success: true,
            message: 'Project deleted successfully',
        });
    } catch (error) {
        console.error('Admin delete project error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to delete project' },
            500
        );
    }
});

adminRoutes.get('/activities', async (c) => {
    const user = c.get('user');

    if (user.role !== 'admin') {
        return c.json(
            { success: false, error: 'Forbidden', message: 'Admin access required' },
            403
        );
    }

    try {
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '50');
        const offset = (page - 1) * limit;

        const userId = c.req.query('user_id');
        const action = c.req.query('action');
        const startDate = c.req.query('start_date');
        const endDate = c.req.query('end_date');

        let whereClause = '';
        const params: (string | number)[] = [];

        if (userId) {
            whereClause += whereClause ? ' AND al.user_id = ?' : 'WHERE al.user_id = ?';
            params.push(userId);
        }
        if (action) {
            whereClause += whereClause ? ' AND al.action = ?' : 'WHERE al.action = ?';
            params.push(action);
        }
        if (startDate) {
            whereClause += whereClause ? ' AND al.created_at >= ?' : 'WHERE al.created_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            whereClause += whereClause ? ' AND al.created_at <= ?' : 'WHERE al.created_at <= ?';
            params.push(endDate);
        }

        const countQuery = `SELECT COUNT(*) as count FROM activity_log al ${whereClause}`;
        const dataQuery = `
            SELECT al.*, u.email as user_email, u.full_name as user_name, p.name as project_name
            FROM activity_log al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN projects p ON al.project_id = p.id
            ${whereClause}
            ORDER BY al.created_at DESC 
            LIMIT ? OFFSET ?
        `;

        const [totalResult, activities] = await Promise.all([
            whereClause
                ? c.env.DB.prepare(countQuery).bind(...params).first<{ count: number }>()
                : c.env.DB.prepare(countQuery).first<{ count: number }>(),
            c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all(),
        ]);

        return c.json({
            success: true,
            data: {
                activities: activities.results || [],
                total: totalResult?.count || 0,
                page,
                limit,
                totalPages: Math.ceil((totalResult?.count || 0) / limit),
            },
        });
    } catch (error) {
        console.error('Admin activities error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch activities' },
            500
        );
    }
});

// Export Users CSV
adminRoutes.get('/users/export', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);

    try {
        const { results: users } = await c.env.DB.prepare(`
            SELECT u.id, u.email, u.full_name, u.role, u.created_at,
            (SELECT COUNT(*) FROM projects p WHERE p.owner_id = u.id) as project_count
            FROM users u
            ORDER BY u.created_at DESC
        `).all<AdminUsersExportRow>();

        const headers = ['ID', 'Email', 'Full Name', 'Role', 'Created At', 'Project Count'];
        let csv = headers.join(',') + '\n';

        users.forEach((u) => {
            csv += [
                `"${sanitizeCsvValue(u.id)}"`,
                `"${sanitizeCsvValue(u.email)}"`,
                `"${sanitizeCsvValue(u.full_name)}"`,
                `"${sanitizeCsvValue(u.role)}"`,
                `"${sanitizeCsvValue(u.created_at)}"`,
                `"${sanitizeCsvValue(u.project_count)}"`
            ].join(',') + '\n';
        });

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="era-kanban-users-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    } catch {
        return c.json({ success: false, message: 'Export failed' }, 500);
    }
});

// Export Activities CSV
adminRoutes.get('/activities/export', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);

    try {
        const userId = c.req.query('user_id');
        const action = c.req.query('action');
        const startDate = c.req.query('start_date');
        const endDate = c.req.query('end_date');

        let whereClause = '';
        const params: string[] = [];

        if (userId) { whereClause += whereClause ? ' AND al.user_id = ?' : 'WHERE al.user_id = ?'; params.push(userId); }
        if (action) { whereClause += whereClause ? ' AND al.action = ?' : 'WHERE al.action = ?'; params.push(action); }
        if (startDate) { whereClause += whereClause ? ' AND al.created_at >= ?' : 'WHERE al.created_at >= ?'; params.push(startDate); }
        if (endDate) { whereClause += whereClause ? ' AND al.created_at <= ?' : 'WHERE al.created_at <= ?'; params.push(endDate); }

        const { results: activities } = await c.env.DB.prepare(`
            SELECT al.id, al.action, al.created_at, u.email as user_email, u.full_name as user_name, p.name as project_name
            FROM activity_log al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN projects p ON al.project_id = p.id
            ${whereClause}
            ORDER BY al.created_at DESC
        `).bind(...params).all<AdminActivitiesExportRow>();

        const headers = ['ID', 'User', 'Email', 'Action', 'Project', 'Date'];
        let csv = headers.join(',') + '\n';

        activities.forEach((a) => {
            csv += [
                `"${sanitizeCsvValue(a.id)}"`,
                `"${sanitizeCsvValue(a.user_name || 'System')}"`,
                `"${sanitizeCsvValue(a.user_email || '')}"`,
                `"${sanitizeCsvValue(a.action)}"`,
                `"${sanitizeCsvValue(a.project_name || 'N/A')}"`,
                `"${sanitizeCsvValue(a.created_at)}"`
            ].join(',') + '\n';
        });

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="era-kanban-activity-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    } catch {
        return c.json({ success: false, message: 'Export failed' }, 500);
    }
});

// Export Projects CSV
adminRoutes.get('/projects/export', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);

    try {
        const { results: projects } = await c.env.DB.prepare(`
            SELECT p.id, p.name, p.description, p.created_at, u.email as owner_email, u.full_name as owner_name,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count
            FROM projects p
            LEFT JOIN users u ON p.owner_id = u.id
            ORDER BY p.created_at DESC
        `).all<AdminProjectsExportRow>();

        const headers = ['ID', 'Name', 'Description', 'Owner', 'Owner Email', 'Created At', 'Task Count'];
        let csv = headers.join(',') + '\n';

        projects.forEach((p) => {
            csv += [
                `"${sanitizeCsvValue(p.id)}"`,
                `"${sanitizeCsvValue(p.name)}"`,
                `"${sanitizeCsvValue(p.description || '')}"`,
                `"${sanitizeCsvValue(p.owner_name || 'Unknown')}"`,
                `"${sanitizeCsvValue(p.owner_email || '')}"`,
                `"${sanitizeCsvValue(p.created_at)}"`,
                `"${sanitizeCsvValue(p.task_count)}"`
            ].join(',') + '\n';
        });

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="era-kanban-projects-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    } catch {
        return c.json({ success: false, message: 'Export failed' }, 500);
    }
});

// Test SMTP configuration by sending a test email
adminRoutes.post('/settings/smtp/test', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);

    try {
        let body: { to?: string } = {};
        try {
            body = await c.req.json<{ to?: string }>();
        } catch {
            body = {};
        }

        const recipient = String(body.to || user.email || '').trim().toLowerCase();
        if (!recipient || !isValidEmail(recipient)) {
            return c.json({ success: false, message: 'A valid recipient email is required for SMTP test.' }, 400);
        }

        const providerStatus = await getEmailProviderStatus(c.env);

        if (providerStatus.configuredProvider === 'smtp') {
            const smtpSettings = await getSmtpSettings(c.env);
            const requiredSmtpKeys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'] as const;
            const missingKeys = requiredSmtpKeys.filter((key) => !smtpSettings[key]?.trim());

            if (missingKeys.length > 0) {
                return c.json(
                    {
                        success: false,
                        message: `SMTP settings are incomplete. Missing: ${missingKeys.join(', ')}`,
                    },
                    400
                );
            }
        } else if (!c.env.RESEND_API_KEY || !c.env.EMAIL_FROM) {
            return c.json(
                {
                    success: false,
                    message: 'Provider is set to Resend, but RESEND_API_KEY or EMAIL_FROM is missing.',
                },
                400
            );
        }

        const emailService = await getEmailService(c.env);
        const baseUrl = (c.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
        try {
            await withTimeout(
                emailService.sendPasswordResetEmail({
                    to: recipient,
                    name: 'Admin',
                    resetLink: `${baseUrl}/reset-password?token=smtp-test`,
                    expiresInMinutes: 30,
                }),
                SMTP_TEST_TIMEOUT_MS,
                'SMTP test timed out'
            );
        } catch (sendError) {
            if (sendError instanceof Error && sendError.message === 'SMTP test timed out') {
                return c.json(
                    {
                        success: false,
                        message: 'SMTP test timed out. Verify host/port/firewall and try SMTP port 465 for Gmail.',
                    },
                    504
                );
            }
            throw sendError;
        }

        if (providerStatus.activeProvider === 'log') {
            return c.json(
                {
                    success: false,
                    message: providerStatus.reason || 'No active email delivery provider is configured.',
                    data: { provider: 'log', delivered: false, to: recipient },
                },
                400
            );
        }

        return c.json({
            success: true,
            message: `Test email sent to ${recipient}`,
            data: { provider: providerStatus.activeProvider, delivered: true, to: recipient },
        });
    } catch (error) {
        console.error('SMTP test error:', error);
        const message = error instanceof Error ? error.message : 'Failed to send test email';
        return c.json({ success: false, message }, 500);
    }
});

// Get System Settings
adminRoutes.get('/settings', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);

    try {
        const { results } = await c.env.DB.prepare('SELECT key, value FROM system_settings').all<{ key: string; value: string }>();
        const settings: Record<string, string> = {};
        results.forEach(row => {
            settings[row.key] = row.value;
        });

        // Ensure defaults if keys are missing
        const defaults: Record<string, string> = {
            maintenance_mode: 'false',
            allow_registration: 'true',
            default_user_role: 'member',
            email_provider: 'smtp',
            smtp_host: '',
            smtp_port: '',
            smtp_user: '',
            smtp_pass: '',
            smtp_from: '',
            slack_webhook_url: '',
            telegram_bot_token: '',
            telegram_chat_id: '',
        };

        return c.json({
            success: true,
            data: { ...defaults, ...settings }
        });
    } catch (error) {
        console.error('Get settings error:', error);
        return c.json({ success: false, message: 'Failed to fetch settings' }, 500);
    }
});

// Update System Settings
adminRoutes.put('/settings', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);

    try {
        const body = await c.req.json<Record<string, unknown>>();
        const entries = Object.entries(body || {});

        if (entries.length === 0) {
            return c.json({ success: false, message: 'No settings provided' }, 400);
        }

        const updates: Array<[string, string]> = [];
        for (const [key, rawValue] of entries) {
            const normalized = normalizeSettingValue(key, rawValue);
            if (normalized === null) {
                return c.json({ success: false, message: `Invalid setting value for key: ${key}` }, 400);
            }
            updates.push([key, normalized]);
        }

        const statements = updates.map(([key, value]) => {
            return c.env.DB.prepare(`
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (?, ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            `).bind(key, String(value));
        });

        await c.env.DB.batch(statements);

        return c.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Update settings error:', error);
        return c.json({ success: false, message: 'Failed to update settings' }, 500);
    }
});
