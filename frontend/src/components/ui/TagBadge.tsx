import { X } from 'lucide-react';

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface TagBadgeProps {
    tag: Tag;
    onRemove?: (tagId: string) => void;
    size?: 'sm' | 'md';
}

// Map color hex to Tailwind color classes
const getTagColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
        '#ef4444': { bg: 'bg-red-500/20', text: 'text-red-100', border: 'border-red-500/10', dot: 'bg-red-500' },
        '#f97316': { bg: 'bg-orange-500/20', text: 'text-orange-100', border: 'border-orange-500/10', dot: 'bg-orange-500' },
        '#eab308': { bg: 'bg-yellow-500/20', text: 'text-yellow-100', border: 'border-yellow-500/10', dot: 'bg-yellow-500' },
        '#22c55e': { bg: 'bg-green-500/20', text: 'text-green-100', border: 'border-green-500/10', dot: 'bg-green-500' },
        '#14b8a6': { bg: 'bg-teal-500/20', text: 'text-teal-100', border: 'border-teal-500/10', dot: 'bg-teal-500' },
        '#3b82f6': { bg: 'bg-blue-500/20', text: 'text-blue-100', border: 'border-blue-500/10', dot: 'bg-blue-500' },
        '#8b5cf6': { bg: 'bg-purple-500/20', text: 'text-purple-100', border: 'border-purple-500/10', dot: 'bg-purple-500' },
        '#ec4899': { bg: 'bg-pink-500/20', text: 'text-pink-100', border: 'border-pink-500/10', dot: 'bg-pink-500' },
        '#6b7280': { bg: 'bg-gray-500/20', text: 'text-gray-100', border: 'border-gray-500/10', dot: 'bg-gray-500' },
    };
    return colorMap[color] || colorMap['#6b7280'];
};

export function TagBadge({ tag, onRemove, size = 'md' }: TagBadgeProps) {
    const colorClasses = getTagColorClasses(tag.color);
    const sizeClasses = size === 'sm' ? 'h-5 text-[10px] gap-1 pl-1.5 pr-1' : 'h-7 text-xs gap-1.5 pl-2.5 pr-1.5';

    return (
        <div
            className={`group flex items-center ${sizeClasses} rounded-full ${colorClasses.bg} ${colorClasses.text} hover:opacity-90 transition-colors border ${colorClasses.border} cursor-default`}
        >
            <span className={`${size === 'sm' ? 'size-1' : 'size-1.5'} rounded-full ${colorClasses.dot}`} />
            <span className="font-medium">{tag.name}</span>
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(tag.id);
                    }}
                    className={`flex items-center justify-center ${size === 'sm' ? 'size-4' : 'size-5'} rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors ml-0.5`}
                >
                    <X className={size === 'sm' ? 'size-2.5' : 'size-3.5'} />
                </button>
            )}
        </div>
    );
}

// Export color options for use in TagSelector
export const TAG_COLORS = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
];
