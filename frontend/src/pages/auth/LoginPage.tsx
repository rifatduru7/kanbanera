import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeClosed as EyeOff, GithubLogo as Github, EnvelopeSimple as Mail, CircleNotch as Loader2, WarningCircle as AlertCircle } from '@phosphor-icons/react';
import { isAxiosError } from 'axios';
import { authApi } from '../../lib/api/client';
import type { AppUser } from '../../stores/authStore';
import { useAuthStore } from '../../stores/authStore';
import { BrandLogoMark } from '../../components/ui/BrandLogoMark';

const getErrorMessage = (err: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(err)) {
        return err.response?.data?.message || err.message || fallback;
    }
    if (err instanceof Error) {
        return err.message;
    }
    return fallback;
};

export function LoginPage() {
    const navigate = useNavigate();
    const { setUser, setAccessToken } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaToken, setMfaToken] = useState<string | null>(null);
    const [mfaMethod, setMfaMethod] = useState<'totp' | 'email' | null>(null);
    const [mfaSentTo, setMfaSentTo] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await authApi.login(email, password);

            if (response.success && response.data) {
                const maybeMfa = response.data as {
                    mfa_required?: boolean;
                    mfa_token?: string;
                    mfa_method?: 'totp' | 'email';
                    mfa_sent_to?: string;
                    mfaRequired?: boolean;
                    mfaToken?: string;
                };
                const hasMfaChallenge = Boolean(
                    maybeMfa.mfa_required ||
                    maybeMfa.mfaRequired ||
                    maybeMfa.mfa_token ||
                    maybeMfa.mfaToken
                );

                if (hasMfaChallenge) {
                    const token = maybeMfa.mfa_token || maybeMfa.mfaToken || null;
                    if (!token) {
                        setError('2FA verification could not be started. Please try again.');
                        return;
                    }
                    setMfaRequired(true);
                    setMfaToken(token);
                    setMfaMethod(maybeMfa.mfa_method || null);
                    setMfaSentTo(maybeMfa.mfa_sent_to || null);
                    return;
                }

                // Case for normal login (no 2FA)
                if ('user' in response.data && 'accessToken' in response.data) {
                    setUser((response.data.user as AppUser) || null);
                    setAccessToken(response.data.accessToken || null);
                    navigate('/dashboard');
                }
            } else {
                setError(response.message || 'Login failed');
            }
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err, 'Login failed. Please try again.');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMfaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await authApi.verify2FA(mfaToken || '', mfaCode);

            if (response.success && response.data) {
                setUser((response.data.user as AppUser) || null);
                setAccessToken(response.data.accessToken || null);
                setMfaRequired(false);
                setMfaToken(null);
                setMfaMethod(null);
                setMfaSentTo(null);
                navigate('/dashboard');
            } else {
                setError(response.message || 'Invalid 2FA code');
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Verification failed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden mesh-bg">
            {/* Decorative Blurs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />

            {/* Main Container */}
            <div className="layout-container flex w-full flex-col p-3 sm:p-6 z-10 h-dvh-safe justify-center">
                {/* Glass Card */}
                <div className="glass-card mx-auto flex w-full max-w-[480px] flex-col overflow-hidden rounded-2xl p-5 sm:p-8">
                    {/* Logo & Header */}
                    <div className="flex flex-col items-center pb-6">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                            <BrandLogoMark className="size-8" animated={true} />
                        </div>
                        <h1 className="text-center text-3xl font-bold tracking-tight text-text mb-2">
                            {mfaRequired ? 'Two-Factor Auth' : 'Welcome Back'}
                        </h1>
                        <p className="text-center text-text-muted">
                            {mfaRequired
                                ? mfaMethod === 'email'
                                    ? `Enter the 6-digit code sent to ${mfaSentTo || 'your email'}.`
                                    : 'Enter the 6-digit code from your authenticator app.'
                                : 'Log in to manage your serverless projects.'}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle className="size-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {!mfaRequired ? (
                        /* Login Form */
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
                            {/* Email Field */}
                            <label className="flex flex-col gap-2">
                                <span className="text-sm font-medium text-text">Email</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="glass-input h-12 w-full rounded-xl border px-4 py-2 text-text placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                                    placeholder="name@example.com"
                                    required
                                    disabled={isLoading}
                                />
                            </label>

                            {/* Password Field */}
                            <label className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-text">Password</span>
                                    <Link
                                        to="/forgot-password"
                                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className="relative flex w-full items-center">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="glass-input h-12 w-full rounded-xl border px-4 py-2 text-text placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all pr-12"
                                        placeholder="Enter your password"
                                        required
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-0 bottom-0 px-4 flex items-center justify-center text-text-muted hover:text-text transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="size-5" />
                                        ) : (
                                            <Eye className="size-5" />
                                        )}
                                    </button>
                                </div>
                            </label>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 transition-all text-sm font-bold text-white shadow-lg shadow-primary/25 disabled:opacity-70"
                            >
                                {isLoading && <Loader2 className="size-4 animate-spin" />}
                                {isLoading ? 'Logging in...' : 'Log In'}
                            </button>

                            {/* Divider */}
                            <div className="relative my-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-surface px-2 text-text-muted rounded-full">
                                        Or continue with
                                    </span>
                                </div>
                            </div>

                            {/* Social Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface-alt hover:bg-surface-alt transition-colors text-text text-sm font-medium"
                                >
                                    <Github className="size-4" />
                                    <span>GitHub</span>
                                </button>
                                <button
                                    type="button"
                                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface-alt hover:bg-surface-alt transition-colors text-text text-sm font-medium"
                                >
                                    <Mail className="size-4" />
                                    <span>Google</span>
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* MFA Form */
                        <form onSubmit={handleMfaSubmit} className="flex flex-col gap-5 w-full">
                            <label className="flex flex-col gap-2">
                                <span className="text-sm font-medium text-text">Verification Code</span>
                                <input
                                    type="text"
                                    value={mfaCode}
                                    onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                    className="glass-input h-12 w-full rounded-xl border px-4 py-2 text-center text-2xl tracking-[0.5em] font-mono text-text placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                                    placeholder="000000"
                                    autoFocus
                                    required
                                    disabled={isLoading}
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={isLoading || mfaCode.length !== 6}
                                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 transition-all text-sm font-bold text-white shadow-lg shadow-primary/25 disabled:opacity-70"
                            >
                                {isLoading && <Loader2 className="size-4 animate-spin" />}
                                {isLoading ? 'Verifying...' : 'Verify & Log In'}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setMfaRequired(false);
                                    setMfaToken(null);
                                    setMfaMethod(null);
                                    setMfaSentTo(null);
                                    setError('');
                                    setMfaCode('');
                                }}
                                className="text-sm text-text-muted hover:text-text transition-colors"
                            >
                                Back to login
                            </button>
                        </form>
                    )}

                    {/* Footer Links (only if not MFA) */}
                    {!mfaRequired && (
                        <div className="mt-8 text-center text-sm text-text-muted">
                            Don't have an account?{' '}
                            <Link
                                to="/register"
                                className="font-semibold text-primary hover:text-primary/80 transition-colors ml-1"
                            >
                                Sign up
                            </Link>
                        </div>
                    )}
                </div>

                {/* Bottom Footer */}
                <div className="mt-6 flex justify-center flex-wrap gap-4 text-xs text-text-muted/60">
                    <a href="#" className="hover:text-text-muted transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-text-muted transition-colors">Terms of Service</a>
                    <a href="#" className="hover:text-text-muted transition-colors">Help Center</a>
                </div>
            </div>
        </div>
    );
}
