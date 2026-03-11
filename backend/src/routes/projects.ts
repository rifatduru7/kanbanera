import { Hono } from 'hono';
import type { Env, Project, Column } from '../types';
import { authMiddleware } from '../middleware/auth';

export const projectRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
projectRoutes.use('*', authMiddleware);

interface IntegrationRow {
    id: string;
    name: string;
    webhook_url: string;
    is_active: number;
}

const PROJECT_COLOR_PALETTE = new Set([
    '#14b8a6',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
]);

function normalizeProjectColor(input: unknown): string {
    if (typeof input !== 'string') return '#14b8a6';
    const normalized = input.trim().toLowerCase();
    if (!PROJECT_COLOR_PALETTE.has(normalized)) {
        return '#14b8a6';
    }
    return normalized;
}

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
        const { name, description, color } = body;

        if (!name || name.trim().length === 0) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Project name is required' },
                400
            );
        }

        const projectColor = normalizeProjectColor(color);

        const projectId = crypto.randomUUID();

        // Create project
        await c.env.DB.prepare(
            `INSERT INTO projects (id, name, description, owner_id, color)
       VALUES (?, ?, ?, ?, ?)`
        )
            .bind(projectId, name.trim(), description || null, userId, projectColor)
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

// GET /api/projects/:id/columns - Get project columns only
projectRoutes.get('/:id/columns', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');

    try {
        // Check access
        const access = await c.env.DB.prepare(
            `SELECT p.id FROM projects p
             LEFT JOIN project_members pm ON p.id = pm.project_id
             WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(projectId, userId, userId)
            .first();

        if (!access) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Project not found or access denied' },
                404
            );
        }

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
        console.error('Get project columns error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch columns' },
            500
        );
    }
});

// PUT /api/projects/:id - Update project
projectRoutes.put('/:id', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');

    try {
        // Check access: only owner or admin can update project settings
        const access = await c.env.DB.prepare(
            `SELECT p.id, p.owner_id, pm.role 
             FROM projects p
             LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
             WHERE p.id = ? AND (p.owner_id = ? OR pm.role IN ('owner', 'admin'))`
        )
            .bind(userId, projectId, userId)
            .first<{ id: string; owner_id: string; role: string | null }>();

        if (!access) {
            return c.json(
                { success: false, error: 'Forbidden', message: 'Only admins or owners can update project settings' },
                403
            );
        }

        const body = await c.req.json();
        const { name, description, is_archived, color } = body;
        let nextColor: string | null = null;

        if (color !== undefined) {
            if (typeof color !== 'string' || !PROJECT_COLOR_PALETTE.has(color.trim().toLowerCase())) {
                return c.json(
                    { success: false, error: 'Validation Error', message: 'Invalid project color' },
                    400
                );
            }
            nextColor = color.trim().toLowerCase();
        }

        await c.env.DB.prepare(
            `UPDATE projects 
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           is_archived = COALESCE(?, is_archived),
           color = COALESCE(?, color),
           updated_at = datetime('now')
       WHERE id = ?`
        )
            .bind(name, description, is_archived, nextColor, projectId)
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

// POST /api/projects/:id/members - Add a member to project
projectRoutes.post('/:id/members', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');

    try {
        const body = await c.req.json();
        const { email, role } = body;

        if (!email || !email.trim()) {
            return c.json({ success: false, error: 'Validation Error', message: 'Email is required' }, 400);
        }

        // Check access: only owner or admin can invite members
        const access = await c.env.DB.prepare(
            `SELECT p.id, p.owner_id, pm.role 
             FROM projects p
             LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
             WHERE p.id = ? AND (p.owner_id = ? OR pm.role IN ('owner', 'admin'))`
        )
            .bind(userId, projectId, userId)
            .first<{ id: string; owner_id: string; role: string | null }>();

        if (!access) {
            return c.json({ success: false, error: 'Forbidden', message: 'Only admins or owners can add members' }, 403);
        }

        // Find user by email
        const targetUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
            .bind(email.trim())
            .first<{ id: string }>();

        if (!targetUser) {
            return c.json({ success: false, error: 'Not Found', message: 'User not found with this email' }, 404);
        }

        if (targetUser.id === access.owner_id) {
            return c.json({ success: false, error: 'Bad Request', message: 'Cannot add the project owner as a member' }, 400);
        }

        // Check if already a member
        const existingMember = await c.env.DB.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?')
            .bind(projectId, targetUser.id)
            .first();

        if (existingMember) {
            return c.json({ success: false, error: 'Conflict', message: 'User is already a member of this project' }, 409);
        }

        const validRoles = ['admin', 'member', 'viewer'];
        const assignedRole = validRoles.includes(role) ? role : 'member';

        // Add member
        await c.env.DB.prepare(
            `INSERT INTO project_members (id, project_id, user_id, role)
             VALUES (?, ?, ?, ?)`
        )
            .bind(crypto.randomUUID(), projectId, targetUser.id, assignedRole)
            .run();

        await c.env.DB.prepare(
            `INSERT INTO activity_log (id, project_id, user_id, action, details)
             VALUES (?, ?, ?, 'member_added', ?)`
        )
            .bind(
                crypto.randomUUID(),
                projectId,
                userId,
                JSON.stringify({ target_user_id: targetUser.id, role: assignedRole })
            )
            .run();

        const projectQuery = await c.env.DB.prepare('SELECT name FROM projects WHERE id = ?').bind(projectId).first<{ name: string }>();
        await c.env.DB.prepare(
            `INSERT INTO notifications (id, user_id, type, title, message, link, metadata)
             VALUES (?, ?, 'project_invite', ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), targetUser.id, 'project_invite', `You have been added to the project: ${projectQuery?.name || 'Unknown'}`, `/projects/${projectId}`, JSON.stringify({ project_id: projectId, role: assignedRole })).run();

        // Fetch newly added member details
        const member = await c.env.DB.prepare(
            `SELECT pm.*, u.full_name, u.email, u.avatar_url
             FROM project_members pm
             JOIN users u ON pm.user_id = u.id
             WHERE pm.project_id = ? AND pm.user_id = ?`
        )
            .bind(projectId, targetUser.id)
            .first();

        return c.json({ success: true, data: { member } }, 201);
    } catch (error) {
        console.error('Add member error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to add member' }, 500);
    }
});

