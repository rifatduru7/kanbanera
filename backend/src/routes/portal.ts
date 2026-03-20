import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { createBulkNotifications } from '../services/notifications/createBulkNotifications';

// ─── Portal Management Routes (JWT auth required) ───────────────────────────

const portalManagementRoutes = new Hono<{ Bindings: Env }>();

portalManagementRoutes.use('*', authMiddleware);

/** Verify that the current user is an owner or admin of the given project. */
async function verifyProjectAdmin(
    db: Env['DB'],
    projectId: string,
    userId: string
): Promise<{ id: string; owner_id: string; role: string | null } | null> {
    return db
        .prepare(
            `SELECT p.id, p.owner_id, pm.role
             FROM projects p
             LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
             WHERE p.id = ? AND (p.owner_id = ? OR pm.role IN ('owner', 'admin'))`
        )
        .bind(userId, projectId, userId)
        .first<{ id: string; owner_id: string; role: string | null }>();
}

// POST /manage – Create a new client portal
portalManagementRoutes.post('/manage', async (c) => {
    const userId = c.get('userId');

    try {
        const body = await c.req.json();
        const { project_id, name, allowed_columns, branding } = body;

        if (!project_id || !name || !name.trim()) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'project_id and name are required' },
                400
            );
        }

        const access = await verifyProjectAdmin(c.env.DB, project_id, userId);
        if (!access) {
            return c.json(
                { success: false, error: 'Forbidden', message: 'Only project owners or admins can create portals' },
                403
            );
        }

        const portalId = crypto.randomUUID();
        const token = crypto.randomUUID();

        await c.env.DB.prepare(
            `INSERT INTO client_portals (id, project_id, name, token, allowed_columns, branding, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
            .bind(
                portalId,
                project_id,
                name.trim(),
                token,
                allowed_columns ? JSON.stringify(allowed_columns) : null,
                branding ? JSON.stringify(branding) : null,
                userId
            )
            .run();

        const portal = await c.env.DB.prepare('SELECT * FROM client_portals WHERE id = ?')
            .bind(portalId)
            .first();

        return c.json({ success: true, data: { portal } }, 201);
    } catch (error) {
        console.error('Create portal error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to create portal' },
            500
        );
    }
});

// GET /manage/:projectId – List portals for a project
portalManagementRoutes.get('/manage/:projectId', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');

    try {
        const access = await verifyProjectAdmin(c.env.DB, projectId, userId);
        if (!access) {
            return c.json(
                { success: false, error: 'Forbidden', message: 'Only project owners or admins can view portals' },
                403
            );
        }

        const { results } = await c.env.DB.prepare(
            'SELECT * FROM client_portals WHERE project_id = ? ORDER BY created_at DESC'
        )
            .bind(projectId)
            .all();

        return c.json({ success: true, data: { portals: results || [] } });
    } catch (error) {
        console.error('List portals error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch portals' },
            500
        );
    }
});

// PUT /manage/:portalId – Update a portal
portalManagementRoutes.put('/manage/:portalId', async (c) => {
    const userId = c.get('userId');
    const portalId = c.req.param('portalId');

    try {
        const portal = await c.env.DB.prepare(
            'SELECT * FROM client_portals WHERE id = ?'
        )
            .bind(portalId)
            .first<{ id: string; project_id: string; name: string; allowed_columns: string | null; branding: string | null; is_active: number }>();

        if (!portal) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Portal not found' },
                404
            );
        }

        const access = await verifyProjectAdmin(c.env.DB, portal.project_id, userId);
        if (!access) {
            return c.json(
                { success: false, error: 'Forbidden', message: 'Only project owners or admins can update portals' },
                403
            );
        }

        const body = await c.req.json();
        const { name, allowed_columns, branding, is_active } = body;

        await c.env.DB.prepare(
            `UPDATE client_portals
             SET name = COALESCE(?, name),
                 allowed_columns = COALESCE(?, allowed_columns),
                 branding = COALESCE(?, branding),
                 is_active = COALESCE(?, is_active),
                 updated_at = datetime('now')
             WHERE id = ?`
        )
            .bind(
                name ? name.trim() : null,
                allowed_columns !== undefined ? JSON.stringify(allowed_columns) : null,
                branding !== undefined ? JSON.stringify(branding) : null,
                is_active !== undefined ? (is_active ? 1 : 0) : null,
                portalId
            )
            .run();

        const updated = await c.env.DB.prepare('SELECT * FROM client_portals WHERE id = ?')
            .bind(portalId)
            .first();

        return c.json({ success: true, data: { portal: updated } });
    } catch (error) {
        console.error('Update portal error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to update portal' },
            500
        );
    }
});

// DELETE /manage/:portalId – Delete a portal
portalManagementRoutes.delete('/manage/:portalId', async (c) => {
    const userId = c.get('userId');
    const portalId = c.req.param('portalId');

    try {
        const portal = await c.env.DB.prepare(
            'SELECT * FROM client_portals WHERE id = ?'
        )
            .bind(portalId)
            .first<{ id: string; project_id: string }>();

        if (!portal) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Portal not found' },
                404
            );
        }

        const access = await verifyProjectAdmin(c.env.DB, portal.project_id, userId);
        if (!access) {
            return c.json(
                { success: false, error: 'Forbidden', message: 'Only project owners or admins can delete portals' },
                403
            );
        }

        await c.env.DB.prepare('DELETE FROM client_portals WHERE id = ?')
            .bind(portalId)
            .run();

        return c.json({ success: true, message: 'Portal deleted successfully' });
    } catch (error) {
        console.error('Delete portal error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to delete portal' },
            500
        );
    }
});

// ─── Public Portal Routes (token-based, NO JWT auth) ────────────────────────

const portalPublicRoutes = new Hono<{ Bindings: Env }>();

interface PortalRow {
    id: string;
    project_id: string;
    name: string;
    token: string;
    allowed_columns: string | null;
    branding: string | null;
    is_active: number;
    created_by: string;
    created_at: string;
    updated_at: string;
}

/** Look up an active portal by its public token. */
async function getPortalByToken(db: Env['DB'], token: string): Promise<PortalRow | null> {
    return db
        .prepare('SELECT * FROM client_portals WHERE token = ? AND is_active = 1')
        .bind(token)
        .first<PortalRow>();
}

// GET /:token – Get portal data with columns, tasks, branding
portalPublicRoutes.get('/:token', async (c) => {
    const token = c.req.param('token');

    try {
        const portal = await getPortalByToken(c.env.DB, token);
        if (!portal) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Portal not found or inactive' },
                404
            );
        }

        const allowedColumns: string[] | null = portal.allowed_columns
            ? JSON.parse(portal.allowed_columns)
            : null;

        // Fetch columns for the project
        let columns;
        if (allowedColumns && allowedColumns.length > 0) {
            const placeholders = allowedColumns.map(() => '?').join(', ');
            const { results } = await c.env.DB.prepare(
                `SELECT * FROM columns
                 WHERE project_id = ? AND id IN (${placeholders})
                 ORDER BY position`
            )
                .bind(portal.project_id, ...allowedColumns)
                .all();
            columns = results || [];
        } else {
            // No filter – return all columns
            const { results } = await c.env.DB.prepare(
                'SELECT * FROM columns WHERE project_id = ? ORDER BY position'
            )
                .bind(portal.project_id)
                .all();
            columns = results || [];
        }

        const columnIds = (columns as { id: string }[]).map((col) => col.id);

        let tasks: Record<string, unknown>[] = [];
        if (columnIds.length > 0) {
            const taskPlaceholders = columnIds.map(() => '?').join(', ');
            const { results } = await c.env.DB.prepare(
                `SELECT t.id, t.column_id, t.title, t.description, t.priority, t.position,
                        t.due_date, t.labels,
                        u.full_name AS assignee_name
                 FROM tasks t
                 LEFT JOIN users u ON t.assignee_id = u.id
                 WHERE t.project_id = ? AND t.column_id IN (${taskPlaceholders})
                       AND (t.is_archived = 0 OR t.is_archived IS NULL)
                 ORDER BY t.position`
            )
                .bind(portal.project_id, ...columnIds)
                .all();
            tasks = (results || []) as Record<string, unknown>[];
        }

        // Enrich tasks with subtask progress
        const taskIds = tasks.map((t) => t.id as string);
        const subtaskProgress: Record<string, { total: number; completed: number }> = {};

        if (taskIds.length > 0) {
            const stPlaceholders = taskIds.map(() => '?').join(', ');
            const { results: subtaskRows } = await c.env.DB.prepare(
                `SELECT task_id,
                        COUNT(*) AS total,
                        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) AS completed
                 FROM subtasks
                 WHERE task_id IN (${stPlaceholders})
                 GROUP BY task_id`
            )
                .bind(...taskIds)
                .all<{ task_id: string; total: number; completed: number }>();

            for (const row of subtaskRows || []) {
                subtaskProgress[row.task_id] = { total: row.total, completed: row.completed };
            }
        }

        const enrichedTasks = tasks.map((t) => ({
            ...t,
            subtask_progress: subtaskProgress[t.id as string] || { total: 0, completed: 0 },
        }));

        const branding = portal.branding ? JSON.parse(portal.branding) : null;

        return c.json({
            success: true,
            data: {
                portal: {
                    id: portal.id,
                    name: portal.name,
                    branding,
                },
                columns,
                tasks: enrichedTasks,
            },
        });
    } catch (error) {
        console.error('Get public portal error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch portal data' },
            500
        );
    }
});

// POST /:token/comments – Add a comment as a portal client
portalPublicRoutes.post('/:token/comments', async (c) => {
    const token = c.req.param('token');

    try {
        const portal = await getPortalByToken(c.env.DB, token);
        if (!portal) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Portal not found or inactive' },
                404
            );
        }

        const body = await c.req.json();
        const { task_id, author_name, author_email, content } = body;

        if (!task_id || !author_name || !author_email || !content) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'task_id, author_name, author_email, and content are required' },
                400
            );
        }

        // Validate that the task belongs to the portal's project and is in an allowed column
        const allowedColumns: string[] | null = portal.allowed_columns
            ? JSON.parse(portal.allowed_columns)
            : null;

        let task;
        if (allowedColumns && allowedColumns.length > 0) {
            const placeholders = allowedColumns.map(() => '?').join(', ');
            task = await c.env.DB.prepare(
                `SELECT t.id FROM tasks t
                 WHERE t.id = ? AND t.project_id = ? AND t.column_id IN (${placeholders})
                       AND (t.is_archived = 0 OR t.is_archived IS NULL)`
            )
                .bind(task_id, portal.project_id, ...allowedColumns)
                .first();
        } else {
            task = await c.env.DB.prepare(
                `SELECT t.id FROM tasks t
                 WHERE t.id = ? AND t.project_id = ?
                       AND (t.is_archived = 0 OR t.is_archived IS NULL)`
            )
                .bind(task_id, portal.project_id)
                .first();
        }

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or not accessible through this portal' },
                404
            );
        }

        const commentId = crypto.randomUUID();

        await c.env.DB.prepare(
            `INSERT INTO portal_comments (id, portal_id, task_id, author_name, author_email, content)
             VALUES (?, ?, ?, ?, ?, ?)`
        )
            .bind(commentId, portal.id, task_id, author_name.trim(), author_email.trim(), content.trim())
            .run();

        const comment = await c.env.DB.prepare('SELECT * FROM portal_comments WHERE id = ?')
            .bind(commentId)
            .first();

        return c.json({ success: true, data: { comment } }, 201);
    } catch (error) {
        console.error('Portal comment error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to add comment' },
            500
        );
    }
});

// POST /:token/approve/:taskId – Submit approval or revision request
portalPublicRoutes.post('/:token/approve/:taskId', async (c) => {
    const token = c.req.param('token');
    const taskId = c.req.param('taskId');

    try {
        const portal = await getPortalByToken(c.env.DB, token);
        if (!portal) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Portal not found or inactive' },
                404
            );
        }

        const body = await c.req.json();
        const { status, reviewer_name, note } = body;

        if (!status || !reviewer_name) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'status and reviewer_name are required' },
                400
            );
        }

        if (status !== 'approved' && status !== 'revision') {
            return c.json(
                { success: false, error: 'Validation Error', message: 'status must be "approved" or "revision"' },
                400
            );
        }

        // Validate task access through portal
        const allowedColumns: string[] | null = portal.allowed_columns
            ? JSON.parse(portal.allowed_columns)
            : null;

        let task;
        if (allowedColumns && allowedColumns.length > 0) {
            const placeholders = allowedColumns.map(() => '?').join(', ');
            task = await c.env.DB.prepare(
                `SELECT t.id FROM tasks t
                 WHERE t.id = ? AND t.project_id = ? AND t.column_id IN (${placeholders})
                       AND (t.is_archived = 0 OR t.is_archived IS NULL)`
            )
                .bind(taskId, portal.project_id, ...allowedColumns)
                .first();
        } else {
            task = await c.env.DB.prepare(
                `SELECT t.id FROM tasks t
                 WHERE t.id = ? AND t.project_id = ?
                       AND (t.is_archived = 0 OR t.is_archived IS NULL)`
            )
                .bind(taskId, portal.project_id)
                .first();
        }

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or not accessible through this portal' },
                404
            );
        }

        const approvalId = crypto.randomUUID();

        await c.env.DB.prepare(
            `INSERT INTO portal_approvals (id, portal_id, task_id, status, reviewer_name, note)
             VALUES (?, ?, ?, ?, ?, ?)`
        )
            .bind(approvalId, portal.id, taskId, status, reviewer_name.trim(), note ? note.trim() : null)
            .run();

        const approval = await c.env.DB.prepare('SELECT * FROM portal_approvals WHERE id = ?')
            .bind(approvalId)
            .first();

        const taskContext = await c.env.DB.prepare(
            `SELECT t.title, t.created_by, p.owner_id
             FROM tasks t
             JOIN projects p ON p.id = t.project_id
             WHERE t.id = ? AND p.id = ?`
        )
            .bind(taskId, portal.project_id)
            .first<{ title: string; created_by: string; owner_id: string }>();

        if (taskContext) {
            const type = status === 'approved'
                ? 'task_approval_approved'
                : 'task_approval_revision_requested';
            const title = status === 'approved' ? 'Task approved' : 'Revision requested';
            const message = status === 'approved'
                ? `${reviewer_name.trim()} approved "${taskContext.title}".`
                : `${reviewer_name.trim()} requested revision for "${taskContext.title}".`;
            const recipientIds = Array.from(new Set([taskContext.created_by, taskContext.owner_id].filter(Boolean)));

            await createBulkNotifications(
                c.env,
                recipientIds.map((recipientId) => ({
                    userId: recipientId,
                    type,
                    title,
                    message,
                    link: `/board?project=${portal.project_id}&task=${taskId}`,
                    metadata: {
                        task_id: taskId,
                        project_id: portal.project_id,
                        portal_id: portal.id,
                        approval_id: approvalId,
                        status,
                        reviewer_name: reviewer_name.trim(),
                    },
                }))
            );
        }

        return c.json({ success: true, data: { approval } }, 201);
    } catch (error) {
        console.error('Portal approval error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to submit approval' },
            500
        );
    }
});

export { portalManagementRoutes, portalPublicRoutes };
