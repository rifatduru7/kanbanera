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
            LEFT JOIN project_members pm ON p.id = pm.project_id
            WHERE p.owner_id = ? OR pm.user_id = ?
        `).bind(userId, userId).first();

        // Get project statistics
        const projectStats = await c.env.DB.prepare(`
            SELECT 
                COUNT(*) as total_projects,
                SUM(CASE WHEN p.is_archived = 0 THEN 1 ELSE 0 END) as active_projects
            FROM projects p
            LEFT JOIN project_members pm ON p.id = pm.project_id
            WHERE p.owner_id = ? OR pm.user_id = ?
        `).bind(userId, userId).first();

        // Get priority distribution
        const { results: priorityDistribution } = await c.env.DB.prepare(`
            SELECT 
                t.priority,
                COUNT(*) as count
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            LEFT JOIN project_members pm ON p.id = pm.project_id
            WHERE (p.owner_id = ? OR pm.user_id = ?)
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
            LEFT JOIN project_members pm ON p.id = pm.project_id
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE (p.owner_id = ? OR pm.user_id = ?) AND t.assignee_id IS NOT NULL
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

export default metricsRoutes;
