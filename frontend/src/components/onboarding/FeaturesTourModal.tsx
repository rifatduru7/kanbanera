import { useState } from 'react';
import { X, ArrowRight, SkipForward, Kanban, SquaresFour as LayoutDashboard, ShieldCheck, RocketLaunch as Rocket, Lightning as Zap } from '@phosphor-icons/react';

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
        Icon: Kanban,
        image: '/tour/kanban_board.png',
        tip: 'Designed for speed and simplicity without sacrificing power.',
    },
    {
        step: 2,
        title: 'Project Hub',
        subtitle: 'Centralized Dashboard',
        description: 'Monitor all your serverless projects from one centralized dashboard with real-time stats.',
        Icon: LayoutDashboard,
        image: '/tour/dashboard.png',
        tip: 'Get insights at a glance with our intuitive metrics.',
    },
    {
        step: 3,
        title: 'Secure by Default',
        subtitle: 'JWT Authentication & R2 Storage',
        description: 'JWT Authentication and encrypted R2 file storage ensure your data stays private.',
        Icon: ShieldCheck,
        image: '/tour/security.png',
        tip: 'Enterprise-grade security built into every layer.',
    },
    {
        step: 4,
        title: 'Ready to Start',
        subtitle: 'Create Your First Project',
        description: 'Your serverless workspace is ready. Start organizing your workflow with Era Kanban.',
        Icon: Rocket,
        image: '/tour/rocket.png',
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
            <div className="relative w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto lg:overflow-visible rounded-2xl bg-surface/90 backdrop-blur-xl border border-border shadow-2xl flex flex-col lg:flex-row scrollbar-hide">
                {/* Left Panel: Visual Hero */}
                <div className="relative w-full lg:w-1/2 bg-gradient-to-br from-text/5 to-transparent p-6 lg:p-8 flex flex-col justify-center items-center min-h-[300px] lg:min-h-[550px] border-b lg:border-b-0 lg:border-r border-border shrink-0">
                    {/* Grid Pattern Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] opacity-50" />

                    {/* Animated Icon */}
                    {/* Animated Image */}
                    <div className={`relative transition-all duration-300 ${isAnimating ? 'scale-90 opacity-50' : 'scale-100 opacity-100'}`}>
                        <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl group mx-auto">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                            <img
                                src={step.image}
                                alt={step.title}
                                className="w-[260px] lg:w-[320px] aspect-[4/3] object-cover transform transition-transform duration-700 group-hover:scale-110"
                            />
                            {/* Floating Icon Badge */}
                            <div className="absolute bottom-4 right-4 z-20 h-10 w-10 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 flex items-center justify-center animate-bounce shadow-lg shadow-black/20">
                                <step.Icon className="size-5 text-primary" />
                            </div>
                        </div>
                    </div>

                    {/* Step Info */}
                    <div className={`mt-8 lg:mt-10 text-center transition-all duration-300 ${isAnimating ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}>
                        <p className="text-primary font-bold text-sm tracking-wider uppercase mb-2">
                            Step {step.step} of {TOUR_STEPS.length}
                        </p>
                        <h3 className="text-text text-2xl font-bold">{step.title}</h3>
                        <p className="text-text-muted text-sm mt-2 max-w-xs mx-auto">{step.tip}</p>
                    </div>

                    {/* Badge */}
                    <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-border flex items-center gap-2">
                        <span className="text-primary"><Zap className="size-[18px]" fill="currentColor" /></span>
                        <span className="text-xs font-semibold text-text tracking-wide">Cloudflare Edge Optimized</span>
                    </div>
                </div>

                {/* Right Panel: Content */}
                <div className="w-full lg:w-1/2 p-6 lg:p-12 flex flex-col justify-between bg-surface/40">
                    {/* Close Button */}
                    <button
                        onClick={onSkip}
                        className="absolute top-6 right-6 text-text-muted hover:text-text transition-colors p-2 rounded-full hover:bg-surface-alt"
                    >
                        <X className="size-5" />
                    </button>

                    <div className="flex flex-col gap-8">
                        {/* Header */}
                        <div className="flex flex-col gap-2">
                            <h1 className="text-3xl lg:text-4xl font-extrabold text-text tracking-tight">
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
                                            ? 'bg-surface-alt border-primary/30'
                                            : 'bg-surface-alt border-white/5 hover:bg-surface-alt hover:border-primary/20'
                                        }`}
                                    onClick={() => handleDotClick(index)}
                                >
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors
                                        ${currentStep === index
                                            ? 'bg-primary text-white'
                                            : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
                                        }`}
                                    >
                                        <feature.Icon className="size-6" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-text text-base font-bold">{feature.subtitle}</h2>
                                        <p className="text-text-muted text-sm">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Navigation */}
                    <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between pt-8 mt-8 border-t border-border">
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
                                className="flex items-center gap-2 px-6 h-10 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt transition-colors text-sm font-semibold"
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
            <div className="absolute bottom-4 text-white/5 text-[12vw] lg:text-[8vw] font-black leading-none pointer-events-none select-none tracking-tighter">
                ERA KANBAN
            </div>
        </div>
    );
}