// PUT /api/projects/:id/members/:userId - Update member role
projectRoutes.put('/:id/members/:targetUserId', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');
    const targetUserId = c.req.param('targetUserId');

    try {
        const body = await c.req.json();
        const { role } = body;

        const validRoles = ['admin', 'member', 'viewer'];
        if (!validRoles.includes(role)) {
            return c.json({ success: false, error: 'Validation Error', message: 'Invalid role specified' }, 400);
        }

        // Check access: only owner or admin can update roles
        const access = await c.env.DB.prepare(
            `SELECT p.id, p.owner_id, pm.role 
             FROM projects p
             LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
             WHERE p.id = ? AND (p.owner_id = ? OR pm.role IN ('owner', 'admin'))`
        )
            .bind(userId, projectId, userId)
            .first<{ id: string; owner_id: string; role: string | null }>();

        if (!access) {
            return c.json({ success: false, error: 'Forbidden', message: 'Only admins or owners can update member roles' }, 403);
        }

        // Cannot modify owner's role
        if (targetUserId === access.owner_id) {
            return c.json({ success: false, error: 'Forbidden', message: 'Cannot modify the owner role' }, 403);
        }

        // Optional: Admin cannot modify another Admin's role unless they are the Owner
        if (access.role === 'admin' && access.owner_id !== userId) {
            const targetMember = await c.env.DB.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?')
                .bind(projectId, targetUserId)
                .first<{ role: string }>();

            if (targetMember && targetMember.role === 'admin') {
                return c.json({ success: false, error: 'Forbidden', message: 'Admins cannot modify the role of other admins' }, 403);
            }
        }

        const result = await c.env.DB.prepare(
            `UPDATE project_members 
             SET role = ?
             WHERE project_id = ? AND user_id = ?`
        )
            .bind(role, projectId, targetUserId)
            .run();

        if (result.meta.changes === 0) {
            return c.json({ success: false, error: 'Not Found', message: 'Member not found in this project' }, 404);
        }

        return c.json({ success: true, message: 'Member role updated successfully' });
    } catch (error) {
        console.error('Update member role error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to update member role' }, 500);
    }
});

