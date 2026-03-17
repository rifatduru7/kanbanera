import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';

const flowsRoutes = new Hono<{ Bindings: Env }>();

flowsRoutes.use('*', authMiddleware);

// Helper: verify project access
async function verifyProjectAccess(db: D1Database, projectId: string, userId: string): Promise<boolean> {
    const row = await db.prepare(`
        SELECT 1 FROM projects p
        WHERE p.id = ? AND (
            p.owner_id = ?
            OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?)
        )
    `).bind(projectId, userId, userId).first();
    return !!row;
}

// GET /:projectId - List flows for a project
flowsRoutes.get('/:projectId', async (c) => {
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');

    try {
        if (!await verifyProjectAccess(c.env.DB, projectId, userId)) {
            return c.json({ success: false, error: 'Forbidden', message: 'No access to this project' }, 403);
        }

        const { results } = await c.env.DB.prepare(`
            SELECT af.*, u.full_name as created_by_name,
                (SELECT COUNT(*) FROM flow_executions fe WHERE fe.flow_id = af.id) as execution_count,
                (SELECT MAX(fe.started_at) FROM flow_executions fe WHERE fe.flow_id = af.id) as last_executed_at
            FROM automation_flows af
            LEFT JOIN users u ON af.created_by = u.id
            WHERE af.project_id = ?
            ORDER BY af.created_at DESC
        `).bind(projectId).all();

        return c.json({
            success: true,
            data: {
                flows: results.map((f: Record<string, unknown>) => ({
                    id: f.id,
                    projectId: f.project_id,
                    name: f.name,
                    description: f.description,
                    flowData: f.flow_data ? JSON.parse(f.flow_data as string) : {},
                    isActive: !!f.is_active,
                    createdBy: f.created_by,
                    createdByName: f.created_by_name,
                    executionCount: Number(f.execution_count || 0),
                    lastExecutedAt: f.last_executed_at,
                    createdAt: f.created_at,
                    updatedAt: f.updated_at,
                })),
            },
        });
    } catch (error) {
        console.error('List flows error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to fetch flows' }, 500);
    }
});

