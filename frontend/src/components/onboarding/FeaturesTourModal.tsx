import { useState } from 'react';
import { X, ArrowRight, SkipForward } from 'lucide-react';

interface FeaturesTourModalProps {
    onComplete: () => void;
    onSkip: () => void;
}

const TOUR_STEPS = [
    {
        step: 1,
        title: 'Effortless Management',
        subtitle: 'Drag-and-Drop Boards',
        description: 'Visualize workflows seamlessly. Move tasks between stages with a fluid, native-feel interface.',
        icon: 'view_kanban',
        tip: 'Designed for speed and simplicity without sacrificing power.',
    },
    {
        step: 2,
        title: 'Project Hub',
        subtitle: 'Centralized Dashboard',
        description: 'Monitor all your serverless projects from one centralized dashboard with real-time stats.',
        icon: 'dashboard',
        tip: 'Get insights at a glance with our intuitive metrics.',
    },
    {
        step: 3,
        title: 'Secure by Default',
        subtitle: 'JWT Authentication & R2 Storage',
        description: 'JWT Authentication and encrypted R2 file storage ensure your data stays private.',
        icon: 'verified_user',
        tip: 'Enterprise-grade security built into every layer.',
    },
    {
        step: 4,
        title: 'Ready to Start',
        subtitle: 'Create Your First Project',
        description: 'Your serverless workspace is ready. Start organizing your workflow with Era Kanban.',
        icon: 'rocket_launch',
        tip: 'Create a project to get started!',
    },
];

export function FeaturesTourModal({ onComplete, onSkip }: FeaturesTourModalProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const step = TOUR_STEPS[currentStep];
    const isLastStep = currentStep === TOUR_STEPS.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            onComplete();
            return;
        }

        setIsAnimating(true);
        setTimeout(() => {
            setCurrentStep((prev) => prev + 1);
            setIsAnimating(false);
        }, 200);
    };

    const handleDotClick = (index: number) => {
        if (index === currentStep) return;
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentStep(index);
            setIsAnimating(false);
        }, 200);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            {/* Background Effects */}
            <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
            <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />

            {/* Main Card */}
            <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-surface/90 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col lg:flex-row">
                {/* Left Panel: Visual Hero */}
                <div className="relative w-full lg:w-1/2 bg-gradient-to-br from-white/5 to-transparent p-8 flex flex-col justify-center items-center min-h-[320px] lg:min-h-[550px] border-b lg:border-b-0 lg:border-r border-white/10">
                    {/* Grid Pattern Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] opacity-50" />

                    {/* Animated Icon */}
                    <div className={`relative transition-all duration-300 ${isAnimating ? 'scale-90 opacity-50' : 'scale-100 opacity-100'}`}>
                        <div className="absolute inset-0 bg-primary/30 blur-[50px] rounded-full animate-pulse" />
                        <div className="relative bg-gradient-to-br from-surface to-surface-dark rounded-2xl p-8 border border-white/10 shadow-2xl">
                            <span className="material-symbols-outlined text-7xl text-primary">
                                {step.icon}
                            </span>
                        </div>
                        {/* Floating Particles */}
                        <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 flex items-center justify-center animate-bounce" style={{ animationDelay: '0.5s' }}>
                            <span className="material-symbols-outlined text-sm text-emerald-400">add</span>
                        </div>
                        <div className="absolute -bottom-2 -left-4 h-10 w-10 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                            <span className="material-symbols-outlined text-base text-primary">auto_awesome</span>
                        </div>
                    </div>

                    {/* Step Info */}
                    <div className={`mt-10 text-center transition-all duration-300 ${isAnimating ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}>
                        <p className="text-primary font-bold text-sm tracking-wider uppercase mb-2">
                            Step {step.step} of {TOUR_STEPS.length}
                        </p>
                        <h3 className="text-white text-2xl font-bold">{step.title}</h3>
                        <p className="text-text-muted text-sm mt-2 max-w-xs mx-auto">{step.tip}</p>
                    </div>

                    {/* Badge */}
                    <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
                        <span className="text-xs font-semibold text-white tracking-wide">Cloudflare Edge Optimized</span>
                    </div>
                </div>

                {/* Right Panel: Content */}
                <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-between bg-surface/40">
                    {/* Close Button */}
                    <button
                        onClick={onSkip}
                        className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                    >
                        <X className="size-5" />
                    </button>

                    <div className="flex flex-col gap-8">
                        {/* Header */}
                        <div className="flex flex-col gap-2">
                            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                                Meet <span className="text-primary">Era Kanban</span>
                            </h1>
                            <p className="text-text-muted text-base">
                                A modern, serverless project management tool built for the Era Bulut ecosystem.
                            </p>
                        </div>

                        {/* Feature Cards */}
                        <div className="grid gap-4">
                            {TOUR_STEPS.slice(0, 3).map((feature, index) => (
                                <div
                                    key={feature.step}
                                    className={`group flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer
                                        ${currentStep === index
                                            ? 'bg-white/10 border-primary/30'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-primary/20'
                                        }`}
                                    onClick={() => handleDotClick(index)}
                                >
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors
                                        ${currentStep === index
                                            ? 'bg-primary text-white'
                                            : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[24px]">{feature.icon}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-white text-base font-bold">{feature.subtitle}</h2>
                                        <p className="text-text-muted text-sm">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Navigation */}
                    <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between pt-8 mt-8 border-t border-white/10">
                        {/* Pagination Indicators */}
                        <div className="flex items-center justify-center gap-2">
                            {TOUR_STEPS.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleDotClick(index)}
                                    className={`h-2 rounded-full transition-all duration-300 
                                        ${currentStep === index
                                            ? 'w-8 bg-primary shadow-[0_0_10px_rgba(19,146,236,0.5)]'
                                            : 'w-2 bg-white/20 hover:bg-white/40'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={onSkip}
                                className="flex items-center gap-2 px-6 h-10 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
                            >
                                <SkipForward className="size-4" />
                                Skip
                            </button>
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-6 h-10 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-lg shadow-primary/20 transition-all transform active:scale-95"
                            >
                                <span>{isLastStep ? 'Get Started' : 'Next'}</span>
                                <ArrowRight className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Branding Text */}
            <div className="absolute bottom-4 text-white/5 text-[8vw] font-black leading-none pointer-events-none select-none tracking-tighter">
                ERA KANBAN
            </div>
        </div>
    );
}

// Hook to manage features tour visibility
export function useFeaturesTour() {
    const [isOpen, setIsOpen] = useState(false);

    const checkAndShow = () => {
        const hasSeen = localStorage.getItem('era-kanban-tour-seen');
        if (!hasSeen) {
            setTimeout(() => setIsOpen(true), 300);
        }
    };

    const complete = () => {
        localStorage.setItem('era-kanban-tour-seen', 'true');
        setIsOpen(false);
    };

    const skip = () => {
        localStorage.setItem('era-kanban-tour-seen', 'true');
        setIsOpen(false);
    };

    return {
        isOpen,
        show: () => setIsOpen(true),
        checkAndShow,
        complete,
        skip,
    };
}
