import { RefreshCw, Bell, Menu, ChevronRight, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
    projectName?: string;
    sprintName?: string;
    isActive?: boolean;
    onMenuClick?: () => void;
    onRefresh?: () => void;
    lastSynced?: Date | null;
}

export function Header({
    projectName = 'Projects',
    sprintName,
    isActive = true,
    onMenuClick,
    onRefresh,
    lastSynced,
}: HeaderProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await onRefresh?.();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const getSyncText = () => {
        if (!lastSynced) return 'Synced just now';
        const diff = Date.now() - lastSynced.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Synced just now';
        if (mins === 1) return 'Synced 1 min ago';
        return `Synced ${mins} mins ago`;
    };

    return (
        <header className="glass-header h-16 shrink-0 flex items-center justify-between px-6 z-10 sticky top-0 w-full">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="text-slate-400 hover:text-white lg:hidden"
                >
                    <Menu className="size-6" />
                </button>

                {/* Breadcrumbs */}
                <div className="hidden md:flex items-center gap-2 text-sm">
                    <span className="text-slate-500 font-medium">{projectName}</span>
                    {sprintName && (
                        <>
                            <ChevronRight className="text-slate-600 size-4" />
                            <span className="text-slate-300 font-medium">{sprintName}</span>
                        </>
                    )}
                    {isActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide ml-2">
                            Active
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Sync Status */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-sm cursor-default">
                    <CheckCircle className="text-emerald-400 size-4" />
                    <span className="text-xs text-slate-300 font-medium">
                        {getSyncText()}
                    </span>
                </div>

                {/* Notifications */}
                <button
                    className="flex items-center justify-center size-9 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Notifications"
                >
                    <div className="relative">
                        <Bell className="size-5" />
                        <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full border-2 border-[#0f172a]" />
                    </div>
                </button>

                {/* Refresh Button */}
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow-lg shadow-primary/25 disabled:opacity-70"
                >
                    <RefreshCw
                        className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>
        </header>
    );
}
