import { FolderPlus } from 'lucide-react';

interface FirstProjectPromptProps {
    onCreateProject: () => void;
    onSkip?: () => void;
}

const FEATURE_BADGES = [
    {
        icon: 'security',
        label: 'Secure JWT Auth',
        colorClass: 'text-primary',
    },
    {
        icon: 'drag_indicator',
        label: 'Drag & Drop Boards',
        colorClass: 'text-emerald-400',
    },
    {
        icon: 'cloud_upload',
        label: 'R2 File Storage',
        colorClass: 'text-primary',
    },
];

export function FirstProjectPrompt({ onCreateProject, onSkip }: FirstProjectPromptProps) {
    return (
        <div className="relative w-full flex flex-col items-center justify-center py-12">
            {/* Ambient Background Effects */}
            <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(19,146,236,0.15)_0%,rgba(13,148,136,0.05)_40%,transparent_70%)] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(13,148,136,0.1)_0%,rgba(19,146,236,0.05)_50%,transparent_70%)] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />

            {/* Glassmorphism Card */}
            <div className="relative w-full max-w-lg glass-panel !bg-surface/60 overflow-hidden rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.2)] group">
                {/* Decorative Top Gradient Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                {/* Hero Icon */}
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        {/* Ping Animation */}
                        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 opacity-75" style={{ animationDuration: '3s' }} />

                        {/* Main Icon Container */}
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-surface to-surface-dark border border-white/10 shadow-2xl shadow-primary/10">
                            <span className="material-symbols-outlined text-5xl text-primary">
                                dashboard_customize
                            </span>
                        </div>

                        {/* Floating Particles */}
                        <div
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 flex items-center justify-center animate-bounce"
                            style={{ animationDelay: '0.5s' }}
                        >
                            <span className="material-symbols-outlined text-xs text-emerald-400">add</span>
                        </div>
                        <div
                            className="absolute bottom-0 -left-4 h-8 w-8 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center animate-bounce"
                            style={{ animationDuration: '3s' }}
                        >
                            <span className="material-symbols-outlined text-sm text-primary">auto_awesome</span>
                        </div>
                    </div>
                </div>

                {/* Text Content */}
                <h2 className="mb-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Let's get organized
                </h2>
                <p className="mb-10 text-base text-text-muted leading-relaxed max-w-sm mx-auto">
                    You don't have any projects yet. Create your first Kanban board to start tracking tasks efficiently.
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-4 items-center">
                    {/* Primary CTA */}
                    <button
                        onClick={onCreateProject}
                        className="group/btn relative flex w-full max-w-xs items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/40 active:scale-[0.98]"
                    >
                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out" />
                        <FolderPlus className="size-5" />
                        <span>Create First Project</span>
                    </button>

                    {/* Secondary Link */}
                    {onSkip && (
                        <button
                            onClick={onSkip}
                            className="mt-2 text-sm font-medium text-text-muted hover:text-white transition-colors py-2 px-4 rounded-lg hover:bg-white/5"
                        >
                            Skip setup and go to dashboard
                        </button>
                    )}
                </div>
            </div>

            {/* Feature Badges */}
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 text-center">
                {FEATURE_BADGES.map((badge) => (
                    <div key={badge.label} className="flex flex-col items-center gap-2">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-surface/50 ${badge.colorClass} ring-1 ring-white/10`}>
                            <span className="material-symbols-outlined text-xl">{badge.icon}</span>
                        </div>
                        <p className="text-xs font-medium text-text-muted">{badge.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
