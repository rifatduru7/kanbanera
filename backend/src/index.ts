import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './types';

import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { columnRoutes } from './routes/columns';
import { taskRoutes } from './routes/tasks';
import { userRoutes } from './routes/users';
import { attachmentRoutes } from './routes/attachments';

const app = new Hono<{ Bindings: Env }>();

// Global Middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use(
    '*',
    cors({
        origin: (_origin, c) => {
            const allowed = c.env.CORS_ORIGIN || 'http://localhost:5173';
            return allowed;
        },
        credentials: true,
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        exposeHeaders: ['Content-Length'],
        maxAge: 86400,
    })
);

// Health Check
app.get('/', (c) => {
    return c.json({
        success: true,
        message: 'ERA KANBAN API v1.0.0',
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/health', (c) => {
    return c.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/projects', projectRoutes);
app.route('/api/columns', columnRoutes);
app.route('/api/tasks', taskRoutes);
app.route('/api/users', userRoutes);
app.route('/api/attachments', attachmentRoutes);

// 404 Handler
app.notFound((c) => {
    return c.json(
        {
            success: false,
            error: 'Not Found',
            message: `Route ${c.req.method} ${c.req.path} not found`,
        },
        404
    );
});

// Error Handler
app.onError((err, c) => {
    console.error('Unhandled error:', err);
    return c.json(
        {
            success: false,
            error: 'Internal Server Error',
            message: err.message,
        },
        500
    );
});

export default app;
