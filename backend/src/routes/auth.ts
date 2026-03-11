import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Env, User } from '../types';
import {
    REFRESH_COOKIE_MAX_AGE_SECONDS,
    hashPassword,
    verifyPassword,
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    verifyAccessToken,
} from '../middleware/auth';
import { getEmailService } from '../services/email/getEmailService';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

export const authRoutes = new Hono<{ Bindings: Env }>();
const PASSWORD_RESET_TTL_MINUTES = 30;

interface TwoFactorUserRow {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    role: 'admin' | 'member';
    two_factor_enabled: number;
    two_factor_method: 'totp' | 'email' | null;
}

interface MfaChallengeRow {
    id: string;
    user_id: string;
    purpose: 'login_email' | 'enable_email_2fa';
    method: 'email';
    code_hash: string;
    expires_at: string;
    attempts: number;
    max_attempts: number;
    consumed_at: string | null;
    sent_to: string | null;
}

const MFA_CODE_TTL_MINUTES = 5;

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

        // Check if registration is allowed and get default role
        const [allowReg, defaultRole] = await Promise.all([
            c.env.DB.prepare('SELECT value FROM system_settings WHERE key = ?').bind('allow_registration').first<{ value: string }>(),
            c.env.DB.prepare('SELECT value FROM system_settings WHERE key = ?').bind('default_user_role').first<{ value: string }>(),
        ]);

        if (allowReg?.value === 'false') {
            return c.json(
                { success: false, error: 'Forbidden', message: 'Public registration is currently disabled' },
                403
            );
        }

        const role = (defaultRole?.value as 'admin' | 'member') || 'member';

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
             VALUES (?, ?, ?, ?, ?)`
        )
            .bind(userId, email.toLowerCase(), passwordHash, full_name, role)
            .run();

        // Generate tokens
        const accessToken = await generateAccessToken(c.env.JWT_SECRET, {
            sub: userId,
            email: email.toLowerCase(),
            role: role,
        });

        const refreshToken = await generateRefreshToken(c.env.JWT_REFRESH_SECRET, userId);

        setRefreshTokenCookie(c, refreshToken);

        return c.json({
            success: true,
            data: {
                user: {
                    id: userId,
                    email: email.toLowerCase(),
                    full_name,
                    role: role,
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

        // Check 2FA
        const twoFactorResult = await c.env.DB.prepare('SELECT two_factor_enabled, two_factor_method FROM users WHERE id = ?').bind(user.id).first<{ two_factor_enabled: number; two_factor_method: 'totp' | 'email' | null }>();

        if (twoFactorResult?.two_factor_enabled) {
            const method = twoFactorResult.two_factor_method || 'totp';
            let challengeId: string | undefined;
            let maskedEmail: string | undefined;

            if (method === 'email') {
                try {
                    const challenge = await createEmailChallenge(c, {
                        userId: user.id,
                        purpose: 'login_email',
                        email: user.email,
                        fullName: user.full_name,
                    });
                    challengeId = challenge.challengeId;
                    maskedEmail = challenge.maskedEmail;
                } catch (emailError) {
                    console.error('Failed to send 2FA email:', emailError);
                    return c.json(
                        { success: false, error: 'Service Unavailable', message: 'Failed to send 2FA verification email' },
                        503
                    );
                }
            }

            const mfaToken = await generateAccessToken(c.env.JWT_SECRET, {
                sub: user.id,
                email: user.email,
                role: user.role,
                mfa_pending: true,
                mfa_method: method as 'totp' | 'email',
                challenge_id: challengeId,
            }, '5m');

            return c.json({
                success: true,
                data: {
                    mfa_required: true,
                    mfa_token: mfaToken,
                    mfa_method: method,
                    mfa_sent_to: maskedEmail
                }
            });
        }

        // Generate tokens
        const accessToken = await generateAccessToken(c.env.JWT_SECRET, {
            sub: user.id,
            email: user.email,
            role: user.role,
        });

        const refreshToken = await generateRefreshToken(c.env.JWT_REFRESH_SECRET, user.id);

        setRefreshTokenCookie(c, refreshToken);

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

// POST /api/auth/login/verify
authRoutes.post('/login/verify', async (c) => {
    try {
        const body = await c.req.json();
        const { mfa_token, code } = body;

        if (!mfa_token || !code) {
            return c.json({ success: false, error: 'Validation Error', message: 'MFA token and code are required' }, 400);
        }

        // Verify MFA token
        const payload = await verifyAccessToken(c, mfa_token, { allowMfaPending: true });
        if (!payload || !payload.mfa_pending) {
            return c.json({ success: false, error: 'Unauthorized', message: 'Invalid or expired MFA token' }, 401);
        }

        const userId = payload.sub;

        // Get user for verification and tokens
        const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<User>();
        if (!user) {
            return c.json({ success: false, error: 'Unauthorized', message: 'User not found' }, 401);
        }

        // Verify code
        if (payload.mfa_method === 'email') {
            if (!payload.challenge_id) {
                return c.json({ success: false, error: 'Unauthorized', message: 'Invalid MFA session' }, 401);
            }
            const challengeResult = await verifyEmailChallenge(c, {
                challengeId: payload.challenge_id,
                userId,
                purpose: 'login_email',
                code,
            });

            if (!challengeResult.success) {
                const message = challengeResult.reason === 'expired'
                    ? 'Verification code has expired'
                    : 'Invalid verification code';
                return c.json({ success: false, error: 'Unauthorized', message }, 401);
            }
        } else {
            if (!user.two_factor_secret) {
                return c.json({ success: false, error: 'Unauthorized', message: '2FA not set up' }, 401);
            }

            // Verify TOTP
            const totp = new OTPAuth.TOTP({
                issuer: 'ERA KANBAN',
                label: user.email,
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: user.two_factor_secret,
            });

            const delta = totp.validate({ token: code, window: 1 });
            if (delta === null) {
                return c.json({ success: false, error: 'Unauthorized', message: 'Invalid 2FA code' }, 401);
            }
        }

        // Generate final tokens
        const accessToken = await generateAccessToken(c.env.JWT_SECRET, {
            sub: user.id,
            email: user.email,
            role: user.role,
        });

        const refreshToken = await generateRefreshToken(c.env.JWT_REFRESH_SECRET, user.id);

        setRefreshTokenCookie(c, refreshToken);

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
        console.error('MFA verify error:', error);
        return c.json({ success: false, error: 'Server Error', message: 'Failed to verify 2FA' }, 500);
    }
});

// 2FA Routes (Protected)
authRoutes.get('/2fa/setup', async (c) => {
    const payload = await verifyAccessToken(c);
    if (!payload) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const userId = payload.sub;

    try {
        const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<{ email: string }>();
        if (!user) return c.json({ success: false, error: 'Not Found' }, 404);

        // Generate secret
        const secret = new OTPAuth.Secret({ size: 20 });
        const secretBase32 = secret.base32;

        const totp = new OTPAuth.TOTP({
            issuer: 'ERA KANBAN',
            label: user.email,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: secret,
        });

        const otpauthUrl = totp.toString();
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        return c.json({
            success: true,
            data: {
                secret: secretBase32,
                qrCode: qrCodeDataUrl
            }
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        return c.json({ success: false, error: 'Server Error' }, 500);
    }
});

authRoutes.post('/2fa/enable', async (c) => {
    const payload = await verifyAccessToken(c);
    if (!payload) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const userId = payload.sub;

    try {
        const body = await c.req.json();
        const { secret, code } = body;

        if (!secret || !code) {
            return c.json({ success: false, error: 'Validation Error', message: 'Secret and code are required' }, 400);
        }

        const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<{ email: string }>();
        if (!user) return c.json({ success: false, error: 'Not Found' }, 404);

        // Verify TOTP
        const totp = new OTPAuth.TOTP({
            issuer: 'ERA KANBAN',
            label: user.email,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(secret),
        });

        const delta = totp.validate({ token: code, window: 1 });
        if (delta === null) {
            return c.json({ success: false, error: 'Unauthorized', message: 'Invalid 2FA code' }, 401);
        }

        // Save secret and enable
        await c.env.DB.prepare(
            'UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1, two_factor_method = \'totp\', updated_at = (datetime(\'now\')) WHERE id = ?'
        )
            .bind(secret, userId)
            .run();

        const updatedUser = await c.env.DB.prepare(
            'SELECT id, email, full_name, avatar_url, role, two_factor_enabled, two_factor_method FROM users WHERE id = ?'
        )
            .bind(userId)
            .first<TwoFactorUserRow>();

        if (!updatedUser) {
            return c.json({ success: false, error: 'Server Error', message: 'Failed to load updated user' }, 500);
        }

        return c.json({
            success: true,
            data: {
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    full_name: updatedUser.full_name,
                    avatar_url: updatedUser.avatar_url,
                    role: updatedUser.role,
                    two_factor_enabled: updatedUser.two_factor_enabled === 1,
                    two_factor_method: updatedUser.two_factor_method,
                }
            },
            message: 'Two-factor authentication enabled successfully'
        });
    } catch (error) {
        console.error('2FA enable error:', error);
        return c.json({ success: false, error: 'Server Error' }, 500);
    }
});

authRoutes.post('/2fa/disable', async (c) => {
    const payload = await verifyAccessToken(c);
    if (!payload) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const userId = payload.sub;

    try {
        const body = await c.req.json();
        const { code } = body;

        const user = await c.env.DB.prepare('SELECT email, two_factor_secret FROM users WHERE id = ?').bind(userId).first<{ email: string, two_factor_secret: string }>();
        if (!user || !user.two_factor_secret) {
            return c.json({ success: false, error: 'Bad Request', message: '2FA not enabled' }, 400);
        }

        // Verify code before disabling
        const totp = new OTPAuth.TOTP({
            issuer: 'ERA KANBAN',
            label: user.email,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: user.two_factor_secret,
        });

        const delta = totp.validate({ token: code, window: 1 });
        if (delta === null) {
            return c.json({ success: false, error: 'Unauthorized', message: 'Invalid 2FA code' }, 401);
        }

        await c.env.DB.prepare(
            'UPDATE users SET two_factor_secret = NULL, two_factor_enabled = 0, two_factor_method = NULL, updated_at = (datetime(\'now\')) WHERE id = ?'
        )
            .bind(userId)
            .run();

        const updatedUser = await c.env.DB.prepare(
            'SELECT id, email, full_name, avatar_url, role, two_factor_enabled, two_factor_method FROM users WHERE id = ?'
        )
            .bind(userId)
            .first<TwoFactorUserRow>();

        if (!updatedUser) {
            return c.json({ success: false, error: 'Server Error', message: 'Failed to load updated user' }, 500);
        }

        return c.json({
            success: true,
            data: {
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    full_name: updatedUser.full_name,
                    avatar_url: updatedUser.avatar_url,
                    role: updatedUser.role,
                    two_factor_enabled: updatedUser.two_factor_enabled === 1,
                    two_factor_method: updatedUser.two_factor_method
                }
            },
            message: 'Two-factor authentication disabled successfully'
        });
    } catch (error) {
        console.error('2FA disable error:', error);
        return c.json({ success: false, error: 'Server Error' }, 500);
    }
});

// Email 2FA Routes
authRoutes.post('/2fa/email/enable/start', async (c) => {
    const payload = await verifyAccessToken(c);
    if (!payload) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const userId = payload.sub;

    try {
        const body = await c.req.json<{ password?: string }>();
        const password = body.password || '';

        if (!password) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Password is required' },
                400
            );
        }

        const user = await c.env.DB.prepare(
            'SELECT id, email, full_name, password_hash, two_factor_enabled, two_factor_method FROM users WHERE id = ?'
        )
            .bind(userId)
            .first<User & { two_factor_enabled: number; two_factor_method: 'totp' | 'email' | null }>();

        if (!user) {
            return c.json({ success: false, error: 'Not Found', message: 'User not found' }, 404);
        }

        const passwordValid = await verifyPassword(password, user.password_hash);
        if (!passwordValid) {
            return c.json({ success: false, error: 'Unauthorized', message: 'Current password is incorrect' }, 401);
        }

        try {
            const challenge = await createEmailChallenge(c, {
                userId,
                purpose: 'enable_email_2fa',
                email: user.email,
                fullName: user.full_name,
            });

            const token = await generateAccessToken(c.env.JWT_SECRET, {
                sub: user.id,
                email: user.email,
                role: user.role,
                mfa_pending: true,
                mfa_method: 'email',
                challenge_id: challenge.challengeId,
            }, '5m');

            return c.json({
                success: true,
                data: {
                    token,
                    sent_to: challenge.maskedEmail,
                },
                message: 'Verification code sent'
            });
        } catch (emailError) {
            console.error('Email 2FA enable start error:', emailError);
            return c.json(
                { success: false, error: 'Service Unavailable', message: 'Failed to send verification email' },
                503
            );
        }
    } catch (error) {
        console.error('Email 2FA enable start error:', error);
        return c.json({ success: false, error: 'Server Error' }, 500);
    }
});

authRoutes.post('/2fa/email/enable/verify', async (c) => {
    const payload = await verifyAccessToken(c);
    if (!payload) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const userId = payload.sub;

    try {
        const body = await c.req.json<{ token?: string; code?: string }>();
        const token = body.token || '';
        const code = body.code || '';

        if (!token || !code) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'token and code are required' },
                400
            );
        }

        const verificationPayload = await verifyAccessToken(c, token, { allowMfaPending: true });
        if (!verificationPayload || !verificationPayload.challenge_id || verificationPayload.sub !== userId) {
            return c.json({ success: false, error: 'Unauthorized', message: 'Invalid verification token' }, 401);
        }

        const challengeResult = await verifyEmailChallenge(c, {
            challengeId: verificationPayload.challenge_id,
            userId,
            purpose: 'enable_email_2fa',
            code,
        });

        if (!challengeResult.success) {
            const message = challengeResult.reason === 'expired'
                ? 'Verification code has expired'
                : 'Invalid verification code';
            return c.json({ success: false, error: 'Unauthorized', message }, 401);
        }

        await c.env.DB.prepare(
            'UPDATE users SET two_factor_enabled = 1, two_factor_method = \'email\', two_factor_secret = NULL, updated_at = (datetime(\'now\')) WHERE id = ?'
        )
            .bind(userId)
            .run();

        const updatedUser = await c.env.DB.prepare(
            'SELECT id, email, full_name, avatar_url, role, two_factor_enabled, two_factor_method FROM users WHERE id = ?'
        )
            .bind(userId)
            .first<User>();

        return c.json({
            success: true,
            data: {
                user: updatedUser
            },
            message: 'Email-based two-factor authentication enabled successfully'
        });
    } catch (error) {
        console.error('Email 2FA enable verify error:', error);
        return c.json({ success: false, error: 'Server Error' }, 500);
    }
});

authRoutes.post('/2fa/email/disable', async (c) => {
    const payload = await verifyAccessToken(c);
    if (!payload) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const userId = payload.sub;

    try {
        await c.env.DB.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_method = NULL, updated_at = (datetime(\'now\')) WHERE id = ?')
            .bind(userId)
            .run();

        const updatedUser = await c.env.DB.prepare('SELECT id, email, full_name, avatar_url, role, two_factor_enabled, two_factor_method FROM users WHERE id = ?')
            .bind(userId)
            .first<User>();

        return c.json({
            success: true,
            data: {
                user: updatedUser
            },
            message: 'Email-based two-factor authentication disabled successfully'
        });
    } catch (error) {
        console.error('Email 2FA disable error:', error);
        return c.json({ success: false, error: 'Server Error' }, 500);
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

// POST /api/auth/forgot-password
authRoutes.post('/forgot-password', async (c) => {
    try {
        const body = await c.req.json<{ email?: string }>();
        const email = body.email?.trim().toLowerCase();

        if (!email) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Email is required' },
                400
            );
        }

        const user = await c.env.DB.prepare(
            'SELECT id, email, full_name FROM users WHERE email = ?'
        )
            .bind(email)
            .first<{ id: string; email: string; full_name: string }>();

        if (user) {
            const rawToken = generatePasswordResetToken();
            const tokenHash = await hashToken(rawToken);

            await c.env.DB.prepare(
                `DELETE FROM password_reset_tokens 
                 WHERE user_id = ? OR expires_at <= datetime('now')`
            )
                .bind(user.id)
                .run();

            await c.env.DB.prepare(
                `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
                 VALUES (?, ?, ?, datetime('now', ?))`
            )
                .bind(
                    crypto.randomUUID(),
                    user.id,
                    tokenHash,
                    `+${PASSWORD_RESET_TTL_MINUTES} minutes`
                )
                .run();

            const baseUrl = resolveAppBaseUrl(c.env.APP_BASE_URL);
            const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

            try {
                const emailService = await getEmailService(c.env);
                await emailService.sendPasswordResetEmail({
                    to: user.email,
                    name: user.full_name,
                    resetLink,
                    expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
                });
            } catch (emailError) {
                console.error('Forgot password email send error:', emailError);
            }
        }

        return c.json({
            success: true,
            message: 'If an account exists for this email, a reset link has been sent.',
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to process forgot password request' },
            500
        );
    }
});

// POST /api/auth/reset-password
authRoutes.post('/reset-password', async (c) => {
    try {
        const body = await c.req.json<{ token?: string; newPassword?: string }>();
        const token = body.token?.trim();
        const newPassword = body.newPassword || '';

        if (!token || !newPassword) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'token and newPassword are required' },
                400
            );
        }

        if (newPassword.length < 8) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Password must be at least 8 characters' },
                400
            );
        }

        const tokenHash = await hashToken(token);
        const tokenRecord = await c.env.DB.prepare(
            `SELECT id, user_id, expires_at, used_at
             FROM password_reset_tokens
             WHERE token_hash = ?`
        )
            .bind(tokenHash)
            .first<{ id: string; user_id: string; expires_at: string; used_at: string | null }>();

        if (!tokenRecord) {
            return c.json(
                { success: false, error: 'Invalid Token', message: 'Invalid password reset token' },
                400
            );
        }

        if (tokenRecord.used_at) {
            return c.json(
                { success: false, error: 'Invalid Token', message: 'This token has already been used' },
                400
            );
        }

        const expired = await c.env.DB.prepare(
            `SELECT 1 as is_expired
             WHERE datetime(?) <= datetime('now')`
        )
            .bind(tokenRecord.expires_at)
            .first<{ is_expired: number }>();

        if (expired) {
            return c.json(
                { success: false, error: 'Token Expired', message: 'Password reset token has expired' },
                401
            );
        }

        const newHash = await hashPassword(newPassword);

        await c.env.DB.prepare(
            `UPDATE users 
             SET password_hash = ?, updated_at = datetime('now')
             WHERE id = ?`
        )
            .bind(newHash, tokenRecord.user_id)
            .run();

        await c.env.DB.prepare(
            `UPDATE password_reset_tokens 
             SET used_at = datetime('now')
             WHERE user_id = ? AND used_at IS NULL`
        )
            .bind(tokenRecord.user_id)
            .run();

        return c.json({
            success: true,
            message: 'Password reset successful',
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to reset password' },
            500
        );
    }
});

// GET /api/auth/me (validates access token from Authorization header)
authRoutes.get('/me', async (c) => {
    const payload = await verifyAccessToken(c);

    if (!payload) {
        return c.json(
            { success: false, error: 'Unauthorized', message: 'Invalid or missing access token' },
            401
        );
    }
    const userId = payload.sub;

    const user = await c.env.DB.prepare(
        'SELECT id, email, full_name, avatar_url, role, created_at, two_factor_enabled, two_factor_method FROM users WHERE id = ?'
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

// PUT /api/auth/password - Change password
authRoutes.put('/password', async (c) => {
    const payload = await verifyAccessToken(c);

    if (!payload) {
        return c.json(
            { success: false, error: 'Unauthorized', message: 'Invalid or missing access token' },
            401
        );
    }
    const userId = payload.sub;

    try {
        const body = await c.req.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Current and new passwords are required' },
                400
            );
        }

        if (newPassword.length < 8) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'New password must be at least 8 characters' },
                400
            );
        }

        // Get user's current password hash
        const user = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
            .bind(userId)
            .first<{ password_hash: string }>();

        if (!user) {
            return c.json(
                { success: false, error: 'Not Found', message: 'User not found' },
                404
            );
        }

        // Verify current password
        const isAdminValid = await verifyPassword(currentPassword, user.password_hash);
        if (!isAdminValid) {
            return c.json(
                { success: false, error: 'Unauthorized', message: 'Current password is incorrect' },
                401
            );
        }

        // Hash and update new password
        const newHash = await hashPassword(newPassword);
        await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(newHash, userId)
            .run();

        return c.json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error) {
        console.error('Change password error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to update password' },
            500
        );
    }
});

function generatePasswordResetToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
}

async function hashToken(token: string): Promise<string> {
    const encoded = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function resolveAppBaseUrl(appBaseUrl?: string): string {
    const fallbackUrl = 'http://localhost:5173';
    const candidate = (appBaseUrl || fallbackUrl).trim();
    try {
        const parsed = new URL(candidate);
        return parsed.toString().replace(/\/+$/, '');
    } catch {
        return fallbackUrl;
    }
}

function generateMfaCode(): string {
    const bytes = new Uint8Array(3);
    crypto.getRandomValues(bytes);
    const code = (bytes[0] << 16 | bytes[1] << 8 | bytes[2]) % 1000000;
    return code.toString().padStart(6, '0');
}

function setRefreshTokenCookie(c: Parameters<typeof setCookie>[0], refreshToken: string) {
    setCookie(c, 'refresh_token', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
        path: '/',
    });
}

function isExpired(dateValue: string): boolean {
    return Number.isNaN(Date.parse(dateValue)) || Date.parse(dateValue) <= Date.now();
}

async function createEmailChallenge(
    c: { env: Env },
    params: {
        userId: string;
        purpose: 'login_email' | 'enable_email_2fa';
        email: string;
        fullName: string;
    }
): Promise<{ challengeId: string; maskedEmail: string }> {
    const code = generateMfaCode();
    const codeHash = await hashToken(code);
    const challengeId = crypto.randomUUID();

    const emailService = await getEmailService(c.env);
    await emailService.sendTwoFactorCodeEmail({
        to: params.email,
        name: params.fullName,
        code,
        expiresInMinutes: MFA_CODE_TTL_MINUTES,
    });

    await c.env.DB.prepare(
        `DELETE FROM mfa_challenges
         WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL`
    )
        .bind(params.userId, params.purpose)
        .run();

    await c.env.DB.prepare(
        `INSERT INTO mfa_challenges (
            id, user_id, purpose, method, code_hash, expires_at, sent_to
         ) VALUES (?, ?, ?, 'email', ?, datetime('now', ?), ?)`
    )
        .bind(
            challengeId,
            params.userId,
            params.purpose,
            codeHash,
            `+${MFA_CODE_TTL_MINUTES} minutes`,
            params.email
        )
        .run();

    return { challengeId, maskedEmail: maskEmail(params.email) };
}

async function verifyEmailChallenge(
    c: { env: Env },
    params: {
        challengeId: string;
        userId: string;
        purpose: 'login_email' | 'enable_email_2fa';
        code: string;
    }
): Promise<{ success: true } | { success: false; reason: 'invalid' | 'expired' | 'exhausted' }> {
    const challenge = await c.env.DB.prepare(
        `SELECT *
         FROM mfa_challenges
         WHERE id = ? AND user_id = ? AND purpose = ? AND consumed_at IS NULL`
    )
        .bind(params.challengeId, params.userId, params.purpose)
        .first<MfaChallengeRow>();

    if (!challenge) {
        return { success: false, reason: 'invalid' };
    }

    if (challenge.attempts >= challenge.max_attempts) {
        return { success: false, reason: 'exhausted' };
    }

    if (isExpired(challenge.expires_at)) {
        return { success: false, reason: 'expired' };
    }

    const providedCodeHash = await hashToken(params.code);
    if (providedCodeHash !== challenge.code_hash) {
        await c.env.DB.prepare(
            `UPDATE mfa_challenges
             SET attempts = attempts + 1
             WHERE id = ?`
        )
            .bind(challenge.id)
            .run();
        return { success: false, reason: 'invalid' };
    }

    await c.env.DB.prepare(
        `UPDATE mfa_challenges
         SET consumed_at = datetime('now')
         WHERE id = ?`
    )
        .bind(challenge.id)
        .run();

    return { success: true };
}

function maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    if (user.length <= 2) return `${user[0]}***@${domain}`;
    return `${user[0]}${user[1]}***${user[user.length - 1]}@${domain}`;
}