// POST / - Create a new flow
flowsRoutes.post('/', async (c) => {
    const userId = c.get('userId');

    try {
        const body = await c.req.json<{
            project_id: string;
            name: string;
            description?: string;
            flow_data?: Record<string, unknown>;
        }>();

        if (!body.project_id || !body.name) {
            return c.json({ success: false, error: 'Validation Error', message: 'project_id and name are required' }, 400);
        }

        if (!await verifyProjectAccess(c.env.DB, body.project_id, userId)) {
            return c.json({ success: false, error: 'Forbidden', message: 'No access to this project' }, 403);
        }

        const id = crypto.randomUUID();
        const flowData = JSON.stringify(body.flow_data || { nodes: [], edges: [] });

        await c.env.DB.prepare(`
            INSERT INTO automation_flows (id, project_id, name, description, flow_data, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(id, body.project_id, body.name, body.description || null, flowData, userId).run();

        const flow = await c.env.DB.prepare('SELECT * FROM automation_flows WHERE id = ?').bind(id).first();

        return c.json({
            success: true,
            data: {
                flow: {
                    id: flow!.id,
                    projectId: flow!.project_id,
                    name: flow!.name,
                    description: flow!.description,
                    flowData: JSON.parse(flow!.flow_data as string),
                    isActive: !!flow!.is_active,
                    createdBy: flow!.created_by,
                    createdAt: flow!.created_at,
                    updatedAt: flow!.updated_at,
                },
            },
        }, 201);
    } catch (error) {
        console.error('Create flow error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to create flow' }, 500);
    }
});

// PUT /:flowId - Update a flow
flowsRoutes.put('/:flowId', async (c) => {
    const userId = c.get('userId');
    const flowId = c.req.param('flowId');

    try {
        const existing = await c.env.DB.prepare('SELECT * FROM automation_flows WHERE id = ?').bind(flowId).first();
        if (!existing) {
            return c.json({ success: false, error: 'Not Found', message: 'Flow not found' }, 404);
        }

        if (!await verifyProjectAccess(c.env.DB, existing.project_id as string, userId)) {
            return c.json({ success: false, error: 'Forbidden', message: 'No access to this project' }, 403);
        }

        const body = await c.req.json<{
            name?: string;
            description?: string;
            flow_data?: Record<string, unknown>;
            is_active?: boolean;
        }>();

        const updates: string[] = [];
        const values: unknown[] = [];

        if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
        if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
        if (body.flow_data !== undefined) { updates.push('flow_data = ?'); values.push(JSON.stringify(body.flow_data)); }
        if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }

        if (updates.length === 0) {
            return c.json({ success: false, error: 'Validation Error', message: 'No fields to update' }, 400);
        }

        updates.push("updated_at = datetime('now')");
        values.push(flowId);

        await c.env.DB.prepare(
            `UPDATE automation_flows SET ${updates.join(', ')} WHERE id = ?`
        ).bind(...values).run();

        const updated = await c.env.DB.prepare('SELECT * FROM automation_flows WHERE id = ?').bind(flowId).first();

        return c.json({
            success: true,
            data: {
                flow: {
                    id: updated!.id,
                    projectId: updated!.project_id,
                    name: updated!.name,
                    description: updated!.description,
                    flowData: JSON.parse(updated!.flow_data as string),
                    isActive: !!updated!.is_active,
                    createdBy: updated!.created_by,
                    createdAt: updated!.created_at,
                    updatedAt: updated!.updated_at,
                },
            },
        });
    } catch (error) {
        console.error('Update flow error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to update flow' }, 500);
    }
});

// DELETE /:flowId - Delete a flow
flowsRoutes.delete('/:flowId', async (c) => {
    const userId = c.get('userId');
    const flowId = c.req.param('flowId');

    try {
        const existing = await c.env.DB.prepare('SELECT * FROM automation_flows WHERE id = ?').bind(flowId).first();
        if (!existing) {
            return c.json({ success: false, error: 'Not Found', message: 'Flow not found' }, 404);
        }

        if (!await verifyProjectAccess(c.env.DB, existing.project_id as string, userId)) {
            return c.json({ success: false, error: 'Forbidden', message: 'No access to this project' }, 403);
        }

        await c.env.DB.prepare('DELETE FROM automation_flows WHERE id = ?').bind(flowId).run();

        return c.json({ success: true, message: 'Flow deleted successfully' });
    } catch (error) {
        console.error('Delete flow error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to delete flow' }, 500);
    }
});

// GET /:flowId/history - Get execution history
flowsRoutes.get('/:flowId/history', async (c) => {
    const userId = c.get('userId');
    const flowId = c.req.param('flowId');

    try {
        const existing = await c.env.DB.prepare('SELECT * FROM automation_flows WHERE id = ?').bind(flowId).first();
        if (!existing) {
            return c.json({ success: false, error: 'Not Found', message: 'Flow not found' }, 404);
        }

        if (!await verifyProjectAccess(c.env.DB, existing.project_id as string, userId)) {
            return c.json({ success: false, error: 'Forbidden', message: 'No access to this project' }, 403);
        }

        const { results } = await c.env.DB.prepare(`
            SELECT * FROM flow_executions
            WHERE flow_id = ?
            ORDER BY started_at DESC
            LIMIT 50
        `).bind(flowId).all();

        return c.json({
            success: true,
            data: {
                executions: results.map((e: Record<string, unknown>) => ({
                    id: e.id,
                    flowId: e.flow_id,
                    triggerData: e.trigger_data ? JSON.parse(e.trigger_data as string) : null,
                    status: e.status,
                    resultData: e.result_data ? JSON.parse(e.result_data as string) : null,
                    startedAt: e.started_at,
                    completedAt: e.completed_at,
                    errorMessage: e.error_message,
                })),
            },
        });
    } catch (error) {
        console.error('Get flow history error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to fetch flow history' }, 500);
    }
});

// POST /:flowId/execute - Manually execute a flow
flowsRoutes.post('/:flowId/execute', async (c) => {
    const userId = c.get('userId');
    const flowId = c.req.param('flowId');

    try {
        const existing = await c.env.DB.prepare('SELECT * FROM automation_flows WHERE id = ?').bind(flowId).first();
        if (!existing) {
            return c.json({ success: false, error: 'Not Found', message: 'Flow not found' }, 404);
        }

        if (!await verifyProjectAccess(c.env.DB, existing.project_id as string, userId)) {
            return c.json({ success: false, error: 'Forbidden', message: 'No access to this project' }, 403);
        }

        if (!existing.is_active) {
            return c.json({ success: false, error: 'Validation Error', message: 'Flow is not active' }, 400);
        }

        const body = await c.req.json<{ trigger_data?: Record<string, unknown> }>().catch(() => ({ trigger_data: undefined }));

        const executionId = crypto.randomUUID();
        const triggerData = JSON.stringify(body.trigger_data || { manual: true, triggered_by: userId });

        await c.env.DB.prepare(`
            INSERT INTO flow_executions (id, flow_id, trigger_data, status)
            VALUES (?, ?, ?, 'running')
        `).bind(executionId, flowId, triggerData).run();

        // Execute flow nodes
        const flowData = JSON.parse(existing.flow_data as string);
        let resultData: Record<string, unknown> = { nodesExecuted: 0 };
        let status = 'completed';
        let errorMessage: string | null = null;

        try {
            const nodes = flowData.nodes || [];
            const edges = flowData.edges || [];

            // Find trigger nodes (entry points)
            const triggerNodes = nodes.filter((n: Record<string, unknown>) =>
                (n.type === 'trigger' || n.type === 'triggerNode')
            );

            if (triggerNodes.length === 0 && nodes.length > 0) {
                // Use first node as entry
                triggerNodes.push(nodes[0]);
            }

            let executedCount = 0;
            const visited = new Set<string>();

            // Simple BFS execution
            const queue = [...triggerNodes];
            while (queue.length > 0) {
                const node = queue.shift();
                if (!node || visited.has(node.id as string)) continue;
                visited.add(node.id as string);
                executedCount++;

                const nodeData = (node.data || {}) as Record<string, unknown>;
                const actionType = nodeData.actionType as string;
                const projectId = existing.project_id as string;

                // Execute action nodes
                if (actionType === 'set_priority' && nodeData.taskFilter && nodeData.priority) {
                    await c.env.DB.prepare(
                        `UPDATE tasks SET priority = ?, updated_at = datetime('now') WHERE project_id = ? AND priority != ?`
                    ).bind(nodeData.priority, projectId, nodeData.priority).run();
                } else if (actionType === 'move_to_column' && nodeData.targetColumnId) {
                    // Move tasks matching filter to target column
                    const targetColumnId = nodeData.targetColumnId as string;
                    if (nodeData.sourceColumnId) {
                        await c.env.DB.prepare(
                            `UPDATE tasks SET column_id = ?, updated_at = datetime('now') WHERE project_id = ? AND column_id = ?`
                        ).bind(targetColumnId, projectId, nodeData.sourceColumnId).run();
                    }
                } else if (actionType === 'archive_task' && nodeData.sourceColumnId) {
                    await c.env.DB.prepare(
                        `UPDATE tasks SET is_archived = 1, updated_at = datetime('now') WHERE project_id = ? AND column_id = ?`
                    ).bind(projectId, nodeData.sourceColumnId).run();
                }

                // Find next nodes via edges
                const outgoingEdges = edges.filter((e: Record<string, unknown>) => e.source === node.id);
                for (const edge of outgoingEdges) {
                    const nextNode = nodes.find((n: Record<string, unknown>) => n.id === edge.target);
                    if (nextNode) queue.push(nextNode);
                }
            }

            resultData = { nodesExecuted: executedCount };
        } catch (execError) {
            status = 'failed';
            errorMessage = execError instanceof Error ? execError.message : 'Unknown execution error';
        }

        // Update execution record
        await c.env.DB.prepare(`
            UPDATE flow_executions
            SET status = ?, result_data = ?, completed_at = datetime('now'), error_message = ?
            WHERE id = ?
        `).bind(status, JSON.stringify(resultData), errorMessage, executionId).run();

        return c.json({
            success: true,
            data: {
                execution: {
                    id: executionId,
                    flowId,
                    status,
                    resultData,
                    errorMessage,
                },
            },
        });
    } catch (error) {
        console.error('Execute flow error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to execute flow' }, 500);
    }
});

export default flowsRoutes;
