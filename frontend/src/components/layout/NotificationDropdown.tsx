import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Bell,
    Checks,
    Circle,
    ClockCounterClockwise,
    Gear,
    Info,
    SealCheck,
    WarningCircle,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../../hooks/useKanbanData';
import type { ApiNotification } from '../../lib/api/client';
import { AnimatedIcon } from '../ui/AnimatedIcon';

export function NotificationDropdown() {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const notificationsQuery = useNotifications();
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const pages = notificationsQuery.data?.pages || [];
    const notifications = pages.flatMap((page) => page.items || []);
    const unreadCount = pages[0]?.unreadCount || 0;
    const unreadNotifications = notifications.filter((notification) => !notification.is_read);
    const earlierNotifications = notifications.filter((notification) => notification.is_read);

    const formatTimestamp = (value: string) => {
        return new Date(value).toLocaleString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleMarkAllRead = async () => {
        if (unreadCount > 0) {
            await markAllRead.mutateAsync();
        }
    };

    const handleMarkRead = async (id: string, event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        await markRead.mutateAsync(id);
    };

    const sections = useMemo(() => ([
        { key: 'unread', title: t('notifications.sections.unread'), items: unreadNotifications },
        { key: 'earlier', title: t('notifications.sections.earlier'), items: earlierNotifications },
    ].filter((section) => section.items.length > 0)), [earlierNotifications, t, unreadNotifications]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen((current) => !current)}
                className={`flex items-center justify-center size-11 sm:size-9 rounded-lg transition-all ${
                    isOpen ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text hover:bg-surface-alt'
                }`}
                title={t('notifications.title')}
            >
                <div className="relative">
                    <AnimatedIcon icon={Bell} animation="wiggle" className="size-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center border-2 border-surface animate-pop">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-border/50 flex items-center justify-between sticky top-0 bg-surface/80 backdrop-blur-md z-10">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-text">{t('notifications.title')}</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                                    {t('notifications.new_count', { count: unreadCount })}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleMarkAllRead}
                            disabled={unreadCount === 0 || markAllRead.isPending}
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-text-muted"
                            title={t('notifications.mark_all_read')}
                        >
                            <Checks className="size-5" />
                        </button>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
                        {notificationsQuery.isLoading ? (
                            <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                                <span className="text-sm">{t('notifications.loading')}</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="size-12 rounded-full bg-surface-alt flex items-center justify-center mb-3">
                                    <Bell className="size-6 text-text-muted/50" weight="duotone" />
                                </div>
                                <p className="text-text font-medium mb-1">{t('notifications.empty_title')}</p>
                                <p className="text-sm text-text-muted">{t('notifications.empty_description')}</p>
                            </div>
                        ) : (
                            <>
                                {sections.map((section) => (
                                    <div key={section.key}>
                                        <div className="px-4 py-2 bg-surface-alt/50 border-y border-border/30 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                                            {section.title}
                                        </div>
                                        <div className="divide-y divide-border/30">
                                            {section.items.map((notification) => (
                                                <NotificationCard
                                                    key={notification.id}
                                                    notification={notification}
                                                    formatTimestamp={formatTimestamp}
                                                    onMarkRead={handleMarkRead}
                                                    onNavigate={() => setIsOpen(false)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {notificationsQuery.hasNextPage && (
                                    <div className="p-3 border-t border-border/30">
                                        <button
                                            onClick={() => notificationsQuery.fetchNextPage()}
                                            disabled={notificationsQuery.isFetchingNextPage}
                                            className="w-full px-3 py-2 rounded-lg bg-surface-alt text-sm font-medium text-text hover:bg-surface transition-colors disabled:opacity-60"
                                        >
                                            {notificationsQuery.isFetchingNextPage
                                                ? t('notifications.loading')
                                                : t('notifications.load_more')}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function NotificationCard({
    notification,
    formatTimestamp,
    onMarkRead,
    onNavigate,
}: {
    notification: ApiNotification;
    formatTimestamp: (value: string) => string;
    onMarkRead: (id: string, event: React.MouseEvent) => Promise<void>;
    onNavigate: () => void;
}) {
    const { t } = useTranslation();
    const iconConfig = getNotificationAppearance(notification.type);
    const Icon = iconConfig.Icon;
    const content = (
        <div className={`relative p-4 transition-colors hover:bg-surface-alt/50 ${!notification.is_read ? 'bg-primary/5' : ''}`}>
            <div className="flex gap-3">
                <div className={`shrink-0 mt-1 size-8 rounded-full flex items-center justify-center ${iconConfig.containerClass}`}>
                    <Icon className="size-4" weight="bold" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                        <div className="min-w-0">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide mb-1 ${iconConfig.badgeClass}`}>
                                {t(`notifications.types.${notification.type}`)}
                            </span>
                            <p className={`text-sm font-medium truncate ${!notification.is_read ? 'text-text' : 'text-text-muted'}`}>
                                {notification.title}
                            </p>
                        </div>
                        <span className="text-[10px] text-text-muted/70 whitespace-nowrap shrink-0 mt-0.5">
                            {formatTimestamp(notification.created_at)}
                        </span>
                    </div>

                    <p className="text-sm text-text-muted line-clamp-2 mb-2">
                        {notification.message}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                        {notification.link ? (
                            <span className="text-xs font-medium text-primary">{t('notifications.view_details')}</span>
                        ) : (
                            <span className="text-xs font-medium text-text-muted">{t('notifications.no_link')}</span>
                        )}

                        {!notification.is_read && (
                            <button
                                onClick={(event) => onMarkRead(notification.id, event)}
                                className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text transition-colors ml-auto group"
                                title={t('notifications.mark_read')}
                            >
                                <Circle className="size-3 transition-colors group-hover:text-primary" weight="fill" />
                                {t('notifications.mark_read')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    if (!notification.link) {
        return content;
    }

    return (
        <Link to={notification.link} onClick={onNavigate}>
            {content}
        </Link>
    );
}

function getNotificationAppearance(type: ApiNotification['type']) {
    switch (type) {
        case 'project_invite':
            return { Icon: Info, containerClass: 'bg-cyan-500/20 text-cyan-400', badgeClass: 'bg-cyan-500/15 text-cyan-300' };
        case 'task_assigned':
            return { Icon: Bell, containerClass: 'bg-blue-500/20 text-blue-400', badgeClass: 'bg-blue-500/15 text-blue-300' };
        case 'task_overdue':
            return { Icon: WarningCircle, containerClass: 'bg-amber-500/20 text-amber-400', badgeClass: 'bg-amber-500/15 text-amber-300' };
        case 'task_approval_approved':
            return { Icon: SealCheck, containerClass: 'bg-emerald-500/20 text-emerald-400', badgeClass: 'bg-emerald-500/15 text-emerald-300' };
        case 'task_approval_revision_requested':
            return { Icon: WarningCircle, containerClass: 'bg-orange-500/20 text-orange-400', badgeClass: 'bg-orange-500/15 text-orange-300' };
        case 'automation_succeeded':
            return { Icon: Gear, containerClass: 'bg-violet-500/20 text-violet-400', badgeClass: 'bg-violet-500/15 text-violet-300' };
        case 'automation_failed':
            return { Icon: WarningCircle, containerClass: 'bg-rose-500/20 text-rose-400', badgeClass: 'bg-rose-500/15 text-rose-300' };
        case 'task_mentioned':
            return { Icon: Info, containerClass: 'bg-sky-500/20 text-sky-400', badgeClass: 'bg-sky-500/15 text-sky-300' };
        case 'system':
        default:
            return { Icon: ClockCounterClockwise, containerClass: 'bg-surface-alt text-text-muted', badgeClass: 'bg-surface-alt text-text-muted' };
    }
}
