import { Loader2 } from 'lucide-react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
    const sizeClasses = {
        sm: 'size-4',
        md: 'size-6',
        lg: 'size-8',
    };

    return (
        <Loader2 className={`animate-spin text-primary ${sizeClasses[size]} ${className}`} />
    );
}

// Full page loading
export function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <Spinner size="lg" />
                <p className="text-text-muted text-sm animate-pulse">Loading...</p>
            </div>
        </div>
    );
}

// Skeleton for task cards
export function TaskCardSkeleton() {
    return (
        <div className="glass-panel rounded-xl p-4 flex flex-col gap-3 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-5 w-16 bg-white/10 rounded" />
                <div className="h-4 w-4 bg-white/10 rounded" />
            </div>
            <div className="space-y-2">
                <div className="h-4 w-full bg-white/10 rounded" />
                <div className="h-4 w-3/4 bg-white/10 rounded" />
            </div>
            <div className="flex gap-2">
                <div className="h-5 w-14 bg-white/10 rounded" />
                <div className="h-5 w-16 bg-white/10 rounded" />
            </div>
            <div className="h-px w-full bg-white/5" />
            <div className="flex items-center justify-between">
                <div className="flex gap-3">
                    <div className="h-4 w-8 bg-white/10 rounded" />
                    <div className="h-4 w-8 bg-white/10 rounded" />
                </div>
                <div className="size-6 bg-white/10 rounded-full" />
            </div>
        </div>
    );
}

// Skeleton for column
export function ColumnSkeleton() {
    return (
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
            <div className="flex items-center gap-2 px-1">
                <div className="size-2 bg-white/10 rounded-full" />
                <div className="h-4 w-24 bg-white/10 rounded" />
                <div className="h-5 w-8 bg-white/10 rounded-full" />
            </div>
            <div className="flex flex-col gap-3 p-2">
                <TaskCardSkeleton />
                <TaskCardSkeleton />
            </div>
        </div>
    );
}

// Skeleton for board
export function BoardSkeleton() {
    return (
        <div className="flex gap-6 min-w-max">
            <ColumnSkeleton />
            <ColumnSkeleton />
            <ColumnSkeleton />
            <ColumnSkeleton />
        </div>
    );
}

// Inline button loading
interface ButtonLoaderProps {
    loading?: boolean;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit';
}

export function LoadingButton({
    loading,
    children,
    className = '',
    disabled,
    onClick,
    type = 'button',
}: ButtonLoaderProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={loading || disabled}
            className={`relative ${className} ${loading ? 'cursor-wait' : ''}`}
        >
            {loading && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <Spinner size="sm" />
                </span>
            )}
            <span className={loading ? 'invisible' : ''}>{children}</span>
        </button>
    );
}
