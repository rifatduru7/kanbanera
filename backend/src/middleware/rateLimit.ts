import { Context, MiddlewareHandler } from 'hono';

interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Maximum requests per window
    message?: string;      // Custom error message
    keyPrefix?: string;    // Prefix for key
    failOpen?: boolean;
    keyGenerator?: (c: Context) => Promise<string> | string;
}

interface RateLimitEntry {
    id: string;
    key: string;
    count: number;
    reset_at: number;
}

/**
 * Rate limiter middleware using D1 storage.
 * Works correctly across Cloudflare Workers isolates.
 */
export function rateLimit(config: RateLimitConfig): MiddlewareHandler {
    const {
        windowMs = 60 * 1000, // 1 minute default
        maxRequests = 60,      // 60 requests per minute default
        message = 'Too many requests, please try again later.',
        keyPrefix = 'rl',
        failOpen = true,
        keyGenerator,
    } = config;

    return async (c: Context, next) => {
        // CORS preflight requests should never consume rate-limit quota.
        if (c.req.method === 'OPTIONS') {
            await next();
            return;
        }

        // Get client IP or user ID for rate limiting
        const clientIP = c.req.header('cf-connecting-ip') ||
            c.req.header('x-forwarded-for')?.split(',')[0] ||
            c.req.header('x-real-ip') ||
            'unknown';

        const userId = c.get('userId') as string | undefined;
        let key = `${keyPrefix}:${userId || clientIP}`;
        const now = Date.now();

        try {
            if (keyGenerator) {
                const generatedKey = await keyGenerator(c);
                if (generatedKey) {
                    key = `${keyPrefix}:${generatedKey}`;
                }
            }

            const db = c.env.DB;

            // Clean up expired entries periodically (1 in 20 chance)
            if (Math.random() < 0.05) {
                await db.prepare('DELETE FROM rate_limits WHERE reset_at < ?')
                    .bind(now)
                    .run();
            }

            // Get current entry
            const entry = await db.prepare(
                'SELECT key, count, reset_at FROM rate_limits WHERE key = ?'
            )
                .bind(key)
                .first() as RateLimitEntry | null;

            let count: number;
            let resetAt: number;

            if (!entry || now >= entry.reset_at) {
                // Create new entry or reset expired one
                count = 1;
                resetAt = now + windowMs;

                await db.prepare(
                    `INSERT INTO rate_limits (id, key, count, reset_at) 
                     VALUES (?, ?, 1, ?)
                     ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = ?`
                )
                    .bind(crypto.randomUUID(), key, resetAt, resetAt)
                    .run();
            } else {
                // Increment count
                count = entry.count + 1;
                resetAt = entry.reset_at;

                await db.prepare(
                    'UPDATE rate_limits SET count = ? WHERE key = ?'
                )
                    .bind(count, key)
                    .run();
            }

            // Calculate remaining requests
            const remaining = Math.max(0, maxRequests - count);
            const resetInSeconds = Math.ceil((resetAt - now) / 1000);

            // Set rate limit headers
            c.header('X-RateLimit-Limit', String(maxRequests));
            c.header('X-RateLimit-Remaining', String(remaining));
            c.header('X-RateLimit-Reset', String(resetAt));

            // Check if rate limit exceeded
            if (count > maxRequests) {
                c.header('Retry-After', String(resetInSeconds));

                return c.json(
                    {
                        success: false,
                        message,
                        retryAfter: resetInSeconds,
                    },
                    429
                );
            }
        } catch (error) {
            console.error('Rate limit check failed:', error);
            if (!failOpen) {
                return c.json(
                    {
                        success: false,
                        error: 'Service Unavailable',
                        message: 'Rate limit service unavailable. Please try again shortly.',
                    },
                    503
                );
            }
        }

        await next();
    };
}

/**
 * Stricter rate limit for authentication endpoints
 */
export const authRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10,         // 10 attempts per 5 minutes
    message: 'Too many login attempts. Please try again in 5 minutes.',
    keyPrefix: 'auth',
    failOpen: false,
});

/**
 * Standard API rate limit
 */
export const apiRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,    // 100 requests per minute
    keyPrefix: 'api',
});

/**
 * Strict rate limit for file uploads
 */
export const uploadRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,          // 20 uploads per hour
    message: 'Upload limit reached. Please try again later.',
    keyPrefix: 'upload',
});

async function parseJsonBody(c: Context): Promise<Record<string, unknown>> {
    try {
        const contentType = c.req.header('Content-Type') || '';
        if (!contentType.includes('application/json')) return {};
        const raw = c.req.raw.clone();
        return await raw.json() as Record<string, unknown>;
    } catch {
        return {};
    }
}

function hashKeyPart(input: string): string {
    let hashValue = 0;
    for (let i = 0; i < input.length; i += 1) {
        hashValue = ((hashValue << 5) - hashValue) + input.charCodeAt(i);
        hashValue |= 0;
    }
    return Math.abs(hashValue).toString(36);
}

export const authCredentialRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    maxRequests: 10,
    message: 'Too many authentication attempts. Please try again in 5 minutes.',
    keyPrefix: 'auth-credential',
    failOpen: false,
    keyGenerator: async (c) => {
        const body = await parseJsonBody(c);
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : 'no-email';
        const ip = c.req.header('cf-connecting-ip')
            || c.req.header('x-forwarded-for')?.split(',')[0]
            || c.req.header('x-real-ip')
            || 'unknown';
        return `${ip}:${email}`;
    },
});

export const authChallengeRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    maxRequests: 10,
    message: 'Too many verification attempts. Please try again in 5 minutes.',
    keyPrefix: 'auth-challenge',
    failOpen: false,
    keyGenerator: async (c) => {
        const body = await parseJsonBody(c);
        const token = typeof body.mfa_token === 'string'
            ? body.mfa_token
            : typeof body.token === 'string'
                ? body.token
                : 'no-token';
        const ip = c.req.header('cf-connecting-ip')
            || c.req.header('x-forwarded-for')?.split(',')[0]
            || c.req.header('x-real-ip')
            || 'unknown';
        return `${ip}:${hashKeyPart(token)}`;
    },
});

export const authRefreshRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    maxRequests: 30,
    message: 'Too many refresh attempts. Please try again later.',
    keyPrefix: 'auth-refresh',
    failOpen: false,
    keyGenerator: (c) => {
        const cookieHeader = c.req.header('Cookie') || '';
        const tokenFragment = cookieHeader.includes('refresh_token=')
            ? hashKeyPart(cookieHeader)
            : 'no-cookie';
        const ip = c.req.header('cf-connecting-ip')
            || c.req.header('x-forwarded-for')?.split(',')[0]
            || c.req.header('x-real-ip')
            || 'unknown';
        return `${ip}:${tokenFragment}`;
    },
});
