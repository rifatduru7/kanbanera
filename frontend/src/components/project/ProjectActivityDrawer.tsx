import { X } from '@phosphor-icons/react';
import { ActivityFeed } from '../activity/ActivityFeed';
import { useTranslation } from 'react-i18next';
import { useViewport } from '../../hooks/useViewport';

interface ProjectActivityDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    mobileMode?: 'sheet' | 'drawer';
}

export function ProjectActivityDrawer({ isOpen, onClose, projectId, mobileMode = 'sheet' }: ProjectActivityDrawerProps) {
    const { t } = useTranslation();
    const { isMobile } = useViewport();

    if (!isOpen) return null;

    const useSheet = isMobile && mobileMode === 'sheet';

    return (
        <div className={`fixed inset-0 z-50 flex ${useSheet ? 'items-end justify-stretch' : 'justify-end'}`}>
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className={`relative w-full bg-surface shadow-2xl flex flex-col animate-in duration-300 ${useSheet ? 'max-h-[85dvh] rounded-t-2xl border-t border-border slide-in-from-bottom' : 'max-w-md h-full border-l border-border slide-in-from-right'}`}>
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/50 bg-background/50 backdrop-blur">
                    <h2 className="text-lg font-bold text-text">{t('projects.activity_feed', 'Activity Feed')}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-text-muted hover:text-text hover:bg-surface-alt rounded-lg transition-colors"
                    >
                        <X className="size-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-hidden bg-background/30 [&>div]:border-none [&>div>div]:border-none [&>div>div:first-child]:hidden">
                    {/* The complex CSS classes basically hide the default ActivityFeed header since we have our own, and removes the double border */}
                    <ActivityFeed projectId={projectId} compact={false} />
                </div>
            </div>
        </div>
    );
}
