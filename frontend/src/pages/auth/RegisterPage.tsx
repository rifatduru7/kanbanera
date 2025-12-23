import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useRegister } from '../../hooks/useAuth';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState('');

    const register = useRegister();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!agreedToTerms) {
            setError('Please agree to the Terms & Privacy Policy');
            return;
        }

        register.mutate({ name, email, password }, {
            onError: (err) => {
                setError(err instanceof Error ? err.message : 'Registration failed');
            }
        });
    };

    return (
        <div className="min-h-screen flex relative overflow-hidden bg-background selection:bg-primary selection:text-white">
            {/* Animated Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 -left-4 w-[500px] h-[500px] bg-primary/20 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float" />
                <div className="absolute top-0 -right-4 w-[500px] h-[500px] bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float" style={{ animationDelay: '2s' }} />
                <div className="absolute -bottom-8 left-20 w-[500px] h-[500px] bg-teal-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float" style={{ animationDelay: '4s' }} />
            </div>

            {/* Left Side - Decorative (Hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 z-10 border-r border-border/30">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="size-10 text-primary">
                        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0)">
                                <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor" />
                                <path clipRule="evenodd" d="M7.24189 26.4066C7.31369 26.4411 7.64204 26.5637 8.52504 26.3738C9.59462 26.1438 11.0343 25.5311 12.7183 24.4963C14.7583 23.2426 17.0256 21.4503 19.238 19.238C21.4503 17.0256 23.2426 14.7583 24.4963 12.7183C25.5311 11.0343 26.1438 9.59463 26.3738 8.52504C26.5637 7.64204 26.4411 7.31369 26.4066 7.24189C26.345 7.21246 26.143 7.14535 25.6664 7.1918C24.9745 7.25925 23.9954 7.5498 22.7699 8.14278C20.3369 9.32007 17.3369 11.4915 14.4142 14.4142C11.4915 17.3369 9.32007 20.3369 8.14278 22.7699C7.5498 23.9954 7.25925 24.9745 7.1918 25.6664C7.14534 26.143 7.21246 26.345 7.24189 26.4066ZM29.9001 10.7285C29.4519 12.0322 28.7617 13.4172 27.9042 14.8126C26.465 17.1544 24.4686 19.6641 22.0664 22.0664C19.6641 24.4686 17.1544 26.465 14.8126 27.9042C13.4172 28.7617 12.0322 29.4519 10.7285 29.9001L21.5754 40.747C21.6001 40.7606 21.8995 40.931 22.8729 40.7217C23.9424 40.4916 25.3821 39.879 27.0661 38.8441C29.1062 37.5904 31.3734 35.7982 33.5858 33.5858C35.7982 31.3734 37.5904 29.1062 38.8441 27.0661C39.879 25.3821 40.4916 23.9425 40.7216 22.8729C40.931 21.8995 40.7606 21.6001 40.747 21.5754L29.9001 10.7285ZM29.2403 4.41187L43.5881 18.7597C44.9757 20.1473 44.9743 22.1235 44.6322 23.7139C44.2714 25.3919 43.4158 27.2666 42.252 29.1604C40.8128 31.5022 38.8165 34.012 36.4142 36.4142C34.012 38.8165 31.5022 40.8128 29.1604 42.252C27.2666 43.4158 25.3919 44.2714 23.7139 44.6322C22.1235 44.9743 20.1473 44.9757 18.7597 43.5881L4.41187 29.2403C3.29027 28.1187 3.08209 26.5973 3.21067 25.2783C3.34099 23.9415 3.8369 22.4852 4.54214 21.0277C5.96129 18.0948 8.43335 14.7382 11.5858 11.5858C14.7382 8.43335 18.0948 5.9613 21.0277 4.54214C22.4852 3.8369 23.9415 3.34099 25.2783 3.21067C26.5973 3.08209 28.1187 3.29028 29.2403 4.41187Z" fill="currentColor" fillRule="evenodd" />
                            </g>
                            <defs>
                                <clipPath id="clip0"><rect fill="white" height="48" width="48" /></clipPath>
                            </defs>
                        </svg>
                    </div>
                    <h2 className="text-white text-xl font-bold tracking-tight">ERA KANBAN</h2>
                </div>

                {/* Hero Content */}
                <div className="mb-20">
                    <h1 className="text-5xl font-bold leading-tight tracking-tight mb-6 bg-gradient-to-br from-white to-text-muted bg-clip-text text-transparent">
                        Visualize workflow,<br />maximize efficiency.
                    </h1>
                    <p className="text-xl text-text-muted max-w-lg leading-relaxed">
                        Join thousands of teams who are managing complex projects with clarity and speed. Your new era of productivity starts here.
                    </p>

                    {/* Abstract Visual */}
                    <div className="mt-12 flex gap-4 opacity-80">
                        <div className="h-32 w-24 rounded-lg bg-gradient-to-b from-border to-transparent border border-border flex flex-col p-3 gap-2">
                            <div className="h-2 w-8 bg-primary rounded-full mb-2" />
                            <div className="h-12 w-full bg-white/5 rounded" />
                            <div className="h-8 w-full bg-white/5 rounded" />
                        </div>
                        <div className="h-32 w-24 rounded-lg bg-gradient-to-b from-border to-transparent border border-border flex flex-col p-3 gap-2 mt-8">
                            <div className="h-2 w-8 bg-orange-400 rounded-full mb-2" />
                            <div className="h-10 w-full bg-white/5 rounded" />
                        </div>
                        <div className="h-32 w-24 rounded-lg bg-gradient-to-b from-border to-transparent border border-border flex flex-col p-3 gap-2 mt-4">
                            <div className="h-2 w-8 bg-purple-400 rounded-full mb-2" />
                            <div className="h-14 w-full bg-white/5 rounded" />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-sm text-text-muted opacity-60">
                    © 2024 Era Kanban Inc. All rights reserved.
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 z-10">
                <div className="w-full max-w-[520px]">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <div className="size-8 text-primary">
                            <svg fill="none" viewBox="0 0 48 48" className="w-full h-full">
                                <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor" />
                            </svg>
                        </div>
                        <h2 className="text-white text-lg font-bold">ERA KANBAN</h2>
                    </div>

                    {/* Glass Card */}
                    <div className="glass-card rounded-2xl overflow-hidden p-8 sm:p-10">
                        <div className="mb-8 text-center">
                            <h3 className="text-3xl font-bold text-white mb-2">Create your account</h3>
                            <p className="text-text-muted">Join thousands of teams managing projects.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                        <User className="size-5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="glass-input w-full pl-11 pr-4 py-3 rounded-xl"
                                        placeholder="Enter your full name"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                        <Mail className="size-5" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="glass-input w-full pl-11 pr-4 py-3 rounded-xl"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Passwords */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                                    <div className="relative group">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="glass-input w-full pl-4 pr-10 py-3 rounded-xl"
                                            placeholder="••••••••"
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                                    <div className="relative group">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="glass-input w-full pl-4 pr-10 py-3 rounded-xl"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Terms Checkbox */}
                            <div className="flex items-start pt-2">
                                <div className="flex items-center h-5">
                                    <input
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-600 bg-surface text-primary focus:ring-offset-surface focus:ring-primary cursor-pointer"
                                    />
                                </div>
                                <label className="ml-2 text-sm text-text-muted">
                                    I agree to the <a href="#" className="text-primary hover:underline font-medium">Terms</a> &amp; <a href="#" className="text-primary hover:underline font-medium">Privacy Policy</a>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={register.isPending}
                                className="w-full btn-primary py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-wait"
                            >
                                {register.isPending ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-600/50" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-3 bg-surface text-xs font-medium text-slate-400 rounded-full">or continue with</span>
                            </div>
                        </div>

                        {/* Social Buttons */}
                        <div className="grid grid-cols-2 gap-4">
                            <button className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-600 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium text-white">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                                    <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4" />
                                    <path d="M12.24 24.0008C15.4765 24.0008 18.2059 22.9382 20.1945 21.1039L16.3275 18.1055C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.24 24.0008Z" fill="#34A853" />
                                    <path d="M5.50253 14.3003C5.00236 12.8099 5.00236 11.1961 5.50253 9.70575V6.61481H1.5166C-0.18551 10.0056 -0.18551 14.0004 1.5166 17.3912L5.50253 14.3003Z" fill="#FBBC05" />
                                    <path d="M12.24 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.0344664 12.24 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.61481L5.50253 9.70575C6.45064 6.86173 9.10947 4.74966 12.24 4.74966Z" fill="#EA4335" />
                                </svg>
                                Google
                            </button>
                            <button className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-600 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium text-white">
                                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                                GitHub
                            </button>
                        </div>

                        {/* Login Link */}
                        <div className="mt-8 text-center text-sm text-text-muted">
                            Already have an account?{' '}
                            <Link to="/login" className="font-semibold text-primary hover:underline transition-colors">
                                Log in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
