import { Hono } from 'hono';
import type { Env, Column } from '../types';
import { authMiddleware } from '../middleware/auth';

export const columnRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
columnRoutes.use('*', authMiddleware);

type ProjectColumnAccess = {
    id: string;
    owner_id: string;
    role: 'owner' | 'admin' | 'member' | 'viewer' | null;
};

async function getProjectAccess(env: Env, projectId: string, userId: string) {
    return env.DB.prepare(
        `SELECT p.id, p.owner_id, pm.role FROM projects p
         LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
         WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
    )
        .bind(userId, projectId, userId, userId)
        .first<ProjectColumnAccess>();
}

// POST /api/columns - Create column
columnRoutes.post('/', async (c) => {
    const userId = c.get('userId');

    try {
        const body = await c.req.json();
        const { project_id, name, wip_limit, color } = body;

        if (!project_id || !name) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'project_id and name are required' },
                400
            );
        }

        // Check project access
        const access = await getProjectAccess(c.env, project_id, userId);

        if (!access) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Project not found or access denied' },
                404
            );
        }

        if (access.owner_id !== userId && access.role !== 'admin') {
            return c.json({ success: false, error: 'Forbidden', message: 'Only admins or owners can create columns' }, 403);
        }

        // Get max position
        const maxPos = await c.env.DB.prepare(
            'SELECT MAX(position) as max_pos FROM columns WHERE project_id = ?'
        )
            .bind(project_id)
            .first<{ max_pos: number | null }>();

        const position = (maxPos?.max_pos ?? -1) + 1;
        const columnId = crypto.randomUUID();

        await c.env.DB.prepare(
            `INSERT INTO columns (id, project_id, name, position, wip_limit, color)
       VALUES (?, ?, ?, ?, ?, ?)`
        )
            .bind(columnId, project_id, name.trim(), position, wip_limit || null, color || '#6366f1')
            .run();

        const column = await c.env.DB.prepare('SELECT * FROM columns WHERE id = ?')
            .bind(columnId)
            .first<Column>();

        return c.json({
            success: true,
            data: { column },
        }, 201);
    } catch (error) {
        console.error('Create column error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to create column' },
            500
        );
    }
});

// PUT /api/columns/:id - Update column
columnRoutes.put('/:id', async (c) => {
    const userId = c.get('userId');
    const columnId = c.req.param('id');

    try {
        // Check access
        const column = await c.env.DB.prepare(
            `SELECT c.*, p.owner_id, pm.role FROM columns c
       JOIN projects p ON c.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
       WHERE c.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(userId, columnId, userId, userId)
            .first<Column & { owner_id: string; role: string | null }>();

        if (!column) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Column not found or access denied' },
                404
            );
        }

        if (column.owner_id !== userId && column.role !== 'admin') {
            return c.json({ success: false, error: 'Forbidden', message: 'Only admins or owners can modify columns' }, 403);
        }

        const body = await c.req.json();
        const { name, wip_limit, color } = body;

        await c.env.DB.prepare(
            `UPDATE columns 
       SET name = COALESCE(?, name),
           wip_limit = ?,
           color = COALESCE(?, color)
       WHERE id = ?`
        )
            .bind(name, wip_limit ?? null, color, columnId)
            .run();

        const updatedColumn = await c.env.DB.prepare('SELECT * FROM columns WHERE id = ?')
            .bind(columnId)
            .first<Column>();

        return c.json({
            success: true,
            data: { column: updatedColumn },
        });
    } catch (error) {
        console.error('Update column error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to update column' },
            500
        );
    }
});

// POST /api/columns/reorder - Bulk reorder columns
columnRoutes.post('/reorder', async (c) => {
    const userId = c.get('userId');

    try {
        const body = await c.req.json<{ project_id?: string; column_ids?: string[] }>();
        const projectId = body.project_id || '';
        const columnIds = Array.isArray(body.column_ids) ? body.column_ids : [];

        if (!projectId || columnIds.length === 0) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'project_id and column_ids are required' },
                400
            );
        }

        if (new Set(columnIds).size !== columnIds.length) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'column_ids must be unique' },
                400
            );
        }

        const access = await getProjectAccess(c.env, projectId, userId);
        if (!access) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Project not found or access denied' },
                404
            );
        }

        if (access.owner_id !== userId && access.role !== 'admin') {
            return c.json({ success: false, error: 'Forbidden', message: 'Only admins or owners can reorder columns' }, 403);
        }

        const { results: projectColumns } = await c.env.DB.prepare(
            'SELECT id FROM columns WHERE project_id = ? ORDER BY position'
        )
            .bind(projectId)
            .all<{ id: string }>();

        if ((projectColumns || []).length !== columnIds.length) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'column_ids must include every column in the project exactly once' },
                400
            );
        }

        const projectColumnIds = new Set((projectColumns || []).map((column) => column.id));
        if (!columnIds.every((id) => projectColumnIds.has(id))) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'All column_ids must belong to the project' },
                400
            );
        }

        await c.env.DB.batch(
            columnIds.map((id, index) =>
                c.env.DB.prepare(
                    'UPDATE columns SET position = ? WHERE id = ? AND project_id = ?'
                ).bind(index, id, projectId)
            )
        );

        const { results: columns } = await c.env.DB.prepare(
            'SELECT * FROM columns WHERE project_id = ? ORDER BY position'
        )
            .bind(projectId)
            .all<Column>();

        return c.json({
            success: true,
            data: { columns: columns || [] },
        });
    } catch (error) {
        console.error('Bulk reorder columns error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to reorder columns' },
            500
        );
    }
});

