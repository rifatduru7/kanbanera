import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';

export const metricsRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
metricsRoutes.use('*', authMiddleware);

// GET /api/metrics - Dashboard statistics
metricsRoutes.get('/', async (c) => {
    const userId = c.get('userId');

    try {
        // Get task statistics
        const taskStats = await c.env.DB.prepare(`
            SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN t.column_id IN (
                    SELECT id FROM columns WHERE LOWER(name) IN ('done', 'completed', 'finished')
                ) THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN t.column_id IN (
                    SELECT id FROM columns WHERE LOWER(name) IN ('in progress', 'doing', 'working')
                ) THEN 1 ELSE 0 END) as in_progress_tasks,
                SUM(CASE WHEN t.due_date < datetime('now') AND t.column_id NOT IN (
                    SELECT id FROM columns WHERE LOWER(name) IN ('done', 'completed', 'finished')
                ) THEN 1 ELSE 0 END) as overdue_tasks
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE (
                p.owner_id = ?
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id AND pm.user_id = ?
                )
            )
        `).bind(userId, userId).first();

        // Get project statistics
        const projectStats = await c.env.DB.prepare(`
            SELECT 
                COUNT(*) as total_projects,
                SUM(CASE WHEN p.is_archived = 0 THEN 1 ELSE 0 END) as active_projects
            FROM projects p
            WHERE (
                p.owner_id = ?
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id AND pm.user_id = ?
                )
            )
        `).bind(userId, userId).first();

        // Get priority distribution
        const { results: priorityDistribution } = await c.env.DB.prepare(`
            SELECT 
                t.priority,
                COUNT(*) as count
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE (
                p.owner_id = ?
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id AND pm.user_id = ?
                )
            )
            GROUP BY t.priority
            ORDER BY 
                CASE t.priority 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    WHEN 'low' THEN 4 
                    ELSE 5 
                END
        `).bind(userId, userId).all();

        // Get team performance (tasks completed by each user)
        const { results: teamPerformance } = await c.env.DB.prepare(`
            SELECT 
                u.id as user_id,
                u.full_name as name,
                u.avatar_url as avatar,
                COUNT(CASE WHEN c.name IN ('Done', 'Completed', 'Finished') THEN 1 END) as completed,
                COUNT(CASE WHEN c.name IN ('In Progress', 'Doing', 'Working') THEN 1 END) as in_progress,
                COUNT(*) as total
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            JOIN columns c ON t.column_id = c.id
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE (
                p.owner_id = ?
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id AND pm.user_id = ?
                )
            ) AND t.assignee_id IS NOT NULL
            GROUP BY t.assignee_id
            ORDER BY completed DESC
            LIMIT 10
        `).bind(userId, userId).all();

        return c.json({
            success: true,
            data: {
                stats: {
                    totalTasks: Number(taskStats?.total_tasks || 0),
                    completedTasks: Number(taskStats?.completed_tasks || 0),
                    inProgressTasks: Number(taskStats?.in_progress_tasks || 0),
                    overdueTasks: Number(taskStats?.overdue_tasks || 0),
                    totalProjects: Number(projectStats?.total_projects || 0),
                    activeProjects: Number(projectStats?.active_projects || 0),
                },
                priorityDistribution: priorityDistribution?.map((p: Record<string, unknown>) => ({
                    priority: p.priority || 'none',
                    count: Number(p.count || 0),
                })) || [],
                teamPerformance: teamPerformance?.map((t: Record<string, unknown>) => ({
                    userId: t.user_id,
                    name: t.name || 'Unassigned',
                    avatar: t.avatar,
                    completed: Number(t.completed || 0),
                    inProgress: Number(t.in_progress || 0),
                    total: Number(t.total || 0),
                })) || [],
            },
        });
    } catch (error) {
        console.error('Get metrics error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch metrics' },
            500
        );
    }
});

