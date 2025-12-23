import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, FolderKanban, Calendar, User, BarChart3, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
    id: string;
    type: 'page' | 'task' | 'project';
    title: string;
    description?: string;
    href: string;
    icon: React.ElementType;
}

// Static pages for quick navigation
const staticResults: SearchResult[] = [
    { id: 'dashboard', type: 'page', title: 'Dashboard', description: 'Overview and stats', href: '/dashboard', icon: BarChart3 },
    { id: 'projects', type: 'page', title: 'Projects', description: 'Manage projects', href: '/projects', icon: FolderKanban },
    { id: 'board', type: 'page', title: 'Kanban Board', description: 'View and manage tasks', href: '/board', icon: FileText },
    { id: 'calendar', type: 'page', title: 'Calendar', description: 'Due dates and deadlines', href: '/calendar', icon: Calendar },
    { id: 'metrics', type: 'page', title: 'Metrics', description: 'Analytics and reports', href: '/metrics', icon: BarChart3 },
    { id: 'profile', type: 'page', title: 'Profile', description: 'Account settings', href: '/profile', icon: User },
];

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Filter results based on query
    const filteredResults = query.trim()
        ? staticResults.filter((r) =>
            r.title.toLowerCase().includes(query.toLowerCase()) ||
            r.description?.toLowerCase().includes(query.toLowerCase())
        )
        : staticResults;

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => (i + 1) % filteredResults.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => (i - 1 + filteredResults.length) % filteredResults.length);
            } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
                e.preventDefault();
                navigate(filteredResults[selectedIndex].href);
                onClose();
            } else if (e.key === 'Escape') {
                onClose();
            }
        },
        [filteredResults, selectedIndex, navigate, onClose]
    );

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 glass-panel rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Search Input */}
                <div className="flex items-center gap-4 px-5 py-4 border-b border-white/10">
                    <Search className="size-5 text-text-muted flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search pages, tasks, projects..."
                        className="flex-1 bg-transparent border-none text-white text-lg placeholder:text-text-muted/50 focus:outline-none focus:ring-0"
                    />
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">esc</kbd>
                        <span>to close</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted transition-colors"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto p-2">
                    {filteredResults.length === 0 ? (
                        <div className="py-12 text-center text-text-muted">
                            <Search className="size-10 mx-auto mb-3 opacity-30" />
                            <p>No results found for "{query}"</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                                Quick Navigation
                            </div>
                            {filteredResults.map((result, index) => {
                                const Icon = result.icon;
                                const isSelected = index === selectedIndex;

                                return (
                                    <button
                                        key={result.id}
                                        onClick={() => {
                                            navigate(result.href);
                                            onClose();
                                        }}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-left ${isSelected
                                                ? 'bg-primary/20 text-white'
                                                : 'text-text-muted hover:bg-white/5'
                                            }`}
                                    >
                                        <div
                                            className={`p-2 rounded-lg ${isSelected ? 'bg-primary/30 text-primary' : 'bg-white/5'
                                                }`}
                                        >
                                            <Icon className="size-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium ${isSelected ? 'text-white' : ''}`}>
                                                {result.title}
                                            </p>
                                            {result.description && (
                                                <p className="text-sm text-text-muted truncate">
                                                    {result.description}
                                                </p>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <kbd className="px-2 py-1 rounded bg-white/10 text-xs font-mono text-text-muted">
                                                ↵
                                            </kbd>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-black/20">
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">↑</kbd>
                            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">↓</kbd>
                            to navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">↵</kbd>
                            to select
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                        <Command className="size-3" />
                        <span>+</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">K</kbd>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Hook to handle Cmd+K / Ctrl+K keyboard shortcut
 */
export function useSearchModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((prev) => !prev),
    };
}
