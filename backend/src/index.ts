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
import attachmentRoutes from './routes/attachments';
import metricsRoutes from './routes/metrics';
import activitiesRoutes from './routes/activities';
import searchRoutes from './routes/search';
import { adminRoutes } from './routes/admin';
import { webhookRoutes } from './routes/webhooks';
import { notificationRoutes } from './routes/notifications';
import { maintenanceMiddleware } from './middleware/maintenance';
import {
    apiRateLimit,
    authChallengeRateLimit,
    authCredentialRateLimit,
    authRefreshRateLimit,
    uploadRateLimit,
} from './middleware/rateLimit';

const app = new Hono<{ Bindings: Env }>();

// Global Middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', maintenanceMiddleware);
app.use(
    '*',
    cors({
        origin: (_origin, c) => {
            const requestOrigin = _origin || '';
            const configuredOrigins = (c.env.CORS_ORIGIN || 'http://localhost:5173')
                .split(',')
                .map((value: string) => value.trim())
                .filter(Boolean);

            if (!requestOrigin) {
                return configuredOrigins[0];
            }

            if (configuredOrigins.includes(requestOrigin)) {
                return requestOrigin;
            }

            return configuredOrigins[0];
        },
        credentials: true,
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        exposeHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
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

// Apply rate limiting per route group
app.use('/api/auth/login', authCredentialRateLimit);
app.use('/api/auth/register', authCredentialRateLimit);
app.use('/api/auth/forgot-password', authCredentialRateLimit);
app.use('/api/auth/reset-password', authCredentialRateLimit);
app.use('/api/auth/login/verify', authChallengeRateLimit);
app.use('/api/auth/2fa/email/enable/start', authCredentialRateLimit);
app.use('/api/auth/2fa/email/enable/verify', authChallengeRateLimit);
app.use('/api/auth/refresh', authRefreshRateLimit);

// Standard API rate limiting
app.use('/api/projects/*', apiRateLimit);
app.use('/api/columns/*', apiRateLimit);
app.use('/api/tasks/*', apiRateLimit);
app.use('/api/users/*', apiRateLimit);
app.use('/api/metrics', apiRateLimit);
app.use('/api/activities', apiRateLimit);
app.use('/api/search', apiRateLimit);
app.use('/api/admin/*', apiRateLimit);
app.use('/api/notifications/*', apiRateLimit);

// Upload rate limiting - stricter
app.use('/api/attachments/*', uploadRateLimit);

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/projects', projectRoutes);
app.route('/api/columns', columnRoutes);
app.route('/api/tasks', taskRoutes);
app.route('/api/users', userRoutes);
app.route('/api/attachments', attachmentRoutes);
app.route('/api/metrics', metricsRoutes);
app.route('/api/activities', activitiesRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/webhooks', webhookRoutes);
app.route('/api/notifications', notificationRoutes);

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
