import { useState, useEffect } from 'react';
import { X, Kanban, FolderPlus, Users, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

interface WelcomeModalProps {
    userName?: string;
    onClose: () => void;
    onCreateProject?: () => void;
}

const FEATURES = [
    {
        icon: FolderPlus,
        title: 'Create Projects',
        description: 'Organize your work with customizable Kanban boards',
    },
    {
        icon: Users,
        title: 'Collaborate',
        description: 'Invite team members and work together in real-time',
    },
    {
        icon: Sparkles,
        title: 'Stay Organized',
        description: 'Track tasks, set priorities, and never miss a deadline',
    },
];

export function WelcomeModal({ userName, onClose, onCreateProject }: WelcomeModalProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleGetStarted = () => {
        if (onCreateProject) {
            onClose();
            onCreateProject();
        } else {
            onClose();
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Modal Card */}
            <div className={`relative w-full max-w-lg flex flex-col rounded-2xl border border-white/10 bg-surface/95 backdrop-blur-md shadow-[0_0_60px_-15px_rgba(19,185,165,0.3)] ring-1 ring-white/5 overflow-hidden transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                >
                    <X className="size-5" />
                </button>

                {/* Hero Section */}
                <div className="relative px-8 pt-10 pb-6 text-center bg-gradient-to-b from-primary/10 to-transparent">
                    {/* Glow Effect */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/20 blur-[80px] rounded-full" />

                    {/* Logo */}
                    <div className="relative inline-flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-white shadow-lg shadow-primary/30 mb-6">
                        <Kanban className="size-10" />
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2">
                        Welcome{userName ? `, ${userName}` : ''}! 🎉
                    </h1>
                    <p className="text-text-muted">
                        You're ready to manage projects at the speed of cloud.
                    </p>
                </div>

                {/* Features */}
                <div className="px-8 py-6 space-y-4">
                    {FEATURES.map((feature, index) => {
                        const Icon = feature.icon;
                        const isActive = index <= currentStep;

                        return (
                            <div
                                key={feature.title}
                                className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${isActive ? 'bg-white/5 border border-primary/20' : 'bg-transparent border border-transparent'}`}
                                onMouseEnter={() => setCurrentStep(index)}
                            >
                                <div className={`p-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary/20 text-primary' : 'bg-white/5 text-text-muted'}`}>
                                    <Icon className="size-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className={`font-semibold mb-0.5 transition-colors ${isActive ? 'text-white' : 'text-text-muted'}`}>
                                        {feature.title}
                                    </h3>
                                    <p className="text-text-muted text-sm">{feature.description}</p>
                                </div>
                                {isActive && (
                                    <CheckCircle className="size-5 text-primary shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-white/5 bg-background/30">
                    <button
                        onClick={handleGetStarted}
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group"
                    >
                        Create Your First Project
                        <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full mt-3 text-center text-text-muted text-sm hover:text-white transition-colors"
                    >
                        I'll explore on my own
                    </button>
                </div>
            </div>
        </div>
    );
}

// Hook to manage welcome modal visibility
export function useWelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if user has seen welcome modal before
        const hasSeenWelcome = localStorage.getItem('era-kanban-welcome-seen');
        if (!hasSeenWelcome) {
            // Small delay for better UX
            const timer = setTimeout(() => setIsOpen(true), 500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('era-kanban-welcome-seen', 'true');
        setIsOpen(false);
    };

    return {
        isWelcomeOpen: isOpen,
        closeWelcome: handleClose,
        showWelcome: () => setIsOpen(true),
    };
}
