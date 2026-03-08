import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';

export const activitiesRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
activitiesRoutes.use('*', authMiddleware);

// GET /api/activities - Get recent activity log
activitiesRoutes.get('/', async (c) => {
    const userId = c.get('userId');
    const limit = clampNumber(parseInt(c.req.query('limit') || '20', 10), 1, 100);
    const cursor = c.req.query('cursor');
    const type = c.req.query('type');
    const projectId = c.req.query('projectId');

    try {
        const actions = mapTypeToActions(type);
        const decodedCursor = decodeCursor(cursor);

        let query = `
            SELECT 
                a.id,
                a.action,
                a.details,
                a.created_at,
                a.task_id,
                a.project_id,
                u.id as user_id,
                u.full_name as user_name,
                u.avatar_url as user_avatar,
                t.title as task_title,
                p.name as project_name
            FROM activity_log a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN tasks t ON a.task_id = t.id
            JOIN projects p ON a.project_id = p.id
            WHERE (
                p.owner_id = ?
                OR EXISTS (
                    SELECT 1
                    FROM project_members pm
                    WHERE pm.project_id = p.id AND pm.user_id = ?
                )
            )
        `;

        const params: (string | number)[] = [userId, userId];

        if (projectId) {
            query += ` AND a.project_id = ?`;
            params.push(projectId);
        }

        if (actions.length > 0) {
            const placeholders = actions.map(() => '?').join(', ');
            query += ` AND a.action IN (${placeholders})`;
            params.push(...actions);
        }

        if (decodedCursor) {
            query += ` AND (a.created_at < ? OR (a.created_at = ? AND a.id < ?))`;
            params.push(decodedCursor.createdAt, decodedCursor.createdAt, decodedCursor.id);
        }

        query += `
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT ?
        `;
        params.push(limit + 1);

        const { results } = await c.env.DB.prepare(query).bind(...params).all();
        const activities = (results || []) as Record<string, unknown>[];
        const hasMore = activities.length > limit;
        const items = hasMore ? activities.slice(0, limit) : activities;

        // Transform activities to frontend format
        const transformedActivities = items.map((activity) => {
            const action = activity.action as string;
            const mappedType = mapActionToType(action);

            // Parse details JSON if present
            let details: Record<string, unknown> = {};
            try {
                if (activity.details && typeof activity.details === 'string') {
                    details = JSON.parse(activity.details);
                }
            } catch {
                // Ignore parse errors
            }

            return {
                id: activity.id,
                type: mappedType,
                user: {
                    id: activity.user_id,
                    name: activity.user_name || 'Unknown',
                    avatar: activity.user_avatar,
                    initials: getInitials(activity.user_name as string),
                },
                taskId: activity.task_id,
                taskName: activity.task_title,
                projectId: activity.project_id,
                projectName: activity.project_name,
                details,
                timestamp: formatTimeAgo(activity.created_at as string),
                createdAt: activity.created_at,
            };
        });

        const nextCursor = hasMore
            ? encodeCursor({
                createdAt: String(transformedActivities[transformedActivities.length - 1].createdAt),
                id: String(transformedActivities[transformedActivities.length - 1].id),
            })
            : undefined;

        return c.json({
            success: true,
            data: { activities: transformedActivities, nextCursor },
        });
    } catch (error) {
        console.error('Get activities error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch activities' },
            500
        );
    }
});

function getInitials(name: string): string {
    if (!name) return 'U';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function clampNumber(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
}

function mapActionToType(action: string): string {
    switch (action) {
        case 'task_created':
            return 'task_created';
        case 'task_updated':
        case 'task_moved':
            return 'task_moved';
        case 'comment_added':
            return 'comment';
        case 'attachment_added':
            return 'file_uploaded';
        case 'member_added':
            return 'member_joined';
        default:
            return 'task_created';
    }
}

function mapTypeToActions(type?: string): string[] {
    if (!type || type === 'all') return [];
    if (type === 'task_created') return ['task_created'];
    if (type === 'task_moved') return ['task_updated', 'task_moved'];
    if (type === 'comment') return ['comment_added'];
    if (type === 'file_uploaded') return ['attachment_added'];
    if (type === 'member_joined') return ['member_added', 'member_removed'];
    return [];
}

function encodeCursor(cursor: { createdAt: string; id: string }): string {
    return btoa(JSON.stringify(cursor));
}

function decodeCursor(cursor?: string): { createdAt: string; id: string } | null {
    if (!cursor) return null;
    try {
        const value = JSON.parse(atob(cursor)) as { createdAt?: string; id?: string };
        if (!value.createdAt || !value.id) return null;
        return { createdAt: value.createdAt, id: value.id };
    } catch {
        return null;
    }
}

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
}

export default activitiesRoutes;
