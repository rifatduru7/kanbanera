import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LockKey as Lock, Eye, EyeClosed as EyeOff, CircleNotch as Loader2, CheckCircle, WarningCircle as AlertCircle } from '@phosphor-icons/react';
import { authApi } from '../../lib/api/client';
import { useTranslation } from 'react-i18next';
import { BrandLogoMark } from '../../components/ui/BrandLogoMark';

export function ResetPasswordPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (!token) {
            setError(t('auth.error.invalid_reset_token'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.error.passwords_dont_match'));
            return;
        }

        if (password.length < 8) {
            setError(t('auth.error.password_too_short'));
            return;
        }

        setIsLoading(true);

        try {
            const response = await authApi.resetPassword(token, password);
            if (!response.success) {
                setError(response.message || t('auth.error.failed_to_reset'));
                return;
            }

            setIsSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (requestError: unknown) {
            const message = requestError instanceof Error ? requestError.message : t('auth.error.failed_to_reset');
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="relative flex min-h-screen w-full flex-col overflow-hidden justify-center items-center bg-background px-4">
                <main className="w-full max-w-lg z-10">
                    <div className="glass-card rounded-2xl p-5 sm:p-8 md:p-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6 text-red-500">
                            <AlertCircle className="size-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-text mb-3">{t('auth.invalid_link')}</h1>
                        <p className="text-text-muted text-sm mb-8">
                            {t('auth.invalid_link_subtitle')}
                        </p>
                        <Link
                            to="/forgot-password"
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center"
                        >
                            {t('auth.request_new_link')}
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden justify-center items-center bg-background px-4">
            <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary/20 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-teal-500/10 blur-[120px]" />

            <header className="absolute top-0 left-0 w-full p-4 sm:p-6 z-20">
                <Link to="/login" className="flex items-center gap-3 text-text w-fit">
                    <BrandLogoMark className="size-8 text-primary" animated={true} />
                    <h2 className="text-xl font-bold">ERA KANBAN</h2>
                </Link>
            </header>

            <main className="w-full max-w-lg z-10">
                <div className="glass-card rounded-2xl p-5 sm:p-8 md:p-10 flex flex-col items-center text-center">
                    {isSuccess ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/20 flex items-center justify-center mb-6 text-green-500">
                                <CheckCircle className="size-8" />
                            </div>
                            <h1 className="text-3xl font-bold text-text mb-3">{t('auth.password_updated')}</h1>
                            <p className="text-text-muted text-sm mb-4">{t('auth.redirecting_to_login')}</p>
                            <Loader2 className="size-6 text-primary animate-spin" />
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center mb-6 text-primary">
                                <Lock className="size-8" />
                            </div>

                            <h1 className="text-3xl font-bold text-text mb-3">{t('auth.set_new_password')}</h1>
                            <p className="text-text-muted text-sm mb-8 max-w-sm">
                                {t('auth.set_new_password_subtitle')}
                            </p>

                            {error ? (
                                <div className="w-full mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                    <AlertCircle className="size-4" />
                                    {error}
                                </div>
                            ) : null}

                            <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>
                                <div className="text-left w-full">
                                    <label className="block text-sm font-medium text-text mb-2">{t('auth.password_label')}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted">
                                            <Lock className="size-5" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            className="glass-input w-full h-12 pl-11 pr-12 rounded-xl"
                                            placeholder={t('auth.new_password_placeholder')}
                                            required
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="text-left w-full">
                                    <label className="block text-sm font-medium text-text mb-2">{t('auth.confirm_password_label')}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted">
                                            <Lock className="size-5" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(event) => setConfirmPassword(event.target.value)}
                                            className="glass-input w-full h-12 pl-11 pr-4 rounded-xl"
                                            placeholder={t('auth.confirm_new_password_placeholder')}
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
                                            {t('auth.updating')}
                                        </>
                                    ) : (
                                        t('auth.reset_password_button')
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

export default ResetPasswordPage;
