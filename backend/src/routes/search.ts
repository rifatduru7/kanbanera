import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';

export const searchRoutes = new Hono<{ Bindings: Env }>();

searchRoutes.use('*', authMiddleware);

// GET /api/search?q=&scope=&limit=
searchRoutes.get('/', async (c) => {
    const userId = c.get('userId');
    const q = (c.req.query('q') || '').trim();
    const scope = (c.req.query('scope') || 'all').trim().toLowerCase();
    const limit = clamp(parseInt(c.req.query('limit') || '10', 10), 1, 50);

    if (!q) {
        return c.json(
            {
                success: false,
                error: 'Validation Error',
                message: 'q query parameter is required',
            },
            400
        );
    }

    try {
        const tasks = scope === 'all' || scope === 'tasks'
            ? await searchTasks(c.env, userId, q, limit)
            : [];
        const projects = scope === 'all' || scope === 'projects'
            ? await searchProjects(c.env, userId, q, limit)
            : [];
        const users = scope === 'all' || scope === 'users'
            ? await searchUsers(c.env, userId, q, limit)
            : [];

        return c.json({
            success: true,
            data: { tasks, projects, users },
        });
    } catch (error) {
        console.error('Search error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to search' },
            500
        );
    }
});

async function searchTasks(env: Env, userId: string, query: string, limit: number) {
    const like = `%${query}%`;
    const { results } = await env.DB.prepare(
        `SELECT DISTINCT
            t.id,
            t.title,
            t.priority,
            t.due_date,
            t.project_id,
            p.name as project_name
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        LEFT JOIN project_members pm ON pm.project_id = p.id
        WHERE (p.owner_id = ? OR pm.user_id = ?)
          AND (t.title LIKE ? OR COALESCE(t.description, '') LIKE ?)
        ORDER BY t.updated_at DESC
        LIMIT ?`
    )
        .bind(userId, userId, like, like, limit)
        .all();

    return (results || []).map((task: Record<string, unknown>) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        dueDate: task.due_date,
        projectId: task.project_id,
        projectName: task.project_name,
    }));
}

async function searchProjects(env: Env, userId: string, query: string, limit: number) {
    const like = `%${query}%`;
    const { results } = await env.DB.prepare(
        `SELECT DISTINCT
            p.id,
            p.name,
            p.description,
            p.updated_at
        FROM projects p
        LEFT JOIN project_members pm ON pm.project_id = p.id
        WHERE (p.owner_id = ? OR pm.user_id = ?)
          AND (p.name LIKE ? OR COALESCE(p.description, '') LIKE ?)
        ORDER BY p.updated_at DESC
        LIMIT ?`
    )
        .bind(userId, userId, like, like, limit)
        .all();

    return (results || []).map((project: Record<string, unknown>) => ({
        id: project.id,
        name: project.name,
        description: project.description,
    }));
}

async function searchUsers(env: Env, userId: string, query: string, limit: number) {
    const like = `%${query}%`;
    const { results } = await env.DB.prepare(
        `SELECT DISTINCT
            u.id,
            u.full_name,
            u.email,
            u.avatar_url
        FROM users u
        JOIN project_members pm_target ON pm_target.user_id = u.id
        JOIN projects p ON p.id = pm_target.project_id
        LEFT JOIN project_members pm_self ON pm_self.project_id = p.id AND pm_self.user_id = ?
        WHERE (p.owner_id = ? OR pm_self.user_id = ?)
          AND (u.full_name LIKE ? OR u.email LIKE ?)
        ORDER BY u.full_name ASC
        LIMIT ?`
    )
        .bind(userId, userId, userId, like, like, limit)
        .all();

    return (results || []).map((user: Record<string, unknown>) => ({
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        avatarUrl: user.avatar_url,
    }));
}

function clamp(value: number, min: number, max: number) {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
}

export default searchRoutes;
