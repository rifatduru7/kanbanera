import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Kanban, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);

        try {
            // TODO: Implement actual reset password API
            await new Promise(resolve => setTimeout(resolve, 1500));
            setIsSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    // Invalid token state
    if (!token) {
        return (
            <div className="relative flex min-h-screen w-full flex-col overflow-hidden justify-center items-center bg-background">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 blur-[120px]" />
                </div>

                <main className="w-full max-w-lg px-4 relative z-10">
                    <div className="glass-card rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6 text-red-500">
                            <AlertCircle className="size-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-3">Invalid Link</h1>
                        <p className="text-slate-400 text-sm mb-8">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                        <Link
                            to="/forgot-password"
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center"
                        >
                            Request New Link
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden justify-center items-center bg-background">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 blur-[120px]" />
            </div>

            {/* Header */}
            <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
                <Link to="/" className="flex items-center gap-3 text-white">
                    <Kanban className="size-8 text-primary" />
                    <h2 className="text-white text-xl font-bold">ERA KANBAN</h2>
                </Link>
            </header>

            {/* Main */}
            <main className="w-full max-w-lg px-4 relative z-10">
                <div className="glass-card rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col items-center text-center">
                    {isSuccess ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6 text-green-500 border border-green-500/20">
                                <CheckCircle className="size-8" />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-3">Password Reset!</h1>
                            <p className="text-slate-400 text-sm mb-4">
                                Your password has been successfully reset. Redirecting to login...
                            </p>
                            <Loader2 className="size-6 text-primary animate-spin" />
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6 text-primary border border-primary/20">
                                <Lock className="size-8" />
                            </div>

                            <h1 className="text-3xl font-bold text-white mb-3">Set New Password</h1>
                            <p className="text-slate-400 text-sm mb-8 max-w-sm">
                                Create a strong password with at least 8 characters including letters and numbers.
                            </p>

                            {error && (
                                <div className="w-full mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                    <AlertCircle className="size-4" />
                                    {error}
                                </div>
                            )}

                            <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>
                                {/* New Password */}
                                <div className="text-left w-full">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <Lock className="size-5" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-12 pl-11 pr-12 bg-background/80 border border-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                            placeholder="Enter new password"
                                            required
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="text-left w-full">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <Lock className="size-5" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full h-12 pl-11 pr-4 bg-background/80 border border-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                            placeholder="Confirm new password"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 mt-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="size-5 animate-spin" />
                                            Resetting...
                                        </>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </main>

            <footer className="absolute bottom-6 w-full text-center z-10">
                <p className="text-slate-500 text-xs">© 2024 ERA KANBAN. Secure & Encrypted.</p>
            </footer>
        </div>
    );
}

export default ResetPasswordPage;
