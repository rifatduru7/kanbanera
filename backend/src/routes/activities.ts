import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';

export const activitiesRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
activitiesRoutes.use('*', authMiddleware);

// GET /api/activities - Get recent activity log
activitiesRoutes.get('/', async (c) => {
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit') || '20');

    try {
        const { results: activities } = await c.env.DB.prepare(`
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
            LEFT JOIN project_members pm ON p.id = pm.project_id
            WHERE p.owner_id = ? OR pm.user_id = ?
            ORDER BY a.created_at DESC
            LIMIT ?
        `).bind(userId, userId, limit).all();

        // Transform activities to frontend format
        const transformedActivities = activities?.map((a: Record<string, unknown>) => {
            const action = a.action as string;
            let type: string;

            switch (action) {
                case 'task_created':
                    type = 'task_created';
                    break;
                case 'task_updated':
                case 'task_moved':
                    type = 'task_moved';
                    break;
                case 'task_completed':
                    type = 'task_completed';
                    break;
                case 'comment_added':
                    type = 'comment';
                    break;
                case 'attachment_added':
                    type = 'file_uploaded';
                    break;
                case 'member_joined':
                    type = 'member_joined';
                    break;
                default:
                    type = 'task_created';
            }

            // Parse details JSON if present
            let details: Record<string, unknown> = {};
            try {
                if (a.details && typeof a.details === 'string') {
                    details = JSON.parse(a.details);
                }
            } catch {
                // Ignore parse errors
            }

            return {
                id: a.id,
                type,
                user: {
                    id: a.user_id,
                    name: a.user_name || 'Unknown',
                    avatar: a.user_avatar,
                    initials: getInitials(a.user_name as string),
                },
                taskId: a.task_id,
                taskName: a.task_title,
                projectId: a.project_id,
                projectName: a.project_name,
                details,
                timestamp: formatTimeAgo(a.created_at as string),
                createdAt: a.created_at,
            };
        }) || [];

        return c.json({
            success: true,
            data: { activities: transformedActivities },
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
