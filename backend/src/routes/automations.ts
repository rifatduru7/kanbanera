import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { createBulkNotifications } from '../services/notifications/createBulkNotifications';

export const automationRoutes = new Hono<{ Bindings: Env }>();
automationRoutes.use('*', authMiddleware);

interface AutomationRow {
    id: string;
    project_id: string;
    name: string;
    trigger_type: string;
    trigger_value: string | null;
    action_type: string;
    action_value: string | null;
    is_active: number;
    created_by: string;
    created_at: string;
    updated_at: string;
}

// Helper: check project access
async function checkAccess(env: Env, projectId: string, userId: string) {
    return env.DB.prepare(
        `SELECT p.id FROM projects p
         LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
         WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id IS NOT NULL)`
    ).bind(userId, projectId, userId).first();
}

// GET /api/projects/:projectId/automations
automationRoutes.get('/:projectId/automations', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');

    const access = await checkAccess(c.env, projectId, userId);
    if (!access) return c.json({ success: false, error: 'Forbidden' }, 403);

    const { results } = await c.env.DB.prepare(
        `SELECT a.*, u.full_name as created_by_name
         FROM automations a
         LEFT JOIN users u ON a.created_by = u.id
         WHERE a.project_id = ?
         ORDER BY a.created_at DESC`
    ).bind(projectId).all<AutomationRow & { created_by_name: string }>();

    return c.json({ success: true, data: { automations: results || [] } });
});