// PUT /api/columns/:id/reorder - Reorder columns
columnRoutes.put('/:id/reorder', async (c) => {
    const userId = c.get('userId');
    const columnId = c.req.param('id');

    try {
        const body = await c.req.json();
        const { position } = body;

        if (typeof position !== 'number') {
            return c.json(
                { success: false, error: 'Validation Error', message: 'position is required' },
                400
            );
        }

        // Check access and get column
        const column = await c.env.DB.prepare(
            `SELECT c.*, p.owner_id, pm.role FROM columns c
             JOIN projects p ON c.project_id = p.id
             LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
             WHERE c.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(userId, columnId, userId, userId)
            .first<Column & { owner_id: string; role: string | null }>();

        if (!column) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Column not found or access denied' },
                404
            );
        }

        if (column.owner_id !== userId && column.role !== 'admin') {
            return c.json({ success: false, error: 'Forbidden', message: 'Only admins or owners can reorder columns' }, 403);
        }

        const oldPosition = column.position;
        const maxPositionResult = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM columns WHERE project_id = ?'
        )
            .bind(column.project_id)
            .first<{ count: number }>();
        const maxPosition = Math.max(0, (maxPositionResult?.count ?? 1) - 1);
        const nextPosition = Math.min(Math.max(position, 0), maxPosition);

        // Update positions
        if (nextPosition < oldPosition) {
            // Moving left: shift columns between new and old position right
            await c.env.DB.prepare(
                `UPDATE columns 
         SET position = position + 1 
         WHERE project_id = ? AND position >= ? AND position < ?`
            )
                .bind(column.project_id, nextPosition, oldPosition)
                .run();
        } else if (nextPosition > oldPosition) {
            // Moving right: shift columns between old and new position left
            await c.env.DB.prepare(
                `UPDATE columns 
         SET position = position - 1 
         WHERE project_id = ? AND position > ? AND position <= ?`
            )
                .bind(column.project_id, oldPosition, nextPosition)
                .run();
        }

        // Set new position
        await c.env.DB.prepare('UPDATE columns SET position = ? WHERE id = ?')
            .bind(nextPosition, columnId)
            .run();

        // Get updated columns
        const { results: columns } = await c.env.DB.prepare(
            'SELECT * FROM columns WHERE project_id = ? ORDER BY position'
        )
            .bind(column.project_id)
            .all<Column>();

        return c.json({
            success: true,
            data: { columns: columns || [] },
        });
    } catch (error) {
        console.error('Reorder column error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to reorder column' },
            500
        );
    }
});

// DELETE /api/columns/:id - Delete column
columnRoutes.delete('/:id', async (c) => {
    const userId = c.get('userId');
    const columnId = c.req.param('id');

    try {
        // Check access and ownership
        const column = await c.env.DB.prepare(
            `SELECT c.*, p.owner_id, pm.role FROM columns c
       JOIN projects p ON c.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
       WHERE c.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(userId, columnId, userId, userId)
            .first<Column & { owner_id: string; role: string | null }>();

        if (!column) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Column not found or access denied' },
                404
            );
        }

        if (column.owner_id !== userId && column.role !== 'admin') {
            return c.json({ success: false, error: 'Forbidden', message: 'Only admins or owners can delete columns' }, 403);
        }

        // Check if column has tasks
        const taskCount = await c.env.DB.prepare(
            'SELECT COUNT(*) as count FROM tasks WHERE column_id = ?'
        )
            .bind(columnId)
            .first<{ count: number }>();

        if (taskCount && taskCount.count > 0) {
            return c.json(
                { success: false, error: 'Conflict', message: 'Cannot delete column with tasks. Move or delete tasks first.' },
                409
            );
        }

        // Delete column
        await c.env.DB.prepare('DELETE FROM columns WHERE id = ?')
            .bind(columnId)
            .run();

        // Reorder remaining columns
        await c.env.DB.prepare(
            `UPDATE columns 
       SET position = position - 1 
       WHERE project_id = ? AND position > ?`
        )
            .bind(column.project_id, column.position)
            .run();

        return c.json({
            success: true,
            message: 'Column deleted successfully',
        });
    } catch (error) {
        console.error('Delete column error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to delete column' },
            500
        );
    }
});
