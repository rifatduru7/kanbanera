import { Hono } from 'hono';
import type { Env, NotificationType } from '../types';
import { authMiddleware } from '../middleware/auth';

export const notificationRoutes = new Hono<{ Bindings: Env }>();

// All notification routes require authentication
notificationRoutes.use('*', authMiddleware);

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: string;
    is_read: number;
    created_at: string;
}

interface CursorPayload {
    createdAt: string;
    id: string;
}

function encodeCursor(payload: CursorPayload) {
    return encodeURIComponent(JSON.stringify(payload));
}

function decodeCursor(raw: string | undefined | null): CursorPayload | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(decodeURIComponent(raw)) as CursorPayload;
        if (!parsed.createdAt || !parsed.id) return null;
        return parsed;
    } catch {
        return null;
    }
}

// Get all notifications for current user
notificationRoutes.get('/', async (c) => {
    try {
        const userId = c.get('userId');
        const limitParam = Number(c.req.query('limit') || 20);
        const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, limitParam)) : 20;
        const unreadOnly = c.req.query('unreadOnly') === 'true';
        const cursor = decodeCursor(c.req.query('cursor'));

        const filters = [`user_id = ?`];
        const params: unknown[] = [userId];

        if (unreadOnly) {
            filters.push('is_read = 0');
        }

        if (cursor) {
            filters.push('(created_at < ? OR (created_at = ? AND id < ?))');
            params.push(cursor.createdAt, cursor.createdAt, cursor.id);
        }

        const { results } = await c.env.DB.prepare(
            `SELECT * FROM notifications
             WHERE ${filters.join(' AND ')}
             ORDER BY created_at DESC, id DESC
             LIMIT ?`
        )
            .bind(...params, limit)
            .all<Notification>();

        const unreadCountRow = await c.env.DB.prepare(
            `SELECT COUNT(*) as unread_count
             FROM notifications
             WHERE user_id = ? AND is_read = 0`
        )
            .bind(userId)
            .first<{ unread_count: number }>();

        // Parse metadata JSON strings
        const parsedResults = results.map(notif => ({
            ...notif,
            is_read: notif.is_read === 1,
            metadata: notif.metadata ? JSON.parse(notif.metadata) : null
        }));

        const lastItem = parsedResults[parsedResults.length - 1];
        const nextCursor = parsedResults.length === limit && lastItem
            ? encodeCursor({ createdAt: lastItem.created_at, id: lastItem.id })
            : undefined;

        return c.json({
            success: true,
            data: {
                items: parsedResults,
                nextCursor,
                unreadCount: Number(unreadCountRow?.unread_count || 0),
                hasMore: Boolean(nextCursor),
            },
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
