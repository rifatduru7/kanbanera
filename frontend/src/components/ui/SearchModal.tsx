import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass as Search, X, FileText, Kanban as FolderKanban, CalendarBlank as Calendar, User, ChartBar as BarChart3, Command, Checks, SpinnerGap } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../../lib/api/client';

interface SearchResult {
    id: string;
    type: 'page' | 'task' | 'project' | 'user';
    title: string;
    description?: string;
    href: string;
    icon: React.ElementType;
}

const navItems = [
    { id: 'dashboard', type: 'page', labelKey: 'nav.dashboard', descKey: 'search.desc.dashboard', href: '/dashboard', icon: BarChart3 },
    { id: 'projects', type: 'page', labelKey: 'nav.projects', descKey: 'search.desc.projects', href: '/projects', icon: FolderKanban },
    { id: 'board', type: 'page', labelKey: 'nav.board', descKey: 'search.desc.board', href: '/board', icon: FileText },
    { id: 'calendar', type: 'page', labelKey: 'nav.calendar', descKey: 'search.desc.calendar', href: '/calendar', icon: Calendar },
    { id: 'metrics', type: 'page', labelKey: 'nav.metrics', descKey: 'search.desc.metrics', href: '/metrics', icon: BarChart3 },
    { id: 'profile', type: 'page', labelKey: 'nav.profile', descKey: 'search.desc.profile', href: '/profile', icon: User },
] as const;

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function useDebouncedValue<T>(value: T, delay = 250) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(timer);
    }, [delay, value]);

    return debounced;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const debouncedQuery = useDebouncedValue(query.trim(), 250);

    const navigationResults: SearchResult[] = useMemo(() => navItems.map((item) => ({
        id: item.id,
        type: 'page',
        title: t(item.labelKey),
        description: t(item.descKey),
        href: item.href,
        icon: item.icon,
    })), [t]);

    const searchQuery = useQuery({
        queryKey: ['search', debouncedQuery],
        queryFn: async () => {
            const response = await searchApi.search({ q: debouncedQuery, scope: 'all', limit: 6 });
            if (!response.success || !response.data) {
                throw new Error(response.message || 'Search failed');
            }
            return response.data;
        },
        enabled: debouncedQuery.length >= 2,
        staleTime: 10 * 1000,
    });

    const entityResults: SearchResult[] = useMemo(() => {
        if (!searchQuery.data) return [];

        const taskResults = searchQuery.data.tasks.map((task) => ({
            id: `task-${task.id}`,
            type: 'task' as const,
            title: task.title,
            description: `${task.projectName} � ${task.priority || 'medium'}`,
            href: `/board?project=${task.projectId}`,
            icon: Checks,
        }));

        const projectResults = searchQuery.data.projects.map((project) => ({
            id: `project-${project.id}`,
            type: 'project' as const,
            title: project.name,
            description: project.description || 'Project',
            href: '/projects',
            icon: FolderKanban,
        }));

        const userResults = searchQuery.data.users.map((user) => ({
            id: `user-${user.id}`,
            type: 'user' as const,
            title: user.fullName,
            description: user.email,
            href: '/members',
            icon: User,
        }));

        return [...taskResults, ...projectResults, ...userResults].slice(0, 18);
    }, [searchQuery.data]);

    const filteredNavigation = useMemo(() => {
        if (!query.trim()) return navigationResults;
        return navigationResults.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.description?.toLowerCase().includes(query.toLowerCase())
        );
    }, [navigationResults, query]);

    const allResults = useMemo(
        () => (debouncedQuery.length >= 2 ? [...filteredNavigation, ...entityResults] : filteredNavigation),
        [debouncedQuery.length, entityResults, filteredNavigation]
    );

    useEffect(() => {
        if (isOpen) {
            window.setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }

            if (allResults.length === 0) return;

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSelectedIndex((current) => (current + 1) % allResults.length);
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSelectedIndex((current) => (current - 1 + allResults.length) % allResults.length);
            }

            if (event.key === 'Enter' && allResults[selectedIndex]) {
                event.preventDefault();
                navigate(allResults[selectedIndex].href);
                onClose();
            }
        },
        [allResults, navigate, onClose, selectedIndex]
    );

    const activeIndex = allResults.length === 0
        ? 0
        : Math.min(selectedIndex, allResults.length - 1);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl mx-4 glass-panel rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-4 px-5 py-4 border-b border-border-muted bg-surface/50 backdrop-blur-md">
                    <Search className="size-5 text-text-muted flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={t('search.placeholder')}
                        autoFocus
                        className="flex-1 bg-transparent border-none text-text text-lg placeholder:text-text-muted/50 focus:outline-none focus:ring-0"
                    />
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-alt border border-border-muted font-mono">esc</kbd>
                        <span>{t('search.esc_to_close')}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-surface-alt text-text-muted transition-colors"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="max-h-[420px] overflow-y-auto p-2 bg-surface/30">
                    {searchQuery.isFetching && debouncedQuery.length >= 2 ? (
                        <div className="py-8 text-center text-text-muted flex items-center justify-center gap-2 text-sm">
                            <SpinnerGap className="size-4 animate-spin" />
                            Searching...
                        </div>
                    ) : allResults.length === 0 ? (
                        <div className="py-12 text-center text-text-muted">
                            <Search className="size-10 mx-auto mb-3 opacity-30" />
                            <p>{t('search.no_results', { query })}</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                                {debouncedQuery.length >= 2 ? 'Search Results' : t('search.quick_navigation')}
                            </div>
                            {allResults.map((result, index) => {
                                const Icon = result.icon;
                                const isSelected = index === activeIndex;

                                return (
                                    <button
                                        key={result.id}
                                        onClick={() => {
                                            navigate(result.href);
                                            onClose();
                                        }}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-left ${
                                            isSelected
                                                ? 'bg-primary/20 text-white shadow-sm'
                                                : 'text-text-muted hover:bg-surface-alt'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/30 text-primary' : 'bg-surface-alt'}`}>
                                            <Icon className="size-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium ${isSelected ? 'text-text' : ''}`}>{result.title}</p>
                                            {result.description ? (
                                                <p className="text-sm text-text-muted truncate">{result.description}</p>
                                            ) : null}
                                        </div>
                                        {isSelected ? (
                                            <kbd className="px-2 py-1 rounded bg-surface-alt border border-border-muted text-xs font-mono text-text-muted">
                                                Enter
                                            </kbd>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-border-muted bg-surface-alt/50">
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-surface-alt border border-border-muted font-mono">^</kbd>
                            <kbd className="px-1.5 py-0.5 rounded bg-surface-alt border border-border-muted font-mono">v</kbd>
                            {t('search.to_navigate')}
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-surface-alt border border-border-muted font-mono">Enter</kbd>
                            {t('search.to_select')}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                        <Command className="size-3" />
                        <span>+</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-alt border border-border-muted font-mono">K</kbd>
                    </div>
                </div>
            </div>
        </div>
    );
}
