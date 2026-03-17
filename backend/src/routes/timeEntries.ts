import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';

export const timeEntriesRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
timeEntriesRoutes.use('*', authMiddleware);

// POST /start - Start a timer for a task
timeEntriesRoutes.post('/start', async (c) => {
    const userId = c.get('userId');

    try {
        const { task_id } = await c.req.json<{ task_id: string }>();

        if (!task_id) {
            return c.json(
                { success: false, error: 'Bad Request', message: 'task_id is required' },
                400
            );
        }

        // Check if user already has an active timer
        const activeTimer = await c.env.DB.prepare(
            `SELECT id FROM time_entries WHERE user_id = ? AND ended_at IS NULL`
        ).bind(userId).first();

        if (activeTimer) {
            return c.json(
                { success: false, error: 'Conflict', message: 'You already have an active timer. Stop it before starting a new one.' },
                409
            );
        }

        // Verify the task exists
        const task = await c.env.DB.prepare(
            `SELECT id FROM tasks WHERE id = ?`
        ).bind(task_id).first();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found' },
                404
            );
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await c.env.DB.prepare(
            `INSERT INTO time_entries (id, task_id, user_id, started_at, ended_at, duration_seconds, note, created_at)
             VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?)`
        ).bind(id, task_id, userId, now, now).run();

        return c.json({
            success: true,
            data: {
                id,
                task_id,
                user_id: userId,
                started_at: now,
                ended_at: null,
                duration_seconds: null,
                note: null,
            },
        }, 201);
    } catch (error) {
        console.error('Start timer error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to start timer' },
            500
        );
    }
});

// POST /stop - Stop the active timer
timeEntriesRoutes.post('/stop', async (c) => {
    const userId = c.get('userId');

    try {
        const { id } = await c.req.json<{ id: string }>();

        if (!id) {
            return c.json(
                { success: false, error: 'Bad Request', message: 'id is required' },
                400
            );
        }

        // Get the active time entry
        const entry = await c.env.DB.prepare(
            `SELECT id, started_at FROM time_entries WHERE id = ? AND user_id = ? AND ended_at IS NULL`
        ).bind(id, userId).first<{ id: string; started_at: string }>();

        if (!entry) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Active time entry not found' },
                404
            );
        }

        const now = new Date();
        const startedAt = new Date(entry.started_at);
        const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);
        const endedAt = now.toISOString();

        await c.env.DB.prepare(
            `UPDATE time_entries SET ended_at = ?, duration_seconds = ? WHERE id = ?`
        ).bind(endedAt, durationSeconds, id).run();

        return c.json({
            success: true,
            data: {
                id,
                ended_at: endedAt,
                duration_seconds: durationSeconds,
            },
        });
    } catch (error) {
        console.error('Stop timer error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to stop timer' },
            500
        );
    }
});

