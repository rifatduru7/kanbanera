import { Hono } from 'hono';
import { Env, Integration } from '../types';

export const webhookRoutes = new Hono<{ Bindings: Env }>();

// Incoming webhook (public, authenticated by token)
webhookRoutes.post('/incoming/:token', async (c) => {
    const token = c.req.param('token');
    const contentType = c.req.header('Content-Type') || '';

    const integration = await c.env.DB.prepare(
        'SELECT * FROM integrations WHERE incoming_token = ? AND is_active = 1'
    ).bind(token).first<Integration>();

    if (!integration) {
        return c.json({ error: 'Invalid token' }, 404);
    }

    const projectId = integration.project_id;
    const project = await c.env.DB.prepare(
        'SELECT owner_id FROM projects WHERE id = ?'
    ).bind(projectId).first<{ owner_id: string }>();

    if (!project) {
        return c.json({ error: 'Project not found' }, 404);
    }

    let title: string;
    let description: string | null | undefined;

    if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await c.req.parseBody();
        const text = String(formData.text || '').trim();
        const userName = String(formData.user_name || 'External');

        if (!text) {
            return c.json({ text: 'Please provide a task title. Usage: /task My new task description' });
        }

        title = text;
        description = `Created via Slack by ${userName}`;
    } else {
        try {
            const body = await c.req.json<Record<string, string>>();
            title = (body.title || body.text || body.content || '').trim();
            description = (body.description || body.desc || body.body || '').trim() || null;
        } catch {
            return c.json({ error: 'Invalid JSON payload' }, 400);
        }
    }

    if (!title) {
        return c.json({ error: 'Title is required' }, 400);
    }

    const column = await c.env.DB.prepare(
        'SELECT id FROM columns WHERE project_id = ? ORDER BY position ASC LIMIT 1'
    ).bind(projectId).first<{ id: string }>();

    if (!column) {
        return c.json({ error: 'Project has no columns' }, 400);
    }

    const taskId = crypto.randomUUID();
    const lastTask = await c.env.DB.prepare(
        'SELECT position FROM tasks WHERE column_id = ? ORDER BY position DESC LIMIT 1'
    ).bind(column.id).first<{ position: number }>();
    const position = (lastTask?.position || 0) + 1000;

    await c.env.DB.prepare(
        `INSERT INTO tasks (id, project_id, column_id, title, description, position, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
        taskId,
        projectId,
        column.id,
        title,
        description ?? null,
        position,
        project.owner_id
    ).run();

    return c.json({
        success: true,
        message: 'Task created successfully',
        data: {
            task_id: taskId,
            title,
        },
        text: `Task Created: ${title}${description ? `\n${description}` : ''}`,
    });
});
