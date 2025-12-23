import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Env, User } from '../types';
import {
    hashPassword,
    verifyPassword,
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from '../middleware/auth';

export const authRoutes = new Hono<{ Bindings: Env }>();

// POST /api/auth/register
authRoutes.post('/register', async (c) => {
    try {
        const body = await c.req.json();
        const { email, password, full_name } = body;

        // Validate input
        if (!email || !password || !full_name) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Email, password, and full_name are required' },
                400
            );
        }

        if (password.length < 8) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Password must be at least 8 characters' },
                400
            );
        }

        // Check if user exists
        const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
            .bind(email.toLowerCase())
            .first();

        if (existing) {
            return c.json(
                { success: false, error: 'Conflict', message: 'User with this email already exists' },
                409
            );
        }

        // Create user
        const userId = crypto.randomUUID();
        const passwordHash = await hashPassword(password);

        await c.env.DB.prepare(
            `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, 'member')`
        )
            .bind(userId, email.toLowerCase(), passwordHash, full_name)
            .run();

        // Generate tokens
        const accessToken = await generateAccessToken(c.env.JWT_SECRET, {
            sub: userId,
            email: email.toLowerCase(),
            role: 'member',
        });

        const refreshToken = await generateRefreshToken(c.env.JWT_REFRESH_SECRET, userId);

        // Set refresh token cookie
        setCookie(c, 'refresh_token', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return c.json({
            success: true,
            data: {
                user: {
                    id: userId,
                    email: email.toLowerCase(),
                    full_name,
                    role: 'member',
                },
                accessToken,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to register user' },
            500
        );
    }
});

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
    try {
        const body = await c.req.json();
        const { email, password } = body;

        if (!email || !password) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Email and password are required' },
                400
            );
        }

        // Find user
        const user = await c.env.DB.prepare(
            'SELECT id, email, password_hash, full_name, avatar_url, role FROM users WHERE email = ?'
        )
            .bind(email.toLowerCase())
            .first<User>();

        if (!user) {
            return c.json(
                { success: false, error: 'Unauthorized', message: 'Invalid email or password' },
                401
            );
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password_hash);

        if (!isValid) {
            return c.json(
                { success: false, error: 'Unauthorized', message: 'Invalid email or password' },
                401
            );
        }

        // Generate tokens
        const accessToken = await generateAccessToken(c.env.JWT_SECRET, {
            sub: user.id,
            email: user.email,
            role: user.role,
        });

        const refreshToken = await generateRefreshToken(c.env.JWT_REFRESH_SECRET, user.id);

        // Set refresh token cookie
        setCookie(c, 'refresh_token', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return c.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    avatar_url: user.avatar_url,
                    role: user.role,
                },
                accessToken,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to login' },
            500
        );
    }
});

// POST /api/auth/refresh
authRoutes.post('/refresh', async (c) => {
    try {
        const userId = await verifyRefreshToken(c);

        if (!userId) {
            return c.json(
                { success: false, error: 'Unauthorized', message: 'Invalid or expired refresh token' },
                401
            );
        }

        // Get user
        const user = await c.env.DB.prepare(
            'SELECT id, email, full_name, avatar_url, role FROM users WHERE id = ?'
        )
            .bind(userId)
            .first<User>();

        if (!user) {
            return c.json(
                { success: false, error: 'Unauthorized', message: 'User not found' },
                401
            );
        }

        // Generate new access token
        const accessToken = await generateAccessToken(c.env.JWT_SECRET, {
            sub: user.id,
            email: user.email,
            role: user.role,
        });

        return c.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    avatar_url: user.avatar_url,
                    role: user.role,
                },
                accessToken,
            },
        });
    } catch (error) {
        console.error('Refresh error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to refresh token' },
            500
        );
    }
});

// POST /api/auth/logout
authRoutes.post('/logout', async (c) => {
    deleteCookie(c, 'refresh_token', { path: '/' });

    return c.json({
        success: true,
        message: 'Logged out successfully',
    });
});

// GET /api/auth/me (requires auth - will be protected by middleware in index.ts if needed)
authRoutes.get('/me', async (c) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return c.json(
            { success: false, error: 'Unauthorized', message: 'Missing authorization' },
            401
        );
    }

    // This is a simplified check - in production, use the auth middleware
    const userId = await verifyRefreshToken(c);

    if (!userId) {
        return c.json(
            { success: false, error: 'Unauthorized', message: 'Invalid token' },
            401
        );
    }

    const user = await c.env.DB.prepare(
        'SELECT id, email, full_name, avatar_url, role, created_at FROM users WHERE id = ?'
    )
        .bind(userId)
        .first();

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
});
