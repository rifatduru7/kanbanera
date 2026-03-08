import { Hono } from 'hono';
import { deleteCookie } from 'hono/cookie';
import type { Env, UserPublic } from '../types';
import { authMiddleware } from '../middleware/auth';
import { verifyPassword } from '../middleware/auth';

export const userRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
userRoutes.use('*', authMiddleware);

interface UserPreferenceRow {
    email_notifications: number;
    push_notifications: number;
}

interface UserPasswordRow {
    password_hash: string;
}

// GET /api/users - Search users (for assigning tasks)
userRoutes.get('/', async (c) => {
    try {
        const query = c.req.query('q') || '';
        const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50);

        let results;

        if (query) {
            const { results: users } = await c.env.DB.prepare(
                `SELECT id, email, full_name, avatar_url, role 
         FROM users 
         WHERE full_name LIKE ? OR email LIKE ?
         LIMIT ?`
            )
                .bind(`%${query}%`, `%${query}%`, limit)
                .all<UserPublic>();

            results = users;
        } else {
            const { results: users } = await c.env.DB.prepare(
                `SELECT id, email, full_name, avatar_url, role 
         FROM users 
         LIMIT ?`
            )
                .bind(limit)
                .all<UserPublic>();

            results = users;
        }

        return c.json({
            success: true,
            data: { users: results || [] },
        });
    } catch (error) {
        console.error('Search users error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to search users' },
            500
        );
    }
});

// GET /api/users/:id - Get user by ID
userRoutes.get('/:id', async (c) => {
    const id = c.req.param('id');

    try {
        const user = await c.env.DB.prepare(
            'SELECT id, email, full_name, avatar_url, role, two_factor_enabled, created_at FROM users WHERE id = ?'
        )
            .bind(id)
            .first<UserPublic>();

        if (!user) {
            return c.json(
                { success: false, error: 'Not Found', message: 'User not found' },
                404
            );
        }

        return c.json({
            success: true,
            data: { user },
        });
    } catch (error) {
        console.error('Get user error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch user' },
            500
        );
    }
});

// GET /api/users/me/preferences - Get current user notification preferences
userRoutes.get('/me/preferences', async (c) => {
    const userId = c.get('userId');

    try {
        const prefs = await c.env.DB.prepare(
            `SELECT 
                COALESCE(up.email_notifications, 1) as email_notifications,
                COALESCE(up.push_notifications, 1) as push_notifications
             FROM users u
             LEFT JOIN user_preferences up ON up.user_id = u.id
             WHERE u.id = ?`
        )
            .bind(userId)
            .first<UserPreferenceRow>();

        if (!prefs) {
            return c.json(
                { success: false, error: 'Not Found', message: 'User not found' },
                404
            );
        }

        return c.json({
            success: true,
            data: {
                preferences: {
                    email_notifications: prefs.email_notifications === 1,
                    push_notifications: prefs.push_notifications === 1,
                },
            },
        });
    } catch (error) {
        console.error('Get preferences error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to fetch preferences' },
            500
        );
    }
});

