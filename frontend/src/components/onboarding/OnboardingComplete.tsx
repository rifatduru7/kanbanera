import { ArrowRight, Users, CheckCircle, Lightbulb } from '@phosphor-icons/react';

interface OnboardingCompleteProps {
    onGoToDashboard: () => void;
    onInviteTeam?: () => void;
    onClose: () => void;
}

export function OnboardingComplete({ onGoToDashboard, onInviteTeam, onClose }: OnboardingCompleteProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-float" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />
            </div>

            <div className="relative glass-panel !bg-surface/80 w-full max-w-2xl rounded-2xl p-8 sm:p-12 text-center overflow-hidden">
                <div className="relative z-10 flex flex-col items-center">
                    <div className="mb-8 relative">
                        <div className="absolute inset-0 bg-primary/30 blur-[40px] rounded-full" />
                        <div className="relative bg-gradient-to-br from-primary to-emerald-500 rounded-full p-6 shadow-2xl shadow-primary/30 transform transition-transform duration-500 hover:scale-105">
                            <CheckCircle className="text-text size-14" weight="fill" />
                        </div>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-text mb-6">You&apos;re all set!</h1>

                    <p className="text-text-muted text-lg leading-relaxed max-w-lg mb-10">
                        Your workspace is ready. Start creating tasks and inviting teammates.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center mb-8">
                        <button
                            onClick={() => {
                                onClose();
                                onGoToDashboard();
                            }}
                            className="flex w-full sm:w-auto min-w-[200px] h-14 items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-base font-bold shadow-lg shadow-primary/25 transition-all"
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
                                className="flex w-full sm:w-auto min-w-[200px] h-14 items-center justify-center gap-2 rounded-xl border border-border bg-surface hover:bg-surface-alt text-text text-base font-semibold transition-all"
                            >
                                <Users className="size-5" />
                                <span>Invite Team</span>
                            </button>
                        )}
                    </div>

                    <div className="glass-panel !bg-surface-alt rounded-lg p-4 flex items-start gap-3 text-left w-full max-w-md">
                        <Lightbulb className="text-primary mt-0.5 size-5" />
                        <div>
                            <p className="text-sm font-semibold text-text mb-1">Quick Tip</p>
                            <p className="text-xs sm:text-sm text-text-muted">
                                Drag and drop tasks in your new Kanban board to organize workflow quickly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
