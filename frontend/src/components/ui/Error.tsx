import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ErrorDisplayProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    showHomeButton?: boolean;
    showBackButton?: boolean;
}

export function ErrorDisplay({
    title = 'Something went wrong',
    message = 'An unexpected error occurred. Please try again.',
    onRetry,
    showHomeButton = true,
    showBackButton = false,
}: ErrorDisplayProps) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="glass-panel rounded-2xl p-8 max-w-md w-full">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mx-auto mb-6">
                    <AlertCircle className="size-8 text-red-400" />
                </div>

                <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
                <p className="text-text-muted text-sm mb-6">{message}</p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all"
                        >
                            <RefreshCw className="size-4" />
                            Try Again
                        </button>
                    )}

                    {showBackButton && (
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 transition-all"
                        >
                            <ArrowLeft className="size-4" />
                            Go Back
                        </button>
                    )}

                    {showHomeButton && (
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 transition-all"
                        >
                            <Home className="size-4" />
                            Dashboard
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Inline error message
interface InlineErrorProps {
    message: string;
    className?: string;
}

export function InlineError({ message, className = '' }: InlineErrorProps) {
    return (
        <div className={`flex items-center gap-2 text-red-400 text-sm ${className}`}>
            <AlertCircle className="size-4 flex-shrink-0" />
            <span>{message}</span>
        </div>
    );
}

// Toast-style error notification
interface ErrorToastProps {
    message: string;
    onClose?: () => void;
}

export function ErrorToast({ message, onClose }: ErrorToastProps) {
    return (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
            <div className="glass-panel !bg-red-950/80 !border-red-500/30 rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg shadow-red-500/10">
                <AlertCircle className="size-5 text-red-400 flex-shrink-0" />
                <span className="text-sm text-white">{message}</span>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-red-400 hover:text-white transition-colors ml-2"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
}

// 404 Not Found component
export function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <div className="text-9xl font-bold text-primary/20 mb-4">404</div>
            <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
            <p className="text-text-muted mb-8">
                The page you're looking for doesn't exist or has been moved.
            </p>
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all shadow-lg shadow-primary/25"
            >
                <Home className="size-5" />
                Back to Dashboard
            </button>
        </div>
    );
}
