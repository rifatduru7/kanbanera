import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass as Search, X, FileText, Kanban as FolderKanban, CalendarBlank as Calendar, User, ChartBar as BarChart3, Command, Checks, SpinnerGap, ClockCounterClockwise } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../../lib/api/client';
import { useViewport } from '../../hooks/useViewport';

interface SearchResult {
    id: string;
    type: 'page' | 'task' | 'project' | 'user';
    title: string;
    description?: string;
    href: string;
    icon: React.ElementType;
    priority?: string;
}

const RECENT_SEARCHES_KEY = 'era_kanban_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
    try {
        const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveRecentSearch(q: string) {
    const recents = getRecentSearches().filter((s) => s !== q);
    recents.unshift(q);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recents.slice(0, MAX_RECENT)));
}

function clearRecentSearches() {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
}

const navItems = [
    { id: 'dashboard', type: 'page', labelKey: 'nav.dashboard', descKey: 'search.desc.dashboard', href: '/dashboard', icon: BarChart3 },
    { id: 'projects', type: 'page', labelKey: 'nav.projects', descKey: 'search.desc.projects', href: '/projects', icon: FolderKanban },
    { id: 'board', type: 'page', labelKey: 'nav.board', descKey: 'search.desc.board', href: '/board', icon: FileText },
    { id: 'calendar', type: 'page', labelKey: 'nav.calendar', descKey: 'search.desc.calendar', href: '/calendar', icon: Calendar },
    { id: 'metrics', type: 'page', labelKey: 'nav.metrics', descKey: 'search.desc.metrics', href: '/metrics', icon: BarChart3 },
    { id: 'profile', type: 'page', labelKey: 'nav.profile', descKey: 'search.desc.profile', href: '/profile', icon: User },
] as const;

const priorityColors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-blue-500/20 text-blue-400',
};

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    mobileFullScreen?: boolean;
}

function useDebouncedValue<T>(value: T, delay = 250) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(timer);
    }, [delay, value]);

    return debounced;
}

