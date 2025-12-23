import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Check } from 'lucide-react';
import { TagBadge, TAG_COLORS } from '../ui/TagBadge';

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface TagSelectorProps {
    availableTags: Tag[];
    selectedTags: Tag[];
    onAddTag: (tagId: string) => void;
    onRemoveTag: (tagId: string) => void;
    onCreateTag?: (name: string, color: string) => void;
}

export function TagSelector({
    availableTags,
    selectedTags,
    onAddTag,
    onRemoveTag,
    onCreateTag,
}: TagSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newTagName, setNewTagName] = useState('');
    const [selectedColor, setSelectedColor] = useState(TAG_COLORS[4].value); // Default teal
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredTags = availableTags.filter((tag) =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isTagSelected = (tagId: string) => selectedTags.some((t) => t.id === tagId);

    const handleToggleTag = (tag: Tag) => {
        if (isTagSelected(tag.id)) {
            onRemoveTag(tag.id);
        } else {
            onAddTag(tag.id);
        }
    };

    const handleCreateTag = () => {
        if (newTagName.trim() && onCreateTag) {
            onCreateTag(newTagName.trim(), selectedColor);
            setNewTagName('');
            setSearchQuery('');
        }
    };

    return (
        <div className="flex flex-col gap-3 relative" ref={dropdownRef}>
            {/* Label */}
            <label className="text-sm font-medium text-text-muted">Tags</label>

            {/* Selected Tags + Trigger Button */}
            <div className="flex flex-wrap gap-2 items-center min-h-[40px]">
                {selectedTags.map((tag) => (
                    <TagBadge key={tag.id} tag={tag} onRemove={onRemoveTag} />
                ))}

                {/* Trigger Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-transparent hover:bg-surface border border-dashed border-slate-600 hover:border-primary text-slate-400 hover:text-primary transition-all text-xs font-medium group"
                >
                    <Plus className="size-4 group-hover:scale-110 transition-transform" />
                    <span>Add Tag</span>
                </button>
            </div>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200">
                    {/* Search Header */}
                    <div className="p-3 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="glass-input w-full h-10 pl-10 pr-3 rounded-lg"
                                placeholder="Search tags..."
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Tags List */}
                    <div className="flex flex-col max-h-[240px] overflow-y-auto py-1">
                        <div className="px-4 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Select an option
                        </div>

                        {filteredTags.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-500">
                                No tags found. Create a new one below.
                            </div>
                        ) : (
                            filteredTags.map((tag) => (
                                <button
                                    key={tag.id}
                                    onClick={() => handleToggleTag(tag)}
                                    className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-background/50 transition-colors text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="size-3 rounded-full"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                        <span className="text-sm font-medium text-white">{tag.name}</span>
                                    </div>
                                    {isTagSelected(tag.id) && <Check className="size-5 text-primary" />}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer: Create New Tag */}
                    {onCreateTag && (
                        <div className="border-t border-border p-4 bg-background/30">
                            <div className="flex flex-col gap-3">
                                <span className="text-xs font-semibold text-slate-400 uppercase">
                                    Create New Tag
                                </span>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTagName}
                                        onChange={(e) => setNewTagName(e.target.value)}
                                        placeholder="Tag name..."
                                        className="glass-input flex-1 h-9 px-3 rounded-lg text-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                                    />
                                    <button
                                        onClick={handleCreateTag}
                                        disabled={!newTagName.trim()}
                                        className="btn-primary h-9 px-4 rounded-lg text-sm font-medium disabled:opacity-50"
                                    >
                                        Create
                                    </button>
                                </div>

                                {/* Color Picker */}
                                <div className="flex justify-between items-center px-1">
                                    {TAG_COLORS.map((color) => (
                                        <label key={color.value} className="relative cursor-pointer">
                                            <input
                                                type="radio"
                                                name="tag-color"
                                                value={color.value}
                                                checked={selectedColor === color.value}
                                                onChange={() => setSelectedColor(color.value)}
                                                className="peer sr-only"
                                            />
                                            <span
                                                className="block size-6 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-surface peer-checked:ring-current transition-all hover:scale-110"
                                                style={{ backgroundColor: color.value }}
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
