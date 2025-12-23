import { ArrowRight, Users } from 'lucide-react';

interface OnboardingCompleteProps {
    onGoToDashboard: () => void;
    onInviteTeam?: () => void;
    onClose: () => void;
}

export function OnboardingComplete({ onGoToDashboard, onInviteTeam, onClose }: OnboardingCompleteProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-float" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />
            </div>

            {/* Success Card */}
            <div className="relative glass-panel !bg-surface/80 w-full max-w-2xl rounded-2xl p-8 sm:p-12 text-center overflow-hidden">
                {/* Noise Texture Overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-20 mix-blend-overlay pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    {/* Animated Icon */}
                    <div className="mb-8 relative">
                        <div className="absolute inset-0 bg-primary/30 blur-[40px] rounded-full" />
                        <div className="relative bg-gradient-to-br from-primary to-emerald-500 rounded-full p-6 shadow-2xl shadow-primary/30 transform transition-transform duration-500 hover:scale-105">
                            <span className="material-symbols-outlined text-white text-6xl">check_circle</span>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-6">
                        You're all set!
                    </h1>

                    {/* Description */}
                    <p className="text-text-muted text-lg leading-relaxed max-w-lg mb-10">
                        Your serverless workspace is provisioned and ready. We've set up your first Kanban board and secured your environment with Cloudflare R2 storage.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center mb-8">
                        <button
                            onClick={() => {
                                onClose();
                                onGoToDashboard();
                            }}
                            className="flex w-full sm:w-auto min-w-[200px] h-14 items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-base font-bold shadow-lg shadow-primary/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <span>Go to Dashboard</span>
                            <ArrowRight className="size-5" />
                        </button>
                        {onInviteTeam && (
                            <button
                                onClick={() => {
                                    onClose();
                                    onInviteTeam();
                                }}
                                className="flex w-full sm:w-auto min-w-[200px] h-14 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-base font-semibold backdrop-blur-sm transition-all"
                            >
                                <Users className="size-5" />
                                <span>Invite Team</span>
                            </button>
                        )}
                    </div>

                    {/* Quick Tip */}
                    <div className="glass-panel !bg-white/5 !border-white/10 rounded-lg p-4 flex items-start gap-3 text-left w-full max-w-md">
                        <span className="material-symbols-outlined text-primary mt-0.5">lightbulb</span>
                        <div>
                            <p className="text-sm font-semibold text-white mb-1">Quick Tip</p>
                            <p className="text-xs sm:text-sm text-text-muted">
                                You can drag and drop tasks immediately on your new Kanban board to start organizing your workflow.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
