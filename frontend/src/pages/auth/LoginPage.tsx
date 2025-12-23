import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Kanban, Github, Mail, Loader2, AlertCircle } from 'lucide-react';
import { authApi } from '../../lib/api/client';
import { useAuthStore } from '../../stores/authStore';

export function LoginPage() {
    const navigate = useNavigate();
    const { setUser, setAccessToken } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await authApi.login(email, password);

            if (response.success && response.data) {
                setUser(response.data.user);
                setAccessToken(response.data.accessToken);
                navigate('/dashboard');
            } else {
                setError(response.message || 'Login failed');
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Login failed. Please try again.';
            setError(errorMessage);
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
            <div className="layout-container flex w-full flex-col p-4 sm:p-6 z-10">
                {/* Glass Card */}
                <div className="glass-card mx-auto flex w-full max-w-[480px] flex-col overflow-hidden rounded-2xl p-8 sm:p-10">
                    {/* Logo & Header */}
                    <div className="flex flex-col items-center pb-6">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                            <Kanban className="size-8" />
                        </div>
                        <h1 className="text-center text-3xl font-bold tracking-tight text-white mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-center text-text-muted">
                            Log in to manage your serverless projects.
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle className="size-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
                        {/* Email Field */}
                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-white/90">Email</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="glass-input h-12 w-full rounded-xl border px-4 py-2 text-white placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                                placeholder="name@example.com"
                                required
                                disabled={isLoading}
                            />
                        </label>

                        {/* Password Field */}
                        <label className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-white/90">Password</span>
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
                                    className="glass-input h-12 w-full rounded-xl border px-4 py-2 text-white placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all pr-12"
                                    placeholder="Enter your password"
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 top-0 bottom-0 px-4 flex items-center justify-center text-text-muted hover:text-white transition-colors"
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
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#16212b] px-2 text-text-muted rounded-full">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        {/* Social Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white text-sm font-medium"
                            >
                                <Github className="size-4" />
                                <span>GitHub</span>
                            </button>
                            <button
                                type="button"
                                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white text-sm font-medium"
                            >
                                <Mail className="size-4" />
                                <span>Google</span>
                            </button>
                        </div>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-8 text-center text-sm text-text-muted">
                        Don't have an account?{' '}
                        <Link
                            to="/register"
                            className="font-semibold text-primary hover:text-primary/80 transition-colors ml-1"
                        >
                            Sign up
                        </Link>
                    </div>
                </div>

                {/* Bottom Footer */}
                <div className="mt-8 flex justify-center gap-6 text-xs text-text-muted/60">
                    <a href="#" className="hover:text-text-muted transition-colors">
                        Privacy Policy
                    </a>
                    <a href="#" className="hover:text-text-muted transition-colors">
                        Terms of Service
                    </a>
                    <a href="#" className="hover:text-text-muted transition-colors">
                        Help Center
                    </a>
                </div>
            </div>
        </div>
    );
}
