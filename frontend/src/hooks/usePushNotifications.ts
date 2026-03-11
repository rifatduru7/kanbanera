import { useEffect, useRef } from 'react';
import { useNotifications } from './useKanbanData';

export function usePushNotifications() {
    const { data: notifications } = useNotifications();

    // Keep track of notified IDs to avoid spamming
    const notifiedIds = useRef<Set<string>>(new Set());

    // Request permission on mount
    useEffect(() => {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }, []);

    // Trigger notification when new unread notifications arrive
    useEffect(() => {
        if (!notifications || !('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const unreadNotifications = notifications.filter(n => !n.is_read);

        // Find newly arrived ones that we haven't notified about yet
        const newNotifications = unreadNotifications.filter(n => !notifiedIds.current.has(n.id));

        if (newNotifications.length > 0) {
            // Show the most recent one if multiple arrived
            const latest = newNotifications[0];

            // Or if many arrived, summarize
            if (newNotifications.length > 1) {
                new Notification('Kanbanera', {
                    body: `You have ${newNotifications.length} new notifications`,
                    icon: '/favicon.ico'
                });
            } else {
                new Notification(latest.title, {
                    body: latest.message,
                    icon: '/favicon.ico'
                });
            }

            // Mark these as notified
            newNotifications.forEach(n => notifiedIds.current.add(n.id));
        }

        // Initialize notified IDs on first load so we don't notify for old unread stuff
        if (notifiedIds.current.size === 0 && unreadNotifications.length > 0) {
            unreadNotifications.forEach(n => notifiedIds.current.add(n.id));
        }

    }, [notifications]);
}
