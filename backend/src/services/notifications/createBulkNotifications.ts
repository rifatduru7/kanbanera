import type { Env } from '../../types';
import { createNotification, type CreateNotificationOptions, type NotificationInput } from './createNotification';

export async function createBulkNotifications(
    env: Env,
    notifications: NotificationInput[],
    options?: CreateNotificationOptions,
) {
    const dedupedNotifications = new Map<string, NotificationInput>();

    for (const notification of notifications) {
        const key = `${notification.userId}:${notification.type}:${notification.link || ''}:${notification.title}:${notification.message}`;
        if (!dedupedNotifications.has(key)) {
            dedupedNotifications.set(key, notification);
        }
    }

    const results = [];
    for (const notification of dedupedNotifications.values()) {
        results.push(await createNotification(env, notification, options));
    }

    return results;
}