// GET /api/metrics/dashboard - Enhanced dashboard data
metricsRoutes.get('/dashboard', async (c) => {
    const userId = c.get('userId');

    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        // Tasks due today
        const dueToday = await c.env.DB.prepare(`
            SELECT t.id, t.title, t.priority, t.due_date, p.name as project_name, c.name as column_name
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            JOIN columns c ON t.column_id = c.id
            WHERE (
                p.owner_id = ?
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id AND pm.user_id = ?
                )
            )
              AND date(t.due_date) = date(?)
              AND c.name NOT IN ('Done', 'Completed', 'Finished')
            ORDER BY 
                CASE t.priority 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END
            LIMIT 10
        `).bind(userId, userId, todayStr).all();

        // Tasks due this week
        const dueThisWeek = await c.env.DB.prepare(`
            SELECT t.id, t.title, t.priority, t.due_date, p.name as project_name
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            JOIN columns c ON t.column_id = c.id
            WHERE (
                p.owner_id = ?
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id AND pm.user_id = ?
                )
            )
              AND date(t.due_date) > date(?)
              AND date(t.due_date) <= date(?)
              AND c.name NOT IN ('Done', 'Completed', 'Finished')
            ORDER BY t.due_date
            LIMIT 10
        `).bind(userId, userId, todayStr, weekEndStr).all();

        // My tasks (assigned to current user, not completed)
        const myTasks = await c.env.DB.prepare(`
            SELECT t.id, t.title, t.priority, t.due_date, p.name as project_name, c.name as column_name
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            JOIN columns c ON t.column_id = c.id
            WHERE t.assignee_id = ?
              AND c.name NOT IN ('Done', 'Completed', 'Finished')
            ORDER BY 
                CASE t.priority 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END,
                t.due_date ASC
            LIMIT 20
        `).bind(userId).all();

        // Project progress (completion percentage for each project)
        const projectProgress = await c.env.DB.prepare(`
            SELECT 
                p.id,
                p.name,
                COUNT(t.id) as total_tasks,
                SUM(CASE WHEN c.name IN ('Done', 'Completed', 'Finished') THEN 1 ELSE 0 END) as completed_tasks
            FROM projects p
            LEFT JOIN tasks t ON p.id = t.project_id
            LEFT JOIN columns c ON t.column_id = c.id
            WHERE (
                p.owner_id = ?
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id AND pm.user_id = ?
                )
            )
            GROUP BY p.id
            HAVING COUNT(t.id) > 0
            ORDER BY (CAST(SUM(CASE WHEN c.name IN ('Done', 'Completed', 'Finished') THEN 1 ELSE 0 END) AS REAL) / COUNT(t.id)) DESC
            LIMIT 5
        `).bind(userId, userId).all();

        // Streak calculation - consecutive days with completed tasks
        const streakData = await c.env.DB.prepare(`
            SELECT DISTINCT date(al.created_at) as activity_date
            FROM activity_log al
            WHERE al.user_id = ?
              AND al.action = 'task_completed'
              AND date(al.created_at) >= date('now', '-30 days')
            ORDER BY activity_date DESC
        `).bind(userId).all();

        let streak = 0;
        const dates = (streakData.results || []).map((r: Record<string, unknown>) => String(r.activity_date));

        if (dates.length > 0) {
            const checkDate = new Date(todayStr);
            for (let i = 0; i < 30; i++) {
                const dateStr = checkDate.toISOString().split('T')[0];
                if (dates.includes(dateStr)) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else if (i === 0) {
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        // Team members (project members)
        const teamMembers = await c.env.DB.prepare(`
            SELECT DISTINCT u.id, u.full_name, u.avatar_url, u.email
            FROM users u
            WHERE u.id IN (
                SELECT p.owner_id
                FROM projects p
                WHERE (
                    p.owner_id = ?
                    OR EXISTS (
                        SELECT 1 FROM project_members apm
                        WHERE apm.project_id = p.id AND apm.user_id = ?
                    )
                )
                UNION
                SELECT pm.user_id
                FROM project_members pm
                JOIN projects p ON pm.project_id = p.id
                WHERE (
                    p.owner_id = ?
                    OR EXISTS (
                        SELECT 1 FROM project_members apm
                        WHERE apm.project_id = p.id AND apm.user_id = ?
                    )
                )
            )
            ORDER BY u.full_name
            LIMIT 10
        `).bind(userId, userId, userId, userId).all();

        // Completion rate
        const completionStats = await c.env.DB.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN c.name IN ('Done', 'Completed', 'Finished') THEN 1 ELSE 0 END) as completed
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            JOIN columns c ON t.column_id = c.id
            WHERE (
                p.owner_id = ?
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id AND pm.user_id = ?
                )
            )
        `).bind(userId, userId).first<{ total: number; completed: number }>();

        const totalTasks = completionStats?.total || 0;
        const completedTasks = completionStats?.completed || 0;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Overdue tasks count
        const overdueStats = await c.env.DB.prepare(`
            SELECT COUNT(*) as count
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            JOIN columns c ON t.column_id = c.id
            WHERE (
                p.owner_id = ?
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = p.id AND pm.user_id = ?
                )
            )
              AND t.due_date < datetime('now')
              AND c.name NOT IN ('Done', 'Completed', 'Finished')
        `).bind(userId, userId).first<{ count: number }>();

        return c.json({
            success: true,
            data: {
                dueToday: (dueToday.results || []).map((t: Record<string, unknown>) => ({
                    id: t.id,
                    title: t.title,
                    priority: t.priority,
                    dueDate: t.due_date,
                    projectName: t.project_name,
                    columnName: t.column_name,
                })),
                dueThisWeek: (dueThisWeek.results || []).map((t: Record<string, unknown>) => ({
                    id: t.id,
                    title: t.title,
                    priority: t.priority,
                    dueDate: t.due_date,
                    projectName: t.project_name,
                })),
                myTasks: (myTasks.results || []).map((t: Record<string, unknown>) => ({
                    id: t.id,
                    title: t.title,
                    priority: t.priority,
                    dueDate: t.due_date,
                    projectName: t.project_name,
                    columnName: t.column_name,
                })),
                projectProgress: (projectProgress.results || []).map((p: Record<string, unknown>) => ({
                    id: p.id,
                    name: p.name,
                    totalTasks: Number(p.total_tasks),
                    completedTasks: Number(p.completed_tasks),
                    progressPercent: Number(p.total_tasks) > 0 
                        ? Math.round((Number(p.completed_tasks) / Number(p.total_tasks)) * 100) 
                        : 0,
                })),
                streak,
                completionRate,
                teamMembers: (teamMembers.results || []).map((m: Record<string, unknown>) => ({
                    id: m.id,
                    name: m.full_name,
                    avatar: m.avatar_url,
                    email: m.email,
                })),
                summary: {
                    dueTodayCount: dueToday.results?.length || 0,
                    dueThisWeekCount: dueThisWeek.results?.length || 0,
                    myTasksCount: myTasks.results?.length || 0,
                    overdueCount: overdueStats?.count || 0,
                },
            },
        });
    } catch (error) {
        console.error('Get dashboard metrics error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch dashboard metrics' },
            500
        );
    }
});

export default metricsRoutes;
