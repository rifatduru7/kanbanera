import { Hono } from 'hono';
import type { Env, Task, Subtask, Comment } from '../types';
import { authMiddleware } from '../middleware/auth';

export const taskRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
taskRoutes.use('*', authMiddleware);

// GET /api/tasks/calendar - Get tasks by date range for calendar view
taskRoutes.get('/calendar', async (c) => {
    const userId = c.get('userId');
    const from = c.req.query('from');
    const to = c.req.query('to');

    try {
        let query = `
            SELECT t.*, c.name as column_name, p.name as project_name
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            JOIN columns c ON t.column_id = c.id
            LEFT JOIN project_members pm ON p.id = pm.project_id
            WHERE (p.owner_id = ? OR pm.user_id = ?)
            AND t.due_date IS NOT NULL
        `;
        const params: (string | null)[] = [userId, userId];

        if (from) {
            query += ' AND t.due_date >= ?';
            params.push(from);
        }
        if (to) {
            query += ' AND t.due_date <= ?';
            params.push(to);
        }

        query += ' ORDER BY t.due_date ASC';

        const { results: tasks } = await c.env.DB.prepare(query)
            .bind(...params)
            .all();

        return c.json({
            success: true,
            data: {
                tasks: tasks?.map((t: Record<string, unknown>) => ({
                    id: t.id,
                    title: t.title,
                    dueDate: t.due_date,
                    priority: t.priority,
                    projectId: t.project_id,
                    projectName: t.project_name,
                    columnName: t.column_name,
                    labels: t.labels ? JSON.parse(t.labels as string) : [],
                })) || [],
            },
        });
    } catch (error) {
        console.error('Get calendar tasks error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch calendar tasks' },
            500
        );
    }
});

// POST /api/tasks - Create task
taskRoutes.post('/', async (c) => {
    const userId = c.get('userId');

    try {
        const body = await c.req.json();
        const { project_id, column_id, title, description, priority, assignee_id, due_date, labels } = body;

        if (!project_id || !column_id || !title) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'project_id, column_id, and title are required' },
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

        // Get max position in column
        const maxPos = await c.env.DB.prepare(
            'SELECT MAX(position) as max_pos FROM tasks WHERE column_id = ?'
        )
            .bind(column_id)
            .first<{ max_pos: number | null }>();

        const position = (maxPos?.max_pos ?? -1) + 1;
        const taskId = crypto.randomUUID();

        await c.env.DB.prepare(
            `INSERT INTO tasks (id, project_id, column_id, title, description, priority, position, assignee_id, due_date, labels, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
            .bind(
                taskId,
                project_id,
                column_id,
                title.trim(),
                description || null,
                priority || 'medium',
                position,
                assignee_id || null,
                due_date || null,
                labels ? JSON.stringify(labels) : null,
                userId
            )
            .run();

        // Log activity
        await c.env.DB.prepare(
            `INSERT INTO activity_log (id, project_id, task_id, user_id, action, details)
       VALUES (?, ?, ?, ?, 'task_created', ?)`
        )
            .bind(crypto.randomUUID(), project_id, taskId, userId, JSON.stringify({ title }))
            .run();

        const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
            .bind(taskId)
            .first<Task>();

        return c.json({
            success: true,
            data: { task },
        }, 201);
    } catch (error) {
        console.error('Create task error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to create task' },
            500
        );
    }
});

// GET /api/tasks/:id - Get task with details
taskRoutes.get('/:id', async (c) => {
    const userId = c.get('userId');
    const taskId = c.req.param('id');

    try {
        // Get task with access check
        const task = await c.env.DB.prepare(
            `SELECT t.*, u.full_name as assignee_name, u.avatar_url as assignee_avatar
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE t.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(taskId, userId, userId)
            .first();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or access denied' },
                404
            );
        }

        // Get subtasks
        const { results: subtasks } = await c.env.DB.prepare(
            'SELECT * FROM subtasks WHERE task_id = ? ORDER BY position'
        )
            .bind(taskId)
            .all<Subtask>();

        // Get comments with user info
        const { results: comments } = await c.env.DB.prepare(
            `SELECT c.*, u.full_name, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = ?
       ORDER BY c.created_at DESC`
        )
            .bind(taskId)
            .all();

        // Get attachments
        const { results: attachments } = await c.env.DB.prepare(
            'SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at DESC'
        )
            .bind(taskId)
            .all();

        return c.json({
            success: true,
            data: {
                task: {
                    ...task,
                    subtasks: subtasks || [],
                    comments: comments || [],
                    attachments: attachments || [],
                },
            },
        });
    } catch (error) {
        console.error('Get task error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch task' },
            500
        );
    }
});