function ResultItem({
    result,
    isSelected,
    onClick,
    onMouseEnter,
}: {
    result: SearchResult;
    isSelected: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
}) {
    const Icon = result.icon;
    return (
        <button
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-left ${isSelected
                ? 'bg-primary/20 text-white shadow-sm'
                : 'text-text-muted hover:bg-surface-alt'
                }`}
        >
            <div className={`p-2 rounded-lg flex-shrink-0 ${isSelected ? 'bg-primary/30 text-primary' : 'bg-surface-alt'}`}>
                <Icon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${isSelected ? 'text-text' : ''}`}>{result.title}</p>
                {result.description ? (
                    <p className="text-xs text-text-muted truncate">{result.description}</p>
                ) : null}
            </div>
            {result.priority && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${priorityColors[result.priority] || ''}`}>
                    {result.priority}
                </span>
            )}
            {isSelected ? (
                <kbd className="px-2 py-0.5 rounded bg-surface-alt border border-border-muted text-[10px] font-mono text-text-muted flex-shrink-0">
                    Enter
                </kbd>
            ) : null}
        </button>
    );
}

export function SearchModal({ isOpen, onClose, mobileFullScreen = true }: SearchModalProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const debouncedQuery = useDebouncedValue(query.trim(), 250);
    const { isMobile } = useViewport();

    useEffect(() => {
        if (isOpen) {
            setRecentSearches(getRecentSearches());
            window.setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const navigationResults: SearchResult[] = useMemo(() => navItems.map((item) => ({
        id: item.id,
        type: 'page',
        title: t(item.labelKey),
        description: t(item.descKey),
        href: item.href,
        icon: item.icon,
    })), [t]);

    const searchQueryResult = useQuery({
        queryKey: ['search', debouncedQuery],
        queryFn: async () => {
            const response = await searchApi.search({ q: debouncedQuery, scope: 'all', limit: 8 });
            if (!response.success || !response.data) {
                throw new Error(response.message || 'Search failed');
            }
            return response.data;
        },
        enabled: debouncedQuery.length >= 2,
        staleTime: 10 * 1000,
    });

    // Grouped entity results
    const taskResults: SearchResult[] = useMemo(() => {
        if (!searchQueryResult.data) return [];
        return searchQueryResult.data.tasks.map((task) => ({
            id: `task-${task.id}`,
            type: 'task' as const,
            title: task.title,
            description: `${task.projectName} · ${task.columnName || ''}`,
            href: `/board?project=${task.projectId}`,
            icon: Checks,
            priority: task.priority || 'medium',
        }));
    }, [searchQueryResult.data]);

    const projectResults: SearchResult[] = useMemo(() => {
        if (!searchQueryResult.data) return [];
        return searchQueryResult.data.projects.map((project) => ({
            id: `project-${project.id}`,
            type: 'project' as const,
            title: project.name,
            description: project.description || t('common.project'),
            href: `/board?project=${project.id}`,
            icon: FolderKanban,
        }));
    }, [searchQueryResult.data, t]);

    const userResults: SearchResult[] = useMemo(() => {
        if (!searchQueryResult.data) return [];
        return searchQueryResult.data.users.map((user) => ({
            id: `user-${user.id}`,
            type: 'user' as const,
            title: user.fullName,
            description: user.email,
            href: '/members',
            icon: User,
        }));
    }, [searchQueryResult.data]);

    const filteredNavigation = useMemo(() => {
        if (!query.trim()) return navigationResults;
        return navigationResults.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.description?.toLowerCase().includes(query.toLowerCase())
        );
    }, [navigationResults, query]);

    const hasEntityResults = debouncedQuery.length >= 2 && (taskResults.length > 0 || projectResults.length > 0 || userResults.length > 0);

    // Build flat result list for keyboard navigation
    const allResults = useMemo(() => {
        if (debouncedQuery.length >= 2) {
            return [...filteredNavigation, ...taskResults, ...projectResults, ...userResults];
        }
        return filteredNavigation;
    }, [debouncedQuery.length, filteredNavigation, taskResults, projectResults, userResults]);

    const handleSelect = useCallback((result: SearchResult) => {
        if (debouncedQuery.length >= 2) {
            saveRecentSearch(debouncedQuery);
        }
        navigate(result.href);
        onClose();
    }, [debouncedQuery, navigate, onClose]);

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
                handleSelect(allResults[selectedIndex]);
            }
        },
        [allResults, handleSelect, onClose, selectedIndex]
    );

    const activeIndex = allResults.length === 0
        ? 0
        : Math.min(selectedIndex, allResults.length - 1);

    // Calculate section start indices for keyboard navigation highlighting
    const navEndIdx = filteredNavigation.length;
    const taskEndIdx = navEndIdx + taskResults.length;
    const projectEndIdx = taskEndIdx + projectResults.length;

    if (!isOpen) return null;

    const isMobileFullScreen = mobileFullScreen && isMobile;
    const showRecentSearches = !query.trim() && recentSearches.length > 0;

    return (
        <div className={`fixed inset-0 z-[100] flex ${isMobileFullScreen ? 'items-stretch justify-stretch pt-0' : 'items-start justify-center pt-[15vh]'}`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative w-full glass-panel shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isMobileFullScreen ? 'h-[100dvh] max-w-none mx-0 rounded-none' : 'max-w-2xl mx-4 rounded-2xl'}`}>
                <div className={`flex items-center gap-4 border-b border-border-muted bg-surface/50 backdrop-blur-md ${isMobileFullScreen ? 'px-4 pt-safe pb-3' : 'px-5 py-4'}`}>
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

                <div className={`${isMobileFullScreen ? 'h-[calc(100dvh-148px)]' : 'max-h-[480px]'} overflow-y-auto p-2 bg-surface/30 mobile-scroll`}>
                    {searchQueryResult.isFetching && debouncedQuery.length >= 2 ? (
                        <div className="py-8 text-center text-text-muted flex items-center justify-center gap-2 text-sm">
                            <SpinnerGap className="size-4 animate-spin" />
                            {t('common.searching')}
                        </div>
                    ) : allResults.length === 0 && debouncedQuery.length >= 2 ? (
                        <div className="py-12 text-center text-text-muted">
                            <Search className="size-10 mx-auto mb-3 opacity-30" />
                            <p>{t('search.no_results', { query })}</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {/* Recent Searches */}
                            {showRecentSearches && (
                                <div>
                                    <div className="flex items-center justify-between px-3 py-2">
                                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('search.recent_searches', 'Recent Searches')}</span>
                                        <button
                                            onClick={() => {
                                                clearRecentSearches();
                                                setRecentSearches([]);
                                            }}
                                            className="text-[10px] text-text-muted hover:text-red-400 transition-colors"
                                        >
                                            {t('common.clear', 'Clear')}
                                        </button>
                                    </div>
                                    {recentSearches.map((term) => (
                                        <button
                                            key={term}
                                            onClick={() => setQuery(term)}
                                            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-left text-text-muted hover:bg-surface-alt transition-colors"
                                        >
                                            <ClockCounterClockwise className="size-4 flex-shrink-0" />
                                            <span className="text-sm">{term}</span>
                                        </button>
                                    ))}
                                    <div className="h-px bg-border-muted mx-3 my-2" />
                                </div>
                            )}

                            {/* Navigation Results */}
                            {filteredNavigation.length > 0 && (
                                <div>
                                    <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                                        {t('search.quick_navigation', 'Quick Navigation')}
                                    </div>
                                    {filteredNavigation.map((result, index) => (
                                        <ResultItem
                                            key={result.id}
                                            result={result}
                                            isSelected={index === activeIndex}
                                            onClick={() => handleSelect(result)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Task Results */}
                            {taskResults.length > 0 && (
                                <div>
                                    <div className="px-3 py-2 mt-1 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                        <Checks className="size-3.5" />
                                        {t('search.section_tasks', 'Tasks')}
                                        <span className="text-primary/70">({taskResults.length})</span>
                                    </div>
                                    {taskResults.map((result, idx) => {
                                        const flatIdx = navEndIdx + idx;
                                        return (
                                            <ResultItem
                                                key={result.id}
                                                result={result}
                                                isSelected={flatIdx === activeIndex}
                                                onClick={() => handleSelect(result)}
                                                onMouseEnter={() => setSelectedIndex(flatIdx)}
                                            />
                                        );
                                    })}
                                </div>
                            )}

                            {/* Project Results */}
                            {projectResults.length > 0 && (
                                <div>
                                    <div className="px-3 py-2 mt-1 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                        <FolderKanban className="size-3.5" />
                                        {t('search.section_projects', 'Projects')}
                                        <span className="text-primary/70">({projectResults.length})</span>
                                    </div>
                                    {projectResults.map((result, idx) => {
                                        const flatIdx = taskEndIdx + idx;
                                        return (
                                            <ResultItem
                                                key={result.id}
                                                result={result}
                                                isSelected={flatIdx === activeIndex}
                                                onClick={() => handleSelect(result)}
                                                onMouseEnter={() => setSelectedIndex(flatIdx)}
                                            />
                                        );
                                    })}
                                </div>
                            )}

                            {/* User Results */}
                            {userResults.length > 0 && (
                                <div>
                                    <div className="px-3 py-2 mt-1 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                        <User className="size-3.5" />
                                        {t('search.section_users', 'Users')}
                                        <span className="text-primary/70">({userResults.length})</span>
                                    </div>
                                    {userResults.map((result, idx) => {
                                        const flatIdx = projectEndIdx + idx;
                                        return (
                                            <ResultItem
                                                key={result.id}
                                                result={result}
                                                isSelected={flatIdx === activeIndex}
                                                onClick={() => handleSelect(result)}
                                                onMouseEnter={() => setSelectedIndex(flatIdx)}
                                            />
                                        );
                                    })}
                                </div>
                            )}

                            {/* No entity results with search active */}
                            {debouncedQuery.length >= 2 && !hasEntityResults && !searchQueryResult.isFetching && (
                                <div className="py-6 text-center text-text-muted text-sm">
                                    {t('search.no_entity_results', 'No tasks, projects or users found.')}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={`items-center justify-between px-5 py-3 border-t border-border-muted bg-surface-alt/50 ${isMobileFullScreen ? 'hidden' : 'flex'}`}>
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
