import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Kanban, EnvelopeSimple as Mail, ArrowRight, CircleNotch as Loader2, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { authApi } from '../../lib/api/client';
import { useTranslation } from 'react-i18next';

export function ForgotPasswordPage() {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await authApi.forgotPassword(email.trim());
            if (!response.success) {
                setError(response.message || 'Failed to send reset link');
                return;
            }
            setIsSuccess(true);
        } catch (requestError: unknown) {
            const message = requestError instanceof Error ? requestError.message : t('auth.error.failed_to_send_reset');
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4">
            <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary/20 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-teal-500/10 blur-[120px]" />

            <header className="absolute top-0 left-0 w-full p-6 z-20">
                <Link to="/login" className="flex items-center gap-3 text-text w-fit">
                    <Kanban className="size-8 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight">ERA KANBAN</h2>
                </Link>
            </header>

            <main className="w-full max-w-lg relative z-10">
                <div className="glass-card rounded-2xl p-8 md:p-10 flex flex-col items-center text-center">
                    {isSuccess ? (
                        <>
                            <div className="size-16 rounded-full bg-green-500/20 border border-green-500/20 flex items-center justify-center mb-6 text-green-500">
                                <CheckCircle className="size-8" />
                            </div>
                            <h1 className="text-3xl font-bold text-text mb-3 tracking-tight">{t('auth.check_email')}</h1>
                            <p className="text-text-muted text-sm md:text-base leading-relaxed mb-8 max-w-sm">
                                {t('auth.reset_link_sent_to')} <span className="text-primary font-medium">{email}</span>.
                            </p>
                            <Link
                                to="/login"
                                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                            >
                                {t('auth.back_to_login')}
                            </Link>
                            <p className="mt-6 text-text-muted text-sm">
                                {t('auth.didnt_receive_it')}{' '}
                                <button
                                    type="button"
                                    onClick={() => setIsSuccess(false)}
                                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                                >
                                    {t('auth.try_again')}
                                </button>
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="size-16 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center mb-6 text-primary">
                                <Mail className="size-8" />
                            </div>

                            <h1 className="text-3xl font-bold text-text mb-3 tracking-tight">{t('auth.forgot_password_title')}</h1>
                            <p className="text-text-muted text-sm md:text-base leading-relaxed mb-8 max-w-sm">
                                {t('auth.forgot_password_subtitle')}
                            </p>

                            {error ? (
                                <div className="w-full mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                    <WarningCircle className="size-4" />
                                    <span>{error}</span>
                                </div>
                            ) : null}

                            <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>
                                <div className="text-left w-full">
                                    <label className="block text-sm font-medium text-text mb-2 ml-1" htmlFor="email">
                                        Email address
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                                            <Mail className="size-5" />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            className="glass-input w-full h-12 pl-11 pr-4 rounded-xl"
                                            placeholder={t('auth.email_placeholder')}
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
                                            {t('auth.sending')}
                                        </>
                                    ) : (
                                        <>
                                            <span>{t('auth.send_reset_link')}</span>
                                            <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-border w-full">
                                <p className="text-text-muted text-sm">
                                    {t('auth.remembered_password')}{' '}
                                    <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors ml-1">
                                        {t('auth.back_to_login')}
                                    </Link>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

export default ForgotPasswordPage;
