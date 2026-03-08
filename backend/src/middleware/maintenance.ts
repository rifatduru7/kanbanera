import { Context, Next } from 'hono';
import type { Env } from '../types';
import * as jose from 'jose'; // Added jose import

/**
 * Maintenance Mode Middleware
 * Blocks non-admin users if maintenance_mode is enabled in system_settings.
 */
export async function maintenanceMiddleware(
    c: Context<{ Bindings: Env }>,
    next: Next
) {
    // Skip maintenance check for admin settings, auth, and health check
    const path = c.req.path;
    if (path.startsWith('/api/admin') || path.startsWith('/api/auth') || path === '/api/health' || path === '/') {
        await next();
        return;
    }

    try {
        const maintenanceSetting = await c.env.DB.prepare('SELECT value FROM system_settings WHERE key = ?')
            .bind('maintenance_mode')
            .first<{ value: string }>();

        if (maintenanceSetting?.value === 'true') {
            // Manually check for admin role from token to avoid closure issues
            const authHeader = c.req.header('Authorization');
            let isAdmin = false;

            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                try {
                    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
                    const { payload } = await jose.jwtVerify(token, secret);
                    if (payload && payload.role === 'admin') {
                        isAdmin = true;
                    }
                } catch {
                    // Token invalid
                }
            }

            if (!isAdmin) {
                return c.json(
                    {
                        success: false,
                        error: 'Maintenance Mode',
                        message: 'The platform is currently undergoing maintenance. Please try again later.'
                    },
                    503
                );
            }
        }
    } catch (error) {
        console.error('Maintenance middleware error:', error);
    }

    await next();
}