// DELETE /api/projects/:id/members/:userId - Remove member
projectRoutes.delete('/:id/members/:targetUserId', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');
    const targetUserId = c.req.param('targetUserId');

    try {
        // Members can remove themselves (leave project), but to remove others, must be admin/owner
        const access = await c.env.DB.prepare(
            `SELECT p.id, p.owner_id, pm.role 
             FROM projects p
             LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
             WHERE p.id = ?`
        )
            .bind(userId, projectId)
            .first<{ id: string; owner_id: string; role: string | null }>();

        if (!access) {
            return c.json({ success: false, error: 'Not Found', message: 'Project not found' }, 404);
        }

        const isOwner = access.owner_id === userId;
        const isAdmin = access.role === 'admin';
        const isSelf = userId === targetUserId;

        if (!isOwner && !isAdmin && !isSelf) {
            return c.json({ success: false, error: 'Forbidden', message: 'Only admins or owners can remove other members' }, 403);
        }

        if (targetUserId === access.owner_id) {
            return c.json({ success: false, error: 'Forbidden', message: 'Cannot remove the project owner' }, 403);
        }

        // Optional: Admin cannot remove another Admin
        if (isAdmin && !isOwner && !isSelf) {
            const targetMember = await c.env.DB.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?')
                .bind(projectId, targetUserId)
                .first<{ role: string }>();

            if (targetMember && targetMember.role === 'admin') {
                return c.json({ success: false, error: 'Forbidden', message: 'Admins cannot remove other admins' }, 403);
            }
        }

        const result = await c.env.DB.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?')
            .bind(projectId, targetUserId)
            .run();

        if (result.meta.changes === 0) {
            return c.json({ success: false, error: 'Not Found', message: 'Member not found in this project' }, 404);
        }

        await c.env.DB.prepare(
            `INSERT INTO activity_log (id, project_id, user_id, action, details)
             VALUES (?, ?, ?, 'member_removed', ?)`
        )
            .bind(
                crypto.randomUUID(),
                projectId,
                userId,
                JSON.stringify({ target_user_id: targetUserId })
            )
            .run();

        return c.json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
        console.error('Remove member error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to remove member' }, 500);
    }
});