// POST /api/projects/:projectId/automations
automationRoutes.post('/:projectId/automations', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');

    const access = await checkAccess(c.env, projectId, userId);
    if (!access) return c.json({ success: false, error: 'Forbidden' }, 403);

    const body = await c.req.json();
    const { name, trigger_type, trigger_value, action_type, action_value } = body;

    if (!name || !trigger_type || !action_type) {
        return c.json({ success: false, error: 'name, trigger_type, and action_type are required' }, 400);
    }

    const validTriggers = ['task_moved_to', 'task_created', 'task_assigned', 'due_date_passed'];
    const validActions = ['set_priority', 'set_assignee', 'add_label', 'move_to_column', 'archive_task'];

    if (!validTriggers.includes(trigger_type)) {
        return c.json({ success: false, error: 'Invalid trigger_type' }, 400);
    }
    if (!validActions.includes(action_type)) {
        return c.json({ success: false, error: 'Invalid action_type' }, 400);
    }

    const id = crypto.randomUUID();

    await c.env.DB.prepare(
        `INSERT INTO automations (id, project_id, name, trigger_type, trigger_value, action_type, action_value, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        id, projectId, name.trim(), trigger_type,
        trigger_value ? JSON.stringify(trigger_value) : null,
        action_type,
        action_value ? JSON.stringify(action_value) : null,
        userId
    ).run();

    const automation = await c.env.DB.prepare('SELECT * FROM automations WHERE id = ?').bind(id).first<AutomationRow>();

    return c.json({ success: true, data: { automation } }, 201);
});

// PATCH /api/projects/:projectId/automations/:automationId
automationRoutes.patch('/:projectId/automations/:automationId', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');
    const automationId = c.req.param('automationId');

    const access = await checkAccess(c.env, projectId, userId);
    if (!access) return c.json({ success: false, error: 'Forbidden' }, 403);

    const body = await c.req.json();
    const { name, trigger_type, trigger_value, action_type, action_value, is_active } = body;

    const current = await c.env.DB.prepare(
        'SELECT * FROM automations WHERE id = ? AND project_id = ?'
    ).bind(automationId, projectId).first<AutomationRow>();

    if (!current) return c.json({ success: false, error: 'Not Found' }, 404);

    await c.env.DB.prepare(
        `UPDATE automations SET
            name = ?, trigger_type = ?, trigger_value = ?,
            action_type = ?, action_value = ?,
            is_active = ?, updated_at = datetime('now')
         WHERE id = ?`
    ).bind(
        name !== undefined ? name.trim() : current.name,
        trigger_type || current.trigger_type,
        trigger_value !== undefined ? JSON.stringify(trigger_value) : current.trigger_value,
        action_type || current.action_type,
        action_value !== undefined ? JSON.stringify(action_value) : current.action_value,
        is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
        automationId
    ).run();

    const updated = await c.env.DB.prepare('SELECT * FROM automations WHERE id = ?').bind(automationId).first<AutomationRow>();

    return c.json({ success: true, data: { automation: updated } });
});

// DELETE /api/projects/:projectId/automations/:automationId
automationRoutes.delete('/:projectId/automations/:automationId', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');
    const automationId = c.req.param('automationId');

    const access = await checkAccess(c.env, projectId, userId);
    if (!access) return c.json({ success: false, error: 'Forbidden' }, 403);

    const result = await c.env.DB.prepare(
        'DELETE FROM automations WHERE id = ? AND project_id = ?'
    ).bind(automationId, projectId).run();

    if (result.meta.changes === 0) {
        return c.json({ success: false, error: 'Not Found' }, 404);
    }

    return c.json({ success: true, message: 'Automation deleted' });
});

/**
 * Runs matching automations when a trigger event occurs.
 * Called from task routes (task move, task create, etc.)
 */
export async function runAutomations(
    env: Env,
    projectId: string,
    triggerType: string,
    triggerValue: Record<string, unknown>,
    taskId: string,
) {
    try {
        const { results: automations } = await env.DB.prepare(
            `SELECT * FROM automations WHERE project_id = ? AND trigger_type = ? AND is_active = 1`
        ).bind(projectId, triggerType).all<AutomationRow>();

        if (!automations || automations.length === 0) return;

        const task = await env.DB.prepare(
            'SELECT title FROM tasks WHERE id = ?'
        ).bind(taskId).first<{ title: string }>();

        const project = await env.DB.prepare(
            'SELECT owner_id FROM projects WHERE id = ?'
        ).bind(projectId).first<{ owner_id: string }>();

        for (const auto of automations) {
            try {
                let triggerMatch = false;
                const autoTriggerValue = auto.trigger_value ? JSON.parse(auto.trigger_value) : {};

                if (triggerType === 'task_moved_to') {
                    triggerMatch = autoTriggerValue.column_id === triggerValue.column_id;
                } else if (triggerType === 'task_created') {
                    triggerMatch = true;
                } else if (triggerType === 'task_assigned') {
                    triggerMatch = !autoTriggerValue.user_id || autoTriggerValue.user_id === triggerValue.user_id;
                } else if (triggerType === 'due_date_passed') {
                    triggerMatch = true;
                }

                if (!triggerMatch) continue;

                const actionVal = auto.action_value ? JSON.parse(auto.action_value) : {};

                if (auto.action_type === 'set_priority' && actionVal.priority) {
                    await env.DB.prepare(
                        `UPDATE tasks SET priority = ?, updated_at = datetime('now') WHERE id = ?`
                    ).bind(actionVal.priority, taskId).run();
                } else if (auto.action_type === 'add_label' && actionVal.label) {
                    const taskWithLabels = await env.DB.prepare('SELECT labels FROM tasks WHERE id = ?').bind(taskId).first<{ labels: string | null }>();
                    const labels: string[] = taskWithLabels?.labels ? JSON.parse(taskWithLabels.labels) : [];
                    if (!labels.includes(actionVal.label)) {
                        labels.push(actionVal.label);
                        await env.DB.prepare(
                            `UPDATE tasks SET labels = ?, updated_at = datetime('now') WHERE id = ?`
                        ).bind(JSON.stringify(labels), taskId).run();
                    }
                } else if (auto.action_type === 'move_to_column' && actionVal.column_id) {
                    await env.DB.prepare(
                        `UPDATE tasks SET column_id = ?, updated_at = datetime('now') WHERE id = ?`
                    ).bind(actionVal.column_id, taskId).run();
                } else if (auto.action_type === 'archive_task') {
                    await env.DB.prepare(
                        `UPDATE tasks SET is_archived = 1, updated_at = datetime('now') WHERE id = ?`
                    ).bind(taskId).run();
                } else if (auto.action_type === 'set_assignee' && actionVal.user_id) {
                    await env.DB.prepare(
                        `UPDATE tasks SET assignee_id = ?, updated_at = datetime('now') WHERE id = ?`
                    ).bind(actionVal.user_id, taskId).run();
                }

                await notifyAutomationResult(env, {
                    automationId: auto.id,
                    automationName: auto.name,
                    createdBy: auto.created_by,
                    projectId,
                    projectOwnerId: project?.owner_id || '',
                    taskId,
                    taskTitle: task?.title || 'Task',
                    triggerType,
                    actionType: auto.action_type,
                    result: 'success',
                }).catch((notifyError) => console.error('Automation success notification error:', notifyError));
            } catch (error) {
                console.error('Automation execution error:', error);

                await notifyAutomationResult(env, {
                    automationId: auto.id,
                    automationName: auto.name,
                    createdBy: auto.created_by,
                    projectId,
                    projectOwnerId: project?.owner_id || '',
                    taskId,
                    taskTitle: task?.title || 'Task',
                    triggerType,
                    actionType: auto.action_type,
                    result: 'failure',
                    errorMessage: error instanceof Error ? error.message : 'Unknown automation error',
                }).catch((notifyError) => console.error('Automation failure notification error:', notifyError));
            }
        }
    } catch (error) {
        console.error('Automation execution error:', error);
    }
}

interface AutomationNotificationContext {
    automationId: string;
    automationName: string;
    createdBy: string;
    projectId: string;
    projectOwnerId: string;
    taskId: string;
    taskTitle: string;
    triggerType: string;
    actionType: string;
    result: 'success' | 'failure';
    errorMessage?: string;
}

async function notifyAutomationResult(env: Env, context: AutomationNotificationContext) {
    const recipientIds = Array.from(new Set([context.createdBy, context.projectOwnerId].filter(Boolean)));
    if (recipientIds.length === 0) return;

    const type = context.result === 'success' ? 'automation_succeeded' : 'automation_failed';
    const title = context.result === 'success' ? 'Automation executed' : 'Automation failed';
    const message = context.result === 'success'
        ? `"${context.automationName}" ran for "${context.taskTitle}".`
        : `"${context.automationName}" failed for "${context.taskTitle}".`;

    await createBulkNotifications(
        env,
        recipientIds.map((recipientId) => ({
            userId: recipientId,
            type,
            title,
            message,
            link: `/board?project=${context.projectId}&task=${context.taskId}`,
            metadata: {
                automation_id: context.automationId,
                automation_name: context.automationName,
                project_id: context.projectId,
                task_id: context.taskId,
                trigger_type: context.triggerType,
                action_type: context.actionType,
                result: context.result,
                error_message: context.errorMessage || null,
            },
        })),
        {
            dedupe: {
                where: `
                    json_extract(metadata, '$.automation_id') = ?
                    AND json_extract(metadata, '$.task_id') = ?
                    AND json_extract(metadata, '$.result') = ?
                    AND created_at >= datetime('now', '-5 minutes')
                `,
                params: [context.automationId, context.taskId, context.result],
            },
        },
    );
}
