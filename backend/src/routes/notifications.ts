import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';

export const notificationRoutes = new Hono<{ Bindings: Env }>();

// All notification routes require authentication
notificationRoutes.use('*', authMiddleware);

export interface Notification {
    id: string;
    user_id: string;
    type: 'project_invite' | 'task_assigned' | 'task_mentioned' | 'system';
    title: string;
    message: string;
    link?: string;
    metadata?: string;
    is_read: number;
    created_at: string;
}

// Get all notifications for current user
notificationRoutes.get('/', async (c) => {
    try {
        const userId = c.get('userId');

        const { results } = await c.env.DB.prepare(
            `SELECT * FROM notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50`
        )
            .bind(userId)
            .all<Notification>();

        // Parse metadata JSON strings
        const parsedResults = results.map(notif => ({
            ...notif,
            is_read: notif.is_read === 1,
            metadata: notif.metadata ? JSON.parse(notif.metadata) : null
        }));

        return c.json({
            success: true,
            data: parsedResults,
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return c.json(
            {
                success: false,
                error: 'Failed to fetch notifications',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            500
        );
    }
});

// Mark single notification as read
notificationRoutes.put('/:id/read', async (c) => {
    try {
        const userId = c.get('userId');
        const id = c.req.param('id');

        const { success } = await c.env.DB.prepare(
            `UPDATE notifications 
             SET is_read = 1 
             WHERE id = ? AND user_id = ?`
        )
            .bind(id, userId)
            .run();

        if (!success) {
            throw new Error('Failed to update notification');
        }

        return c.json({
            success: true,
            message: 'Notification marked as read',
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return c.json(
            {
                success: false,
                error: 'Failed to update notification',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            500
        );
    }
});

// Mark all notifications as read
notificationRoutes.put('/read-all', async (c) => {
    try {
        const userId = c.get('userId');

        const { success } = await c.env.DB.prepare(
            `UPDATE notifications 
             SET is_read = 1 
             WHERE user_id = ? AND is_read = 0`
        )
            .bind(userId)
            .run();

        if (!success) {
            throw new Error('Failed to update notifications');
        }

        return c.json({
            success: true,
            message: 'All notifications marked as read',
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return c.json(
            {
                success: false,
                error: 'Failed to update notifications',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            500
        );
    }
});
