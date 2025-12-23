import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import * as jose from 'jose';
import type { Env, JWTPayload } from '../types';

// Extend Hono context with user
declare module 'hono' {
    interface ContextVariableMap {
        user: JWTPayload;
        userId: string;
    }
}

/**
 * Auth middleware - validates JWT from Authorization header
 */
export async function authMiddleware(
    c: Context<{ Bindings: Env }>,
    next: Next
) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json(
            { success: false, error: 'Unauthorized', message: 'Missing or invalid Authorization header' },
            401
        );
    }

    const token = authHeader.substring(7);

    try {
        const secret = new TextEncoder().encode(c.env.JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);

        const user = payload as unknown as JWTPayload;
        c.set('user', user);
        c.set('userId', user.sub);

        await next();
    } catch (error) {
        if (error instanceof jose.errors.JWTExpired) {
            return c.json(
                { success: false, error: 'Token Expired', message: 'Access token has expired' },
                401
            );
        }
        return c.json(
            { success: false, error: 'Unauthorized', message: 'Invalid token' },
            401
        );
    }
}

/**
 * Optional auth - sets user if token exists, continues if not
 */
export async function optionalAuth(
    c: Context<{ Bindings: Env }>,
    next: Next
) {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
            const secret = new TextEncoder().encode(c.env.JWT_SECRET);
            const { payload } = await jose.jwtVerify(token, secret);

            const user = payload as unknown as JWTPayload;
            c.set('user', user);
            c.set('userId', user.sub);
        } catch {
            // Token invalid, continue without user
        }
    }

    await next();
}

/**
 * Generate access token (15 minutes)
 */
export async function generateAccessToken(
    secret: string,
    payload: Omit<JWTPayload, 'iat' | 'exp'>
): Promise<string> {
    const secretKey = new TextEncoder().encode(secret);

    const token = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(secretKey);

    return token;
}

/**
 * Generate refresh token (7 days)
 */
export async function generateRefreshToken(
    secret: string,
    userId: string
): Promise<string> {
    const secretKey = new TextEncoder().encode(secret);

    const token = await new jose.SignJWT({ sub: userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secretKey);

    return token;
}

/**
 * Verify refresh token from cookie
 */
export async function verifyRefreshToken(
    c: Context<{ Bindings: Env }>
): Promise<string | null> {
    const refreshToken = getCookie(c, 'refresh_token');

    if (!refreshToken) {
        return null;
    }

    try {
        const secret = new TextEncoder().encode(c.env.JWT_REFRESH_SECRET);
        const { payload } = await jose.jwtVerify(refreshToken, secret);
        return payload.sub as string;
    } catch {
        return null;
    }
}

/**
 * Hash password using Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify password
 */
export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}
