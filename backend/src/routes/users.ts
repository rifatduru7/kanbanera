import { Hono } from 'hono';
import type { Env, UserPublic } from '../types';
import { authMiddleware } from '../middleware/auth';

export const userRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
userRoutes.use('*', authMiddleware);

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
            'SELECT id, email, full_name, avatar_url, role, created_at FROM users WHERE id = ?'
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
            'SELECT id, email, full_name, avatar_url, role, created_at FROM users WHERE id = ?'
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
