import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Checks, Circle, Info } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../hooks/useKanbanData';
import type { ApiNotification } from '../../lib/api/client';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { Link } from 'react-router-dom';

export function NotificationDropdown() {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { data: notifications, isLoading } = useNotifications();
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications?.filter((n: ApiNotification) => !n.is_read).length || 0;

    const handleMarkAllRead = async () => {
        if (unreadCount > 0) {
            await markAllRead.mutateAsync();
        }
    };

    const handleMarkRead = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await markRead.mutateAsync(id);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center size-11 sm:size-9 rounded-lg transition-all ${isOpen ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text hover:bg-surface-alt"
                    }`}
                title={t('common.notifications', 'Notifications')}
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

            {/* Dropdown Content */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-border/50 flex items-center justify-between sticky top-0 bg-surface/80 backdrop-blur-md z-10">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-text">{t('common.notifications', 'Notifications')}</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleMarkAllRead}
                            disabled={unreadCount === 0 || markAllRead.isPending}
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-text-muted"
                            title={t('common.mark_all_read', 'Mark all as read')}
                        >
                            <Checks className="size-5" />
                        </button>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                                <span className="text-sm">Loading notifications...</span>
                            </div>
                        ) : !notifications?.length ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="size-12 rounded-full bg-surface-alt flex items-center justify-center mb-3">
                                    <Bell className="size-6 text-text-muted/50" weight="duotone" />
                                </div>
                                <p className="text-text font-medium mb-1">All caught up!</p>
                                <p className="text-sm text-text-muted">You don't have any notifications right now.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/30">
                                {notifications.map((notification: ApiNotification) => (
                                    <div
                                        key={notification.id}
                                        className={`relative p-4 transition-colors hover:bg-surface-alt/50 ${!notification.is_read ? "bg-primary/5" : ""
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            {/* Icon Indicator */}
                                            <div className="shrink-0 mt-1">
                                                {notification.type === 'task_assigned' && (
                                                    <div className="size-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                                        <Info className="size-4" weight="bold" />
                                                    </div>
                                                )}
                                                {notification.type === 'project_invite' && (
                                                    <div className="size-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                                        <Check className="size-4" weight="bold" />
                                                    </div>
                                                )}
                                                {/* Fallback */}
                                                {!['task_assigned', 'project_invite'].includes(notification.type) && (
                                                    <div className="size-8 rounded-full bg-surface-alt text-text-muted flex items-center justify-center">
                                                        <Bell className="size-4" weight="bold" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2 mb-1">
                                                    <p className={`text-sm font-medium truncate ${!notification.is_read ? "text-text" : "text-text-muted"
                                                        }`}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[10px] text-text-muted/70 whitespace-nowrap shrink-0 mt-0.5">
                                                        {new Date(notification.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-text-muted line-clamp-2 mb-2">
                                                    {notification.message}
                                                </p>

                                                <div className="flex items-center justify-between">
                                                    {notification.link && (
                                                        <Link
                                                            to={notification.link}
                                                            onClick={() => setIsOpen(false)}
                                                            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                                        >
                                                            View Details
                                                        </Link>
                                                    )}

                                                    {!notification.is_read && (
                                                        <button
                                                            onClick={(e) => handleMarkRead(notification.id, e)}
                                                            className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text transition-colors ml-auto group"
                                                            title="Mark as read"
                                                        >
                                                            <Circle className="size-3 transition-colors group-hover:text-primary" weight="fill" />
                                                            Mark Read
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
