import { Hono } from 'hono';
import type { Env, Project, Column } from '../types';
import { authMiddleware } from '../middleware/auth';

export const projectRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
projectRoutes.use('*', authMiddleware);

// GET /api/projects - List user's projects
projectRoutes.get('/', async (c) => {
    const userId = c.get('userId');

    try {
        const { results } = await c.env.DB.prepare(
            `SELECT p.*, 
              (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
              (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.owner_id = ? OR pm.user_id = ?
       GROUP BY p.id
       ORDER BY p.updated_at DESC`
        )
            .bind(userId, userId)
            .all<Project & { task_count: number; member_count: number }>();

        return c.json({
            success: true,
            data: { projects: results || [] },
        });
    } catch (error) {
        console.error('Get projects error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch projects' },
            500
        );
    }
});

// POST /api/projects - Create new project
projectRoutes.post('/', async (c) => {
    const userId = c.get('userId');

    try {
        const body = await c.req.json();
        const { name, description } = body;

        if (!name || name.trim().length === 0) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Project name is required' },
                400
            );
        }

        const projectId = crypto.randomUUID();

        // Create project
        await c.env.DB.prepare(
            `INSERT INTO projects (id, name, description, owner_id)
       VALUES (?, ?, ?, ?)`
        )
            .bind(projectId, name.trim(), description || null, userId)
            .run();

        // Add owner as project member
        await c.env.DB.prepare(
            `INSERT INTO project_members (id, project_id, user_id, role)
       VALUES (?, ?, ?, 'owner')`
        )
            .bind(crypto.randomUUID(), projectId, userId)
            .run();

        // Create default columns
        const defaultColumns = [
            { name: 'To Do', color: '#6366f1', position: 0 },
            { name: 'In Progress', color: '#0d9488', position: 1 },
            { name: 'In Review', color: '#8b5cf6', position: 2 },
            { name: 'Done', color: '#22c55e', position: 3 },
        ];

        for (const col of defaultColumns) {
            await c.env.DB.prepare(
                `INSERT INTO columns (id, project_id, name, position, color)
         VALUES (?, ?, ?, ?, ?)`
            )
                .bind(crypto.randomUUID(), projectId, col.name, col.position, col.color)
                .run();
        }

        // Fetch created project with columns
        const project = await c.env.DB.prepare(
            'SELECT * FROM projects WHERE id = ?'
        )
            .bind(projectId)
            .first<Project>();

        const { results: columns } = await c.env.DB.prepare(
            'SELECT * FROM columns WHERE project_id = ? ORDER BY position'
        )
            .bind(projectId)
            .all<Column>();

        return c.json({
            success: true,
            data: {
                project: {
                    ...project,
                    columns: columns || [],
                },
            },
        }, 201);
    } catch (error) {
        console.error('Create project error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to create project' },
            500
        );
    }
});

// GET /api/projects/:id - Get project with full board data
projectRoutes.get('/:id', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');

    try {
        // Check access
        const access = await c.env.DB.prepare(
            `SELECT p.* FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(projectId, userId, userId)
            .first<Project>();

        if (!access) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Project not found or access denied' },
                404
            );
        }

        // Get columns
        const { results: columns } = await c.env.DB.prepare(
            'SELECT * FROM columns WHERE project_id = ? ORDER BY position'
        )
            .bind(projectId)
            .all<Column>();

        // Get tasks with assignee info
        const { results: tasks } = await c.env.DB.prepare(
            `SELECT t.*, u.full_name as assignee_name, u.avatar_url as assignee_avatar
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.project_id = ?
       ORDER BY t.position`
        )
            .bind(projectId)
            .all();

        // Get project members
        const { results: members } = await c.env.DB.prepare(
            `SELECT pm.*, u.full_name, u.email, u.avatar_url
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ?`
        )
            .bind(projectId)
            .all();

        return c.json({
            success: true,
            data: {
                project: access,
                columns: columns || [],
                tasks: tasks || [],
                members: members || [],
            },
        });
    } catch (error) {
        console.error('Get project error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch project' },
            500
        );
    }
});

// PUT /api/projects/:id - Update project
projectRoutes.put('/:id', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');

    try {
        // Check ownership
        const project = await c.env.DB.prepare(
            'SELECT * FROM projects WHERE id = ? AND owner_id = ?'
        )
            .bind(projectId, userId)
            .first<Project>();

        if (!project) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Project not found or not owner' },
                404
            );
        }

        const body = await c.req.json();
        const { name, description, is_archived } = body;

        await c.env.DB.prepare(
            `UPDATE projects 
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           is_archived = COALESCE(?, is_archived),
           updated_at = datetime('now')
       WHERE id = ?`
        )
            .bind(name, description, is_archived, projectId)
            .run();

        const updatedProject = await c.env.DB.prepare(
            'SELECT * FROM projects WHERE id = ?'
        )
            .bind(projectId)
            .first<Project>();

        return c.json({
            success: true,
            data: { project: updatedProject },
        });
    } catch (error) {
        console.error('Update project error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to update project' },
            500
        );
    }
});

// DELETE /api/projects/:id - Delete project
projectRoutes.delete('/:id', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');

    try {
        // Check ownership
        const project = await c.env.DB.prepare(
            'SELECT * FROM projects WHERE id = ? AND owner_id = ?'
        )
            .bind(projectId, userId)
            .first<Project>();

        if (!project) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Project not found or not owner' },
                404
            );
        }

        // Delete project (cascades to columns, tasks, etc.)
        await c.env.DB.prepare('DELETE FROM projects WHERE id = ?')
            .bind(projectId)
            .run();

        return c.json({
            success: true,
            message: 'Project deleted successfully',
        });
    } catch (error) {
        console.error('Delete project error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to delete project' },
            500
        );
    }
});
