import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';

export const presenceRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
presenceRoutes.use('*', authMiddleware);

// POST /heartbeat - Update user's presence
presenceRoutes.post('/heartbeat', async (c) => {
    const userId = c.get('userId');

    try {
        const body = await c.req.json<{
            project_id: string;
            current_view?: string;
            current_task_id?: string;
        }>();

        if (!body.project_id) {
            return c.json({ success: false, error: 'Bad Request', message: 'project_id is required' }, 400);
        }

        // Verify user has access to the project
        const access = await c.env.DB.prepare(
            `SELECT 1 FROM projects
             WHERE id = ? AND (
                 owner_id = ?
                 OR EXISTS (
                     SELECT 1 FROM project_members
                     WHERE project_id = ? AND user_id = ?
                 )
             )`
        )
            .bind(body.project_id, userId, body.project_id, userId)
            .first();

        if (!access) {
            return c.json({ success: false, error: 'Forbidden', message: 'You do not have access to this project' }, 403);
        }

        // Check if current_task_id changed (for board_events logging)
        const existing = await c.env.DB.prepare(
            `SELECT current_task_id FROM user_presence WHERE user_id = ? AND project_id = ?`
        )
            .bind(userId, body.project_id)
            .first<{ current_task_id: string | null }>();

        const now = new Date().toISOString();

        // UPSERT user presence
        await c.env.DB.prepare(
            `INSERT INTO user_presence (id, user_id, project_id, current_view, current_task_id, last_seen_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT (user_id, project_id) DO UPDATE SET
                 current_view = excluded.current_view,
                 current_task_id = excluded.current_task_id,
                 last_seen_at = excluded.last_seen_at`
        )
            .bind(
                crypto.randomUUID(),
                userId,
                body.project_id,
                body.current_view || null,
                body.current_task_id || null,
                now
            )
            .run();

        // Log board event if current_task_id changed
        const previousTaskId = existing?.current_task_id || null;
        const newTaskId = body.current_task_id || null;

        if (newTaskId !== previousTaskId) {
            await c.env.DB.prepare(
                `INSERT INTO board_events (id, project_id, user_id, event_type, payload, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)`
            )
                .bind(
                    crypto.randomUUID(),
                    body.project_id,
                    userId,
                    'task_focus_changed',
                    JSON.stringify({
                        previous_task_id: previousTaskId,
                        current_task_id: newTaskId,
                    }),
                    now
                )
                .run();
        }

        return c.json({
            success: true,
            data: { last_seen_at: now },
        });
    } catch (error) {
        console.error('Heartbeat error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to update presence' },
            500
        );
    }
});

// GET /:projectId - Get active users in a project
presenceRoutes.get('/:projectId', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');

    try {
        // Verify user has access to the project
        const access = await c.env.DB.prepare(
            `SELECT 1 FROM projects
             WHERE id = ? AND (
                 owner_id = ?
                 OR EXISTS (
                     SELECT 1 FROM project_members
                     WHERE project_id = ? AND user_id = ?
                 )
             )`
        )
            .bind(projectId, userId, projectId, userId)
            .first();

        if (!access) {
            return c.json({ success: false, error: 'Forbidden', message: 'You do not have access to this project' }, 403);
        }

        const cutoff = new Date(Date.now() - 60 * 1000).toISOString();

        const { results } = await c.env.DB.prepare(
            `SELECT
                 up.user_id,
                 up.current_view,
                 up.current_task_id,
                 up.last_seen_at,
                 u.full_name,
                 u.avatar_url
             FROM user_presence up
             JOIN users u ON up.user_id = u.id
             WHERE up.project_id = ? AND up.last_seen_at > ?
             ORDER BY up.last_seen_at DESC`
        )
            .bind(projectId, cutoff)
            .all();

        const activeUsers = (results || []).map((row: Record<string, unknown>) => ({
            user_id: row.user_id,
            full_name: row.full_name,
            avatar_url: row.avatar_url,
            current_view: row.current_view,
            current_task_id: row.current_task_id,
            last_seen_at: row.last_seen_at,
        }));

        return c.json({
            success: true,
            data: { active_users: activeUsers },
        });
    } catch (error) {
        console.error('Get active users error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch active users' },
            500
        );
    }
});

// GET /:projectId/events - Get recent board events since a timestamp
presenceRoutes.get('/:projectId/events', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');
    const since = c.req.query('since');

    try {
        // Verify user has access to the project
        const access = await c.env.DB.prepare(
            `SELECT 1 FROM projects
             WHERE id = ? AND (
                 owner_id = ?
                 OR EXISTS (
                     SELECT 1 FROM project_members
                     WHERE project_id = ? AND user_id = ?
                 )
             )`
        )
            .bind(projectId, userId, projectId, userId)
            .first();

        if (!access) {
            return c.json({ success: false, error: 'Forbidden', message: 'You do not have access to this project' }, 403);
        }

        // Clamp to at most 60 seconds ago
        const maxCutoff = new Date(Date.now() - 60 * 1000).toISOString();
        let sinceTimestamp = maxCutoff;

        if (since) {
            const parsed = new Date(since);
            if (isNaN(parsed.getTime())) {
                return c.json({ success: false, error: 'Bad Request', message: 'Invalid since timestamp' }, 400);
            }
            // Use the later of the two: provided timestamp or 60s ago
            sinceTimestamp = parsed.toISOString() > maxCutoff ? parsed.toISOString() : maxCutoff;
        }

        const { results } = await c.env.DB.prepare(
            `SELECT
                 id,
                 project_id,
                 user_id,
                 event_type,
                 payload,
                 created_at
             FROM board_events
             WHERE project_id = ? AND created_at > ?
             ORDER BY created_at ASC`
        )
            .bind(projectId, sinceTimestamp)
            .all();

        const events = (results || []).map((row: Record<string, unknown>) => {
            let payload: unknown = null;
            try {
                if (row.payload && typeof row.payload === 'string') {
                    payload = JSON.parse(row.payload);
                }
            } catch {
                // Ignore parse errors
            }

            return {
                id: row.id,
                project_id: row.project_id,
                user_id: row.user_id,
                event_type: row.event_type,
                payload,
                created_at: row.created_at,
            };
        });

        return c.json({
            success: true,
            data: { events },
        });
    } catch (error) {
        console.error('Get board events error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch board events' },
            500
        );
    }
});

// DELETE /offline - Mark current user as offline
presenceRoutes.delete('/offline', async (c) => {
    const userId = c.get('userId');

    try {
        await c.env.DB.prepare(
            `DELETE FROM user_presence WHERE user_id = ?`
        )
            .bind(userId)
            .run();

        return c.json({
            success: true,
            data: { message: 'User marked as offline' },
        });
    } catch (error) {
        console.error('Offline error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to mark user as offline' },
            500
        );
    }
});

export default presenceRoutes;
