import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Kanban, FolderPlus, Users, Sparkle as Sparkles, ArrowRight, CheckCircle } from '@phosphor-icons/react';

interface WelcomeModalProps {
    userName?: string;
    onClose: () => void;
    onCreateProject?: () => void;
}

const FEATURES = [
    {
        icon: FolderPlus,
        titleKey: 'onboarding.welcome.features.projects.title',
        descriptionKey: 'onboarding.welcome.features.projects.description',
    },
    {
        icon: Users,
        titleKey: 'onboarding.welcome.features.collaborate.title',
        descriptionKey: 'onboarding.welcome.features.collaborate.description',
    },
    {
        icon: Sparkles,
        titleKey: 'onboarding.welcome.features.organized.title',
        descriptionKey: 'onboarding.welcome.features.organized.description',
    },
];

export function WelcomeModal({ userName, onClose, onCreateProject }: WelcomeModalProps) {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);

    const handleGetStarted = () => {
        if (onCreateProject) {
            onClose();
            onCreateProject();
            return;
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300 opacity-100">
            <div className="relative w-full max-w-lg flex flex-col rounded-2xl border border-border bg-surface/95 backdrop-blur-md shadow-[0_0_60px_-15px_rgba(19,185,165,0.3)] ring-1 ring-white/5 overflow-hidden transition-all duration-500 scale-100 translate-y-0">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 text-text-muted hover:text-text transition-colors p-2 rounded-full hover:bg-surface-alt"
                >
                    <X className="size-5" />
                </button>

                <div className="relative px-8 pt-10 pb-6 text-center bg-gradient-to-b from-primary/10 to-transparent">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/20 blur-[80px] rounded-full" />

                    <div className="relative inline-flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-text shadow-lg shadow-primary/30 mb-6">
                        <Kanban className="size-10" />
                    </div>

                    <h1 className="text-3xl font-bold text-text mb-2">
                        {userName ? t('onboarding.welcome.title_name', { name: userName }) : t('onboarding.welcome.title')}
                    </h1>
                    <p className="text-text-muted">
                        {t('onboarding.welcome.subtitle')}
                    </p>
                </div>

                <div className="px-8 py-6 space-y-4">
                    {FEATURES.map((feature, index) => {
                        const Icon = feature.icon;
                        const isActive = index <= currentStep;

                        return (
                            <div
                                key={feature.titleKey}
                                className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${isActive ? 'bg-surface-alt border border-primary/20' : 'bg-transparent border border-transparent'}`}
                                onMouseEnter={() => setCurrentStep(index)}
                            >
                                <div className={`p-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/20 text-primary' : 'bg-surface-alt text-white/70'}`}>
                                    <Icon className="size-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className={`font-semibold mb-0.5 transition-colors ${isActive ? 'text-text' : 'text-text-muted'}`}>
                                        {t(feature.titleKey)}
                                    </h3>
                                    <p className="text-text-muted text-sm">{t(feature.descriptionKey)}</p>
                                </div>
                                {isActive && (
                                    <CheckCircle className="size-5 text-primary shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="px-8 py-6 border-t border-white/5 bg-background/30">
                    <button
                        onClick={handleGetStarted}
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group"
                    >
                        {t('onboarding.welcome.create_first')}
                        <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full mt-3 text-center text-text-muted text-sm hover:text-text transition-colors"
                    >
                        {t('onboarding.welcome.explore')}
                    </button>
                </div>
            </div>
        </div>
    );
}
