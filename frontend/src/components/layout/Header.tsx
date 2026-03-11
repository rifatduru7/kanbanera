import { ArrowsClockwise as RefreshCw, List as Menu, CaretRight as ChevronRight, CheckCircle, MagnifyingGlass as Search, Command } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { NotificationDropdown } from './NotificationDropdown';

interface HeaderProps {
    projectName?: string;
    sprintName?: string;
    isActive?: boolean;
    onMenuClick?: () => void;
    onRefresh?: () => void;
    lastSynced?: Date | null;
    onSearchClick?: () => void;
}

export function Header({
    projectName = 'Projects',
    sprintName,
    isActive = true,
    onMenuClick,
    onRefresh,
    lastSynced,
    onSearchClick,
}: HeaderProps) {
    const { t } = useTranslation();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => {
            setCurrentTimeMs(Date.now());
        }, 60000);

        return () => window.clearInterval(timer);
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await onRefresh?.();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const getSyncText = () => {
        if (!lastSynced) return t('common.synced_just_now');
        const diff = currentTimeMs - lastSynced.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t('common.synced_just_now');
        if (mins === 1) return t('common.synced_min_ago');
        return t('common.synced_mins_ago', { count: mins });
    };

    return (
        <header className="glass-header h-16 shrink-0 flex items-center justify-between px-3 sm:px-4 md:px-6 z-10 sticky top-0 w-full">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="text-text-muted hover:text-text lg:hidden"
                >
                    <AnimatedIcon icon={Menu} animation="wiggle" className="size-6" />
                </button>

                {/* Breadcrumbs */}
                <div className="hidden md:flex items-center gap-2 text-sm">
                    <span className="text-text-muted font-medium">{projectName}</span>
                    {sprintName && (
                        <>
                            <ChevronRight className="text-border size-4" />
                            <span className="text-text font-medium">{sprintName}</span>
                        </>
                    )}
                    {isActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide ml-2">
                            {t('common.active')}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                {/* Search Button */}
                <button
                    onClick={onSearchClick}
                    className="flex items-center justify-center sm:justify-start gap-2 h-11 sm:h-9 w-11 sm:w-auto px-0 sm:px-3 rounded-lg bg-surface border border-border hover:bg-surface-alt transition-all text-text-muted hover:text-text"
                >
                    <AnimatedIcon icon={Search} animation="hover" className="size-4" />
                    <span className="hidden md:inline text-sm">{t('common.search_dots')}</span>
                    <div className="hidden md:flex items-center gap-0.5 text-xs ml-2 text-text-muted/60">
                        <Command className="size-3" />
                        <span>K</span>
                    </div>
                </button>

                {/* Sync Status */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border shadow-sm cursor-default">
                    <AnimatedIcon icon={CheckCircle} animation="pulse" className="text-emerald-500 size-4" />
                    <span className="text-xs text-text font-medium">
                        {getSyncText()}
                    </span>
                </div>

                {/* Notifications */}
                <span className="hidden sm:inline-block">
                    <NotificationDropdown />
                </span>

                {/* Refresh Button */}
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center justify-center gap-2 h-11 sm:h-9 w-11 sm:w-auto px-0 sm:px-4 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow-lg shadow-primary/25 disabled:opacity-70"
                >
                    <AnimatedIcon
                        icon={RefreshCw}
                        animation={isRefreshing ? 'spin' : 'hover'}
                        className="size-4"
                    />
                    <span className="hidden md:inline">{t('common.refresh')}</span>
                </button>
            </div>
        </header>
    );
}