// GET /api/projects/:id/integrations - List project integrations
projectRoutes.get('/:id/integrations', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');

    try {
        const access = await c.env.DB.prepare(
            `SELECT p.id FROM projects p
             LEFT JOIN project_members pm ON p.id = pm.project_id
             WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(projectId, userId, userId)
            .first();

        if (!access) return c.json({ success: false, error: 'Forbidden', message: 'Access denied' }, 403);

        const { results } = await c.env.DB.prepare('SELECT * FROM integrations WHERE project_id = ? ORDER BY created_at DESC')
            .bind(projectId)
            .all();

        return c.json({ success: true, data: { integrations: results || [] } });
    } catch (error) {
        console.error('List integrations error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to fetch integrations' }, 500);
    }
});

// POST /api/projects/:id/integrations - Add an integration
projectRoutes.post('/:id/integrations', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');

    try {
        const { provider, webhook_url, name } = await c.req.json();

        if (!provider || !name) {
            return c.json({ success: false, error: 'Validation Error', message: 'Provider and name are required' }, 400);
        }

        const validProviders = ['slack', 'teams', 'telegram', 'webhook'];
        if (!validProviders.includes(provider)) {
            return c.json({ success: false, error: 'Validation Error', message: 'Invalid provider' }, 400);
        }

        const access = await c.env.DB.prepare(
            `SELECT p.id FROM projects p
             LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
             WHERE p.id = ? AND (p.owner_id = ? OR pm.role IN ('owner', 'admin'))`
        )
            .bind(userId, projectId, userId)
            .first();

        if (!access) return c.json({ success: false, error: 'Forbidden', message: 'Only admins or owners can add integrations' }, 403);

        const id = crypto.randomUUID();
        // Generate a simple token for accepting incoming webhooks mapping to this integration
        const incomingToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

        await c.env.DB.prepare(
            `INSERT INTO integrations (id, project_id, provider, webhook_url, incoming_token, name, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`
        )
            .bind(id, projectId, provider, webhook_url, incomingToken, name.trim())
            .run();

        const integration = await c.env.DB.prepare('SELECT * FROM integrations WHERE id = ?').bind(id).first();

        return c.json({ success: true, data: { integration } }, 201);
    } catch (error) {
        console.error('Create integration error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to create integration' }, 500);
    }
});

// PATCH /api/projects/:id/integrations/:integrationId - Update integration
projectRoutes.patch('/:id/integrations/:integrationId', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');
    const integrationId = c.req.param('integrationId');

    try {
        const { name, webhook_url, is_active } = await c.req.json();

        const access = await c.env.DB.prepare(
            `SELECT p.id FROM projects p
             LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
             WHERE p.id = ? AND (p.owner_id = ? OR pm.role IN ('owner', 'admin'))`
        )
            .bind(userId, projectId, userId)
            .first();

        if (!access) return c.json({ success: false, error: 'Forbidden', message: 'Access denied' }, 403);

        const current = await c.env.DB.prepare('SELECT id, name, webhook_url, is_active FROM integrations WHERE id = ? AND project_id = ?')
            .bind(integrationId, projectId)
            .first<IntegrationRow>();

        if (!current) return c.json({ success: false, error: 'Not Found', message: 'Integration not found' }, 404);

        await c.env.DB.prepare(
            `UPDATE integrations 
             SET name = ?, webhook_url = ?, is_active = ?, updated_at = datetime('now')
             WHERE id = ?`
        )
            .bind(
                name !== undefined ? name.trim() : current.name,
                webhook_url !== undefined ? webhook_url : current.webhook_url,
                is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
                integrationId
            )
            .run();

        const updated = await c.env.DB.prepare('SELECT * FROM integrations WHERE id = ?').bind(integrationId).first();

        return c.json({ success: true, data: { integration: updated } });
    } catch (error) {
        console.error('Update integration error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to update integration' }, 500);
    }
});

// DELETE /api/projects/:id/integrations/:integrationId - Remove integration
projectRoutes.delete('/:id/integrations/:integrationId', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');
    const integrationId = c.req.param('integrationId');

    try {
        const access = await c.env.DB.prepare(
            `SELECT p.id FROM projects p
             LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
             WHERE p.id = ? AND (p.owner_id = ? OR pm.role IN ('owner', 'admin'))`
        )
            .bind(userId, projectId, userId)
            .first();

        if (!access) return c.json({ success: false, error: 'Forbidden', message: 'Only admins or owners can remove integrations' }, 403);

        const result = await c.env.DB.prepare('DELETE FROM integrations WHERE id = ? AND project_id = ?')
            .bind(integrationId, projectId)
            .run();

        if (result.meta.changes === 0) {
            return c.json({ success: false, error: 'Not Found', message: 'Integration not found' }, 404);
        }

        return c.json({ success: true, message: 'Integration removed successfully' });
    } catch (error) {
        console.error('Remove integration error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to remove integration' }, 500);
    }
});
