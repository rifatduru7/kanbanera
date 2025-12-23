import { Context, MiddlewareHandler } from 'hono';

interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Maximum requests per window
    message?: string;      // Custom error message
    keyPrefix?: string;    // Prefix for D1 key
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// In-memory store for development (use D1 in production)
const memoryStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiter middleware using in-memory store.
 * For production, this should be replaced with D1 or KV storage.
 */
export function rateLimit(config: RateLimitConfig): MiddlewareHandler {
    const {
        windowMs = 60 * 1000, // 1 minute default
        maxRequests = 60,      // 60 requests per minute default
        message = 'Too many requests, please try again later.',
        keyPrefix = 'rl',
    } = config;

    return async (c: Context, next) => {
        // Get client IP or user ID for rate limiting
        const clientIP = c.req.header('cf-connecting-ip') ||
            c.req.header('x-forwarded-for')?.split(',')[0] ||
            c.req.header('x-real-ip') ||
            'unknown';

        const userId = c.get('userId') as string | undefined;
        const key = `${keyPrefix}:${userId || clientIP}`;
        const now = Date.now();

        // Get or create entry
        let entry = memoryStore.get(key);

        if (!entry || now >= entry.resetAt) {
            // Create new entry
            entry = {
                count: 1,
                resetAt: now + windowMs,
            };
            memoryStore.set(key, entry);
        } else {
            // Increment count
            entry.count++;
        }

        // Calculate remaining requests
        const remaining = Math.max(0, maxRequests - entry.count);
        const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);

        // Set rate limit headers
        c.header('X-RateLimit-Limit', String(maxRequests));
        c.header('X-RateLimit-Remaining', String(remaining));
        c.header('X-RateLimit-Reset', String(entry.resetAt));

        // Check if rate limit exceeded
        if (entry.count > maxRequests) {
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

        await next();
    };
}

/**
 * Stricter rate limit for authentication endpoints
 */
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,           // 5 attempts per 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.',
    keyPrefix: 'auth',
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

/**
 * Cleanup old entries from memory store (call periodically)
 */
export function cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
        if (now >= entry.resetAt) {
            memoryStore.delete(key);
        }
    }
}
