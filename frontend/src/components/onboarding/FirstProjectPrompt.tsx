import { useTranslation } from 'react-i18next';
import { FolderPlus, ShieldCheck, Kanban, Check, SquaresFour, Plus, CloudArrowUp } from '@phosphor-icons/react';

interface FirstProjectPromptProps {
    onCreateProject: () => void;
    onSkip?: () => void;
}

export function FirstProjectPrompt({ onCreateProject, onSkip }: FirstProjectPromptProps) {
    const { t } = useTranslation();

    const FEATURE_BADGES = [
        { icon: ShieldCheck, label: t('onboarding.first_project.features.auth'), colorClass: 'text-primary' },
        { icon: Kanban, label: t('onboarding.first_project.features.drag_drop'), colorClass: 'text-emerald-400' },
        { icon: CloudArrowUp, label: t('onboarding.first_project.features.storage'), colorClass: 'text-primary' },
    ] as const;

    return (
        <div className="relative w-full flex flex-col items-center justify-center py-12">
            <div
                className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(19,146,236,0.15)_0%,rgba(13,148,136,0.05)_40%,transparent_70%)] rounded-full pointer-events-none animate-pulse"
                style={{ animationDuration: '8s' }}
            />
            <div
                className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(13,148,136,0.1)_0%,rgba(19,146,236,0.05)_50%,transparent_70%)] rounded-full pointer-events-none animate-pulse"
                style={{ animationDuration: '12s' }}
            />

            <div className="relative w-full max-w-lg glass-panel !bg-surface/60 overflow-hidden rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.2)] group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 opacity-75" style={{ animationDuration: '3s' }} />

                        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-surface to-surface-dark border border-border shadow-2xl shadow-primary/10">
                            <SquaresFour className="size-12 text-primary" />
                        </div>

                        <div
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 flex items-center justify-center animate-bounce"
                            style={{ animationDelay: '0.5s' }}
                        >
                            <Plus className="size-3 text-emerald-400" />
                        </div>
                        <div
                            className="absolute bottom-0 -left-4 h-8 w-8 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center animate-bounce"
                            style={{ animationDuration: '3s' }}
                        >
                            <Check className="size-4 text-primary" />
                        </div>
                    </div>
                </div>

                <h2 className="mb-3 text-2xl font-bold tracking-tight text-text sm:text-3xl">{t('onboarding.first_project.title')}</h2>
                <p className="mb-10 text-base text-text-muted leading-relaxed max-w-sm mx-auto">
                    {t('onboarding.first_project.description')}
                </p>

                <div className="flex flex-col gap-4 items-center">
                    <button
                        onClick={onCreateProject}
                        className="group/btn relative flex w-full max-w-xs items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/40 active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out" />
                        <FolderPlus className="size-5" />
                        <span>{t('onboarding.first_project.button')}</span>
                    </button>

                    {onSkip && (
                        <button
                            onClick={onSkip}
                            className="mt-2 text-sm font-medium text-text-muted hover:text-text transition-colors py-2 px-4 rounded-lg hover:bg-surface-alt"
                        >
                            {t('onboarding.first_project.skip')}
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 text-center">
                {FEATURE_BADGES.map((badge) => {
                    const Icon = badge.icon;
                    return (
                        <div key={badge.label} className="flex flex-col items-center gap-2">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-surface/50 ${badge.colorClass} ring-1 ring-border`}>
                                <Icon className="size-5" />
                            </div>
                            <p className="text-xs font-medium text-text-muted">{badge.label}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