// POST /manual - Add a manual time entry
timeEntriesRoutes.post('/manual', async (c) => {
    const userId = c.get('userId');

    try {
        const { task_id, duration_seconds, note } = await c.req.json<{
            task_id: string;
            duration_seconds: number;
            note?: string;
        }>();

        if (!task_id || duration_seconds == null) {
            return c.json(
                { success: false, error: 'Bad Request', message: 'task_id and duration_seconds are required' },
                400
            );
        }

        if (typeof duration_seconds !== 'number' || duration_seconds <= 0) {
            return c.json(
                { success: false, error: 'Bad Request', message: 'duration_seconds must be a positive number' },
                400
            );
        }

        // Verify the task exists
        const task = await c.env.DB.prepare(
            `SELECT id FROM tasks WHERE id = ?`
        ).bind(task_id).first();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found' },
                404
            );
        }

        const id = crypto.randomUUID();
        const now = new Date();
        const endedAt = now.toISOString();
        const startedAt = new Date(now.getTime() - duration_seconds * 1000).toISOString();

        await c.env.DB.prepare(
            `INSERT INTO time_entries (id, task_id, user_id, started_at, ended_at, duration_seconds, note, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, task_id, userId, startedAt, endedAt, duration_seconds, note || null, endedAt).run();

        return c.json({
            success: true,
            data: {
                id,
                task_id,
                user_id: userId,
                started_at: startedAt,
                ended_at: endedAt,
                duration_seconds,
                note: note || null,
            },
        }, 201);
    } catch (error) {
        console.error('Manual time entry error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to create manual time entry' },
            500
        );
    }
});

// GET /active - Get the user's currently active timer
timeEntriesRoutes.get('/active', async (c) => {
    const userId = c.get('userId');

    try {
        const entry = await c.env.DB.prepare(
            `SELECT te.id, te.task_id, te.user_id, te.started_at, te.ended_at, te.duration_seconds, te.note,
                    t.title as task_title, p.name as project_name
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             WHERE te.user_id = ? AND te.ended_at IS NULL`
        ).bind(userId).first();

        return c.json({
            success: true,
            data: {
                entry: entry || null,
            },
        });
    } catch (error) {
        console.error('Get active timer error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch active timer' },
            500
        );
    }
});

// GET /task/:taskId - Get all time entries for a task
timeEntriesRoutes.get('/task/:taskId', async (c) => {
    const taskId = c.req.param('taskId');

    try {
        const { results: entries } = await c.env.DB.prepare(
            `SELECT te.id, te.task_id, te.user_id, te.started_at, te.ended_at, te.duration_seconds, te.note,
                    u.full_name as user_name, u.avatar_url as user_avatar
             FROM time_entries te
             JOIN users u ON te.user_id = u.id
             WHERE te.task_id = ?
             ORDER BY te.started_at DESC`
        ).bind(taskId).all();

        // Calculate total time for the task
        const totalResult = await c.env.DB.prepare(
            `SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds
             FROM time_entries
             WHERE task_id = ? AND ended_at IS NOT NULL`
        ).bind(taskId).first<{ total_seconds: number }>();

        return c.json({
            success: true,
            data: {
                entries: entries || [],
                total_seconds: Number(totalResult?.total_seconds || 0),
            },
        });
    } catch (error) {
        console.error('Get task time entries error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch time entries for task' },
            500
        );
    }
});

// GET /user/weekly - Get current user's time entries for the current week, grouped by day
timeEntriesRoutes.get('/user/weekly', async (c) => {
    const userId = c.get('userId');

    try {
        // Get entries for the current week (Monday to Sunday)
        const { results: entries } = await c.env.DB.prepare(
            `SELECT te.id, te.task_id, te.started_at, te.ended_at, te.duration_seconds, te.note,
                    t.title as task_title, p.name as project_name,
                    date(te.started_at) as entry_date
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN projects p ON t.project_id = p.id
             WHERE te.user_id = ?
               AND te.ended_at IS NOT NULL
               AND date(te.started_at) >= date('now', 'weekday 1', '-7 days')
               AND date(te.started_at) < date('now', 'weekday 1')
             ORDER BY te.started_at ASC`
        ).bind(userId).all();

        // Group by day
        const byDay: Record<string, { entries: any[]; total_seconds: number }> = {};
        (entries || []).forEach((entry: Record<string, unknown>) => {
            const day = String(entry.entry_date);
            if (!byDay[day]) {
                byDay[day] = { entries: [], total_seconds: 0 };
            }
            byDay[day].entries.push({
                id: entry.id,
                task_id: entry.task_id,
                task_title: entry.task_title,
                project_name: entry.project_name,
                started_at: entry.started_at,
                ended_at: entry.ended_at,
                duration_seconds: Number(entry.duration_seconds),
                note: entry.note,
            });
            byDay[day].total_seconds += Number(entry.duration_seconds || 0);
        });

        const weekTotalSeconds = Object.values(byDay).reduce((sum, day) => sum + day.total_seconds, 0);

        return c.json({
            success: true,
            data: {
                days: byDay,
                week_total_seconds: weekTotalSeconds,
            },
        });
    } catch (error) {
        console.error('Get weekly time entries error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch weekly time entries' },
            500
        );
    }
});

// GET /project/:projectId/report - Get time report for a project
timeEntriesRoutes.get('/project/:projectId/report', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');

    try {
        // Verify user has access to the project
        const access = await c.env.DB.prepare(
            `SELECT id FROM projects
             WHERE id = ? AND (
                 owner_id = ?
                 OR EXISTS (
                     SELECT 1 FROM project_members pm
                     WHERE pm.project_id = ? AND pm.user_id = ?
                 )
             )`
        ).bind(projectId, userId, projectId, userId).first();

        if (!access) {
            return c.json(
                { success: false, error: 'Forbidden', message: 'You do not have access to this project' },
                403
            );
        }

        // Total time per task
        const { results: perTask } = await c.env.DB.prepare(
            `SELECT t.id as task_id, t.title as task_title,
                    COALESCE(SUM(te.duration_seconds), 0) as total_seconds,
                    COUNT(te.id) as entry_count
             FROM tasks t
             LEFT JOIN time_entries te ON t.id = te.task_id AND te.ended_at IS NOT NULL
             WHERE t.project_id = ?
             GROUP BY t.id
             HAVING total_seconds > 0
             ORDER BY total_seconds DESC`
        ).bind(projectId).all();

        // Total time per user
        const { results: perUser } = await c.env.DB.prepare(
            `SELECT u.id as user_id, u.full_name as user_name, u.avatar_url as user_avatar,
                    COALESCE(SUM(te.duration_seconds), 0) as total_seconds,
                    COUNT(te.id) as entry_count
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             JOIN users u ON te.user_id = u.id
             WHERE t.project_id = ? AND te.ended_at IS NOT NULL
             GROUP BY te.user_id
             ORDER BY total_seconds DESC`
        ).bind(projectId).all();

        // Project total
        const projectTotal = await c.env.DB.prepare(
            `SELECT COALESCE(SUM(te.duration_seconds), 0) as total_seconds
             FROM time_entries te
             JOIN tasks t ON te.task_id = t.id
             WHERE t.project_id = ? AND te.ended_at IS NOT NULL`
        ).bind(projectId).first<{ total_seconds: number }>();

        return c.json({
            success: true,
            data: {
                project_id: projectId,
                total_seconds: Number(projectTotal?.total_seconds || 0),
                per_task: (perTask || []).map((row: Record<string, unknown>) => ({
                    task_id: row.task_id,
                    task_title: row.task_title,
                    total_seconds: Number(row.total_seconds),
                    entry_count: Number(row.entry_count),
                })),
                per_user: (perUser || []).map((row: Record<string, unknown>) => ({
                    user_id: row.user_id,
                    user_name: row.user_name,
                    user_avatar: row.user_avatar,
                    total_seconds: Number(row.total_seconds),
                    entry_count: Number(row.entry_count),
                })),
            },
        });
    } catch (error) {
        console.error('Get project time report error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch project time report' },
            500
        );
    }
});

export default timeEntriesRoutes;