// PUT /api/tasks/:id - Update task
taskRoutes.put('/:id', async (c) => {
    const userId = c.get('userId');
    const taskId = c.req.param('id');

    try {
        // Check access
        const task = await c.env.DB.prepare(
            `SELECT t.* FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE t.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(taskId, userId, userId)
            .first<Task>();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or access denied' },
                404
            );
        }

        const body = await c.req.json();
        const { title, description, priority, assignee_id, due_date, labels } = body;

        await c.env.DB.prepare(
            `UPDATE tasks 
       SET title = COALESCE(?, title),
           description = ?,
           priority = COALESCE(?, priority),
           assignee_id = ?,
           due_date = ?,
           labels = ?,
           updated_at = datetime('now')
       WHERE id = ?`
        )
            .bind(
                title,
                description ?? task.description,
                priority,
                assignee_id ?? null,
                due_date ?? null,
                labels ? JSON.stringify(labels) : task.labels,
                taskId
            )
            .run();

        // Log activity
        await c.env.DB.prepare(
            `INSERT INTO activity_log (id, project_id, task_id, user_id, action, details)
       VALUES (?, ?, ?, ?, 'task_updated', ?)`
        )
            .bind(crypto.randomUUID(), task.project_id, taskId, userId, JSON.stringify({ changes: Object.keys(body) }))
            .run();

        const updatedTask = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
            .bind(taskId)
            .first<Task>();

        return c.json({
            success: true,
            data: { task: updatedTask },
        });
    } catch (error) {
        console.error('Update task error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to update task' },
            500
        );
    }
});

// PUT /api/tasks/:id/move - Move task between columns (Optimistic Update endpoint)
taskRoutes.put('/:id/move', async (c) => {
    const userId = c.get('userId');
    const taskId = c.req.param('id');

    try {
        const body = await c.req.json();
        const { column_id, position } = body;

        if (!column_id || typeof position !== 'number') {
            return c.json(
                { success: false, error: 'Validation Error', message: 'column_id and position are required' },
                400
            );
        }

        // Check access
        const task = await c.env.DB.prepare(
            `SELECT t.* FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE t.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(taskId, userId, userId)
            .first<Task>();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or access denied' },
                404
            );
        }

        const oldColumnId = task.column_id;
        const oldPosition = task.position;

        // If moving to a different column
        if (column_id !== oldColumnId) {
            // Shift tasks in old column
            await c.env.DB.prepare(
                `UPDATE tasks SET position = position - 1 
         WHERE column_id = ? AND position > ?`
            )
                .bind(oldColumnId, oldPosition)
                .run();

            // Shift tasks in new column
            await c.env.DB.prepare(
                `UPDATE tasks SET position = position + 1 
         WHERE column_id = ? AND position >= ?`
            )
                .bind(column_id, position)
                .run();
        } else {
            // Same column, reorder
            if (position < oldPosition) {
                await c.env.DB.prepare(
                    `UPDATE tasks SET position = position + 1 
           WHERE column_id = ? AND position >= ? AND position < ?`
                )
                    .bind(column_id, position, oldPosition)
                    .run();
            } else if (position > oldPosition) {
                await c.env.DB.prepare(
                    `UPDATE tasks SET position = position - 1 
           WHERE column_id = ? AND position > ? AND position <= ?`
                )
                    .bind(column_id, oldPosition, position)
                    .run();
            }
        }

        // Update task position and column
        await c.env.DB.prepare(
            `UPDATE tasks SET column_id = ?, position = ?, updated_at = datetime('now') WHERE id = ?`
        )
            .bind(column_id, position, taskId)
            .run();

        // Log activity
        await c.env.DB.prepare(
            `INSERT INTO activity_log (id, project_id, task_id, user_id, action, details)
       VALUES (?, ?, ?, ?, 'task_moved', ?)`
        )
            .bind(
                crypto.randomUUID(),
                task.project_id,
                taskId,
                userId,
                JSON.stringify({ from_column: oldColumnId, to_column: column_id, position })
            )
            .run();

        return c.json({
            success: true,
            message: 'Task moved successfully',
        });
    } catch (error) {
        console.error('Move task error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to move task' },
            500
        );
    }
});

// DELETE /api/tasks/:id - Delete task
taskRoutes.delete('/:id', async (c) => {
    const userId = c.get('userId');
    const taskId = c.req.param('id');

    try {
        // Check access
        const task = await c.env.DB.prepare(
            `SELECT t.* FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE t.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(taskId, userId, userId)
            .first<Task>();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or access denied' },
                404
            );
        }

        // Delete task (cascades to subtasks, comments, attachments)
        await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?')
            .bind(taskId)
            .run();

        // Reorder remaining tasks in column
        await c.env.DB.prepare(
            `UPDATE tasks SET position = position - 1 
       WHERE column_id = ? AND position > ?`
        )
            .bind(task.column_id, task.position)
            .run();

        return c.json({
            success: true,
            message: 'Task deleted successfully',
        });
    } catch (error) {
        console.error('Delete task error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to delete task' },
            500
        );
    }
});

// --- Subtasks ---

// POST /api/tasks/:id/subtasks - Add subtask
taskRoutes.post('/:id/subtasks', async (c) => {
    const userId = c.get('userId');
    const taskId = c.req.param('id');

    try {
        const body = await c.req.json();
        const { title } = body;

        if (!title) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'title is required' },
                400
            );
        }

        // Check access
        const task = await c.env.DB.prepare(
            `SELECT t.* FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE t.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(taskId, userId, userId)
            .first<Task>();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or access denied' },
                404
            );
        }

        // Get max position
        const maxPos = await c.env.DB.prepare(
            'SELECT MAX(position) as max_pos FROM subtasks WHERE task_id = ?'
        )
            .bind(taskId)
            .first<{ max_pos: number | null }>();

        const position = (maxPos?.max_pos ?? -1) + 1;
        const subtaskId = crypto.randomUUID();

        await c.env.DB.prepare(
            `INSERT INTO subtasks (id, task_id, title, position)
       VALUES (?, ?, ?, ?)`
        )
            .bind(subtaskId, taskId, title.trim(), position)
            .run();

        const subtask = await c.env.DB.prepare('SELECT * FROM subtasks WHERE id = ?')
            .bind(subtaskId)
            .first<Subtask>();

        return c.json({
            success: true,
            data: { subtask },
        }, 201);
    } catch (error) {
        console.error('Create subtask error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to create subtask' },
            500
        );
    }
});

