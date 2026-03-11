import { DotsThreeVertical as MoreVertical, CheckCircle, Users } from '@phosphor-icons/react';

interface ProjectCardProps {
    id: string;
    name: string;
    description?: string | null;
    color: string;
    taskCount: number;
    memberCount: number;
    completedPercent: number;
    onClick?: () => void;
}

export function ProjectCard({
    name,
    description,
    color,
    taskCount,
    memberCount,
    completedPercent,
    onClick,
}: ProjectCardProps) {
    // Map project color hex to static Tailwind classes (build-safe for Tailwind scan)
    const getColorClasses = (hex: string) => {
        const colorMap: Record<string, { bg: string; text: string; borderHover: string; titleHover: string }> = {
            '#14b8a6': { bg: 'bg-teal-500', text: 'text-teal-400', borderHover: 'hover:border-teal-500/30', titleHover: 'group-hover:text-teal-400' },
            '#3b82f6': { bg: 'bg-blue-500', text: 'text-blue-400', borderHover: 'hover:border-blue-500/30', titleHover: 'group-hover:text-blue-400' },
            '#8b5cf6': { bg: 'bg-purple-500', text: 'text-purple-400', borderHover: 'hover:border-purple-500/30', titleHover: 'group-hover:text-purple-400' },
            '#ec4899': { bg: 'bg-pink-500', text: 'text-pink-400', borderHover: 'hover:border-pink-500/30', titleHover: 'group-hover:text-pink-400' },
            '#ef4444': { bg: 'bg-red-500', text: 'text-red-400', borderHover: 'hover:border-red-500/30', titleHover: 'group-hover:text-red-400' },
            '#f97316': { bg: 'bg-orange-500', text: 'text-orange-400', borderHover: 'hover:border-orange-500/30', titleHover: 'group-hover:text-orange-400' },
            '#eab308': { bg: 'bg-yellow-500', text: 'text-yellow-400', borderHover: 'hover:border-yellow-500/30', titleHover: 'group-hover:text-yellow-400' },
            '#22c55e': { bg: 'bg-green-500', text: 'text-green-400', borderHover: 'hover:border-green-500/30', titleHover: 'group-hover:text-green-400' },
        };
        return colorMap[hex.toLowerCase()] || colorMap['#14b8a6'];
    };

    const colorClasses = getColorClasses(color);

    return (
        <div
            onClick={onClick}
            className={`group relative flex flex-col bg-surface hover:bg-surface-alt rounded-xl overflow-hidden border border-border ${colorClasses.borderHover} transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 cursor-pointer`}
        >
            {/* Color Stripe */}
            <div className={`h-1.5 w-full ${colorClasses.bg}`} />

            <div className="p-5 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                    <h3 className={`text-xl font-bold text-text ${colorClasses.titleHover} transition-colors`}>
                        {name}
                    </h3>
                    <button
                        onClick={(e) => e.stopPropagation()}
                        className="text-text-muted hover:text-text p-1 hover:bg-surface-alt rounded-full transition-colors"
                    >
                        <MoreVertical className="size-5" />
                    </button>
                </div>

                {/* Description */}
                <p className="text-text-muted text-sm line-clamp-2 mb-6">
                    {description || 'No description provided'}
                </p>

                <div className="mt-auto">
                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4 text-xs font-medium text-text-muted">
                        <div className="flex items-center gap-1.5 bg-surface-alt/50 px-2 py-1 rounded-md">
                            <CheckCircle className={`size-4 ${colorClasses.text}`} />
                            <span>{taskCount} Tasks</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-surface-alt/50 px-2 py-1 rounded-md">
                            <Users className="size-4 text-primary" />
                            <span>{memberCount} Members</span>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex -space-x-2">
                            {/* Placeholder avatars */}
                            <div className="size-8 rounded-full border-2 border-surface bg-gradient-to-br from-primary/50 to-primary/30 flex items-center justify-center text-xs font-bold text-text">
                                {name.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <span className={`text-sm font-bold ${colorClasses.text}`}>
                            {completedPercent}%
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-border-muted rounded-full h-1.5">
                        <div
                            className={`${colorClasses.bg} h-1.5 rounded-full transition-all duration-500`}
                            style={{ width: `${completedPercent}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
