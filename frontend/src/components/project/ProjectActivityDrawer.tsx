import { X } from '@phosphor-icons/react';
import { ActivityFeed } from '../activity/ActivityFeed';
import { useTranslation } from 'react-i18next';

interface ProjectActivityDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

export function ProjectActivityDrawer({ isOpen, onClose, projectId }: ProjectActivityDrawerProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md h-full bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/50 backdrop-blur">
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
