import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotificationPreferences, useNotifications } from './useKanbanData';

export function usePushNotifications() {
    const { t } = useTranslation();
    const { data: notificationsData } = useNotifications();
    const { data: preferences } = useNotificationPreferences();
    const notifiedIds = useRef<Set<string>>(new Set());

    const notifications = notificationsData?.pages.flatMap((page) => page.items || []) || [];

    useEffect(() => {
        if (!preferences?.push_notifications || !('Notification' in window)) {
            return;
        }

        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, [preferences?.push_notifications]);

    useEffect(() => {
        if (!preferences?.push_notifications || !notifications.length || !('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const unreadNotifications = notifications.filter((notification) => !notification.is_read);
        const newNotifications = unreadNotifications.filter((notification) => !notifiedIds.current.has(notification.id));

        if (notifiedIds.current.size === 0 && unreadNotifications.length > 0) {
            unreadNotifications.forEach((notification) => notifiedIds.current.add(notification.id));
            return;
        }

        if (newNotifications.length > 1) {
            new Notification('Kanbanera', {
                body: t('notifications.browser_summary', { count: newNotifications.length }),
                icon: '/favicon.ico',
            });
        } else if (newNotifications.length === 1) {
            const [latest] = newNotifications;
            new Notification(latest.title, {
                body: latest.message,
                icon: '/favicon.ico',
            });
        }

        newNotifications.forEach((notification) => notifiedIds.current.add(notification.id));
    }, [notifications, preferences?.push_notifications, t]);
}