// PUT /api/users/me/preferences - Update current user notification preferences
userRoutes.put('/me/preferences', async (c) => {
    const userId = c.get('userId');

    try {
        const body = await c.req.json<{
            email_notifications?: boolean;
            push_notifications?: boolean;
        }>();

        const hasEmail = typeof body.email_notifications === 'boolean';
        const hasPush = typeof body.push_notifications === 'boolean';

        if (!hasEmail && !hasPush) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'At least one preference is required' },
                400
            );
        }

        const current = await c.env.DB.prepare(
            `SELECT 
                COALESCE(up.email_notifications, 1) as email_notifications,
                COALESCE(up.push_notifications, 1) as push_notifications
             FROM users u
             LEFT JOIN user_preferences up ON up.user_id = u.id
             WHERE u.id = ?`
        )
            .bind(userId)
            .first<UserPreferenceRow>();

        if (!current) {
            return c.json(
                { success: false, error: 'Not Found', message: 'User not found' },
                404
            );
        }

        const nextEmail = hasEmail
            ? (body.email_notifications ? 1 : 0)
            : current.email_notifications;
        const nextPush = hasPush
            ? (body.push_notifications ? 1 : 0)
            : current.push_notifications;

        await c.env.DB.prepare(
            `INSERT INTO user_preferences (user_id, email_notifications, push_notifications, updated_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(user_id) DO UPDATE SET
                email_notifications = excluded.email_notifications,
                push_notifications = excluded.push_notifications,
                updated_at = datetime('now')`
        )
            .bind(userId, nextEmail, nextPush)
            .run();

        return c.json({
            success: true,
            data: {
                preferences: {
                    email_notifications: nextEmail === 1,
                    push_notifications: nextPush === 1,
                },
            },
            message: 'Preferences updated successfully',
        });
    } catch (error) {
        console.error('Update preferences error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to update preferences' },
            500
        );
    }
});

// PUT /api/users/me - Update current user profile
userRoutes.put('/me', async (c) => {
    const userId = c.get('userId');

    try {
        const body = await c.req.json();
        const { full_name, avatar_url } = body;

        await c.env.DB.prepare(
            `UPDATE users 
       SET full_name = COALESCE(?, full_name),
           avatar_url = ?,
           updated_at = datetime('now')
       WHERE id = ?`
        )
            .bind(full_name, avatar_url ?? null, userId)
            .run();

        const user = await c.env.DB.prepare(
            'SELECT id, email, full_name, avatar_url, role, two_factor_enabled, created_at FROM users WHERE id = ?'
        )
            .bind(userId)
            .first<UserPublic>();

        return c.json({
            success: true,
            data: { user },
        });
    } catch (error) {
        console.error('Update user error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to update user' },
            500
        );
    }
});

// DELETE /api/users/me - Delete current user account
userRoutes.delete('/me', async (c) => {
    const userId = c.get('userId');

    try {
        const body = await c.req.json<{ password?: string; confirmText?: string }>();
        const password = body.password?.trim() || '';
        const confirmText = body.confirmText?.trim() || '';

        if (!password) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Password is required' },
                400
            );
        }

        if (confirmText.toUpperCase() !== 'DELETE') {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Please type DELETE to confirm' },
                400
            );
        }

        const user = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
            .bind(userId)
            .first<UserPasswordRow>();

        if (!user) {
            return c.json(
                { success: false, error: 'Not Found', message: 'User not found' },
                404
            );
        }

        const validPassword = await verifyPassword(password, user.password_hash);
        if (!validPassword) {
            return c.json(
                { success: false, error: 'Unauthorized', message: 'Password is incorrect' },
                401
            );
        }

        await c.env.DB.prepare('DELETE FROM projects WHERE owner_id = ?').bind(userId).run();
        await c.env.DB.prepare(
            `UPDATE tasks
             SET created_by = (
                SELECT owner_id FROM projects WHERE projects.id = tasks.project_id
             )
             WHERE created_by = ?`
        )
            .bind(userId)
            .run();
        await c.env.DB.prepare('UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?').bind(userId).run();
        await c.env.DB.prepare('DELETE FROM project_members WHERE user_id = ?').bind(userId).run();
        await c.env.DB.prepare('DELETE FROM comments WHERE user_id = ?').bind(userId).run();
        await c.env.DB.prepare('DELETE FROM attachments WHERE user_id = ?').bind(userId).run();
        await c.env.DB.prepare('DELETE FROM activity_log WHERE user_id = ?').bind(userId).run();
        await c.env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(userId).run();
        await c.env.DB.prepare('DELETE FROM user_preferences WHERE user_id = ?').bind(userId).run();
        await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

        deleteCookie(c, 'refresh_token', { path: '/' });

        return c.json({
            success: true,
            message: 'Account deleted successfully',
        });
    } catch (error) {
        console.error('Delete account error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to delete account' },
            500
        );
    }
});