// PUT /api/tasks/:id/subtasks/:subtaskId - Update subtask
taskRoutes.put('/:id/subtasks/:subtaskId', async (c) => {
    const userId = c.get('userId');
    const taskId = c.req.param('id');
    const subtaskId = c.req.param('subtaskId');

    try {
        // Check access
        const task = await c.env.DB.prepare(
            `SELECT t.* FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE t.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(taskId, userId, userId)
            .first<Task>();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or access denied' },
                404
            );
        }

        const body = await c.req.json();
        const { title, is_completed } = body;

        await c.env.DB.prepare(
            `UPDATE subtasks 
       SET title = COALESCE(?, title),
           is_completed = COALESCE(?, is_completed)
       WHERE id = ? AND task_id = ?`
        )
            .bind(title, is_completed, subtaskId, taskId)
            .run();

        const subtask = await c.env.DB.prepare('SELECT * FROM subtasks WHERE id = ?')
            .bind(subtaskId)
            .first<Subtask>();

        return c.json({
            success: true,
            data: { subtask },
        });
    } catch (error) {
        console.error('Update subtask error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to update subtask' },
            500
        );
    }
});

// DELETE /api/tasks/:id/subtasks/:subtaskId - Delete subtask
taskRoutes.delete('/:id/subtasks/:subtaskId', async (c) => {
    const userId = c.get('userId');
    const taskId = c.req.param('id');
    const subtaskId = c.req.param('subtaskId');

    try {
        // Check access
        const task = await c.env.DB.prepare(
            `SELECT t.* FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE t.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(taskId, userId, userId)
            .first<Task>();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or access denied' },
                404
            );
        }

        await c.env.DB.prepare('DELETE FROM subtasks WHERE id = ? AND task_id = ?')
            .bind(subtaskId, taskId)
            .run();

        return c.json({
            success: true,
            message: 'Subtask deleted successfully',
        });
    } catch (error) {
        console.error('Delete subtask error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to delete subtask' },
            500
        );
    }
});

// --- Comments ---

// POST /api/tasks/:id/comments - Add comment
taskRoutes.post('/:id/comments', async (c) => {
    const userId = c.get('userId');
    const taskId = c.req.param('id');

    try {
        const body = await c.req.json();
        const { content } = body;

        if (!content) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'content is required' },
                400
            );
        }

        // Check access
        const task = await c.env.DB.prepare(
            `SELECT t.* FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE t.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(taskId, userId, userId)
            .first<Task>();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or access denied' },
                404
            );
        }

        const commentId = crypto.randomUUID();

        await c.env.DB.prepare(
            `INSERT INTO comments (id, task_id, user_id, content)
       VALUES (?, ?, ?, ?)`
        )
            .bind(commentId, taskId, userId, content.trim())
            .run();

        // Log activity
        await c.env.DB.prepare(
            `INSERT INTO activity_log (id, project_id, task_id, user_id, action, details)
       VALUES (?, ?, ?, ?, 'comment_added', ?)`
        )
            .bind(crypto.randomUUID(), task.project_id, taskId, userId, JSON.stringify({ comment_id: commentId }))
            .run();

        // Get comment with user info
        const comment = await c.env.DB.prepare(
            `SELECT c.*, u.full_name, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`
        )
            .bind(commentId)
            .first();

        return c.json({
            success: true,
            data: { comment },
        }, 201);
    } catch (error) {
        console.error('Create comment error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to create comment' },
            500
        );
    }
});

// DELETE /api/tasks/:id/comments/:commentId - Delete comment
taskRoutes.delete('/:id/comments/:commentId', async (c) => {
    const userId = c.get('userId');
    const commentId = c.req.param('commentId');

    try {
        // Check ownership
        const comment = await c.env.DB.prepare(
            'SELECT * FROM comments WHERE id = ? AND user_id = ?'
        )
            .bind(commentId, userId)
            .first<Comment>();

        if (!comment) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Comment not found or not owner' },
                404
            );
        }

        await c.env.DB.prepare('DELETE FROM comments WHERE id = ?')
            .bind(commentId)
            .run();

        return c.json({
            success: true,
            message: 'Comment deleted successfully',
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to delete comment' },
            500
        );
    }
});
