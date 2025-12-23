import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Kanban, Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // TODO: Implement actual forgot password API
            // For now, simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden justify-center items-center bg-background">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 blur-[120px]" />
            </div>

            {/* Header */}
            <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
                <Link to="/" className="flex items-center gap-3 text-white">
                    <div className="size-8 flex items-center justify-center text-primary">
                        <Kanban className="size-8" />
                    </div>
                    <h2 className="text-white text-xl font-bold leading-tight tracking-tight">ERA KANBAN</h2>
                </Link>
            </header>

            {/* Main Content */}
            <main className="w-full max-w-lg px-4 relative z-10">
                <div className="glass-card rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col items-center text-center">
                    {/* Success State */}
                    {isSuccess ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6 text-green-500 border border-green-500/20">
                                <CheckCircle className="size-8" />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Check Your Email</h1>
                            <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8 max-w-sm">
                                We've sent a password reset link to <span className="text-primary font-medium">{email}</span>.
                                Please check your inbox and follow the instructions.
                            </p>
                            <Link
                                to="/login"
                                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                            >
                                Back to Login
                            </Link>
                            <p className="mt-6 text-slate-400 text-sm">
                                Didn't receive the email?{' '}
                                <button
                                    onClick={() => setIsSuccess(false)}
                                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                                >
                                    Try again
                                </button>
                            </p>
                        </>
                    ) : (
                        <>
                            {/* Icon */}
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6 text-primary border border-primary/20 shadow-[0_0_15px_rgba(19,146,236,0.3)]">
                                <Mail className="size-8" />
                            </div>

                            {/* Text */}
                            <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Forgot Password?</h1>
                            <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8 max-w-sm">
                                Don't worry, it happens to the best of us. Enter the email address associated with your account and we'll send you a link to reset your password.
                            </p>

                            {/* Error */}
                            {error && (
                                <div className="w-full mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Form */}
                            <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>
                                <div className="text-left w-full">
                                    <label className="block text-sm font-medium text-slate-300 mb-2 ml-1" htmlFor="email">
                                        Email Address
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                            <Mail className="size-5" />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-12 pl-11 pr-4 bg-background/80 border border-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                            placeholder="name@company.com"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 mt-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="size-5 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <span>Send Reset Link</span>
                                            <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Footer */}
                            <div className="mt-8 pt-6 border-t border-white/10 w-full">
                                <p className="text-slate-400 text-sm">
                                    Remember your password?{' '}
                                    <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors ml-1">
                                        Back to Login
                                    </Link>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="absolute bottom-6 w-full text-center z-10">
                <p className="text-slate-500 text-xs">
                    © 2024 ERA KANBAN. Secure & Encrypted.
                </p>
            </footer>
        </div>
    );
}

export default ForgotPasswordPage;
