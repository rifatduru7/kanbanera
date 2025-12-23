import { Hono } from 'hono';
import type { Env, Column } from '../types';
import { authMiddleware } from '../middleware/auth';

export const columnRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
columnRoutes.use('*', authMiddleware);

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
        const access = await c.env.DB.prepare(
            `SELECT p.id FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(project_id, userId, userId)
            .first();

        if (!access) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Project not found or access denied' },
                404
            );
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
            `SELECT c.* FROM columns c
       JOIN projects p ON c.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE c.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(columnId, userId, userId)
            .first<Column>();

        if (!column) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Column not found or access denied' },
                404
            );
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
            `SELECT c.* FROM columns c
       JOIN projects p ON c.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE c.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(columnId, userId, userId)
            .first<Column>();

        if (!column) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Column not found or access denied' },
                404
            );
        }

        const oldPosition = column.position;

        // Update positions
        if (position < oldPosition) {
            // Moving left: shift columns between new and old position right
            await c.env.DB.prepare(
                `UPDATE columns 
         SET position = position + 1 
         WHERE project_id = ? AND position >= ? AND position < ?`
            )
                .bind(column.project_id, position, oldPosition)
                .run();
        } else if (position > oldPosition) {
            // Moving right: shift columns between old and new position left
            await c.env.DB.prepare(
                `UPDATE columns 
         SET position = position - 1 
         WHERE project_id = ? AND position > ? AND position <= ?`
            )
                .bind(column.project_id, oldPosition, position)
                .run();
        }

        // Set new position
        await c.env.DB.prepare('UPDATE columns SET position = ? WHERE id = ?')
            .bind(position, columnId)
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
            `SELECT c.* FROM columns c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = ? AND p.owner_id = ?`
        )
            .bind(columnId, userId)
            .first<Column>();

        if (!column) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Column not found or not project owner' },
                404
            );
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
