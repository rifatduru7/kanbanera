import type { Env, NotificationType } from '../../types';

export interface NotificationInput {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string | null;
    metadata?: Record<string, unknown> | null;
}

export interface NotificationDedupeConfig {
    where: string;
    params?: unknown[];
}

export interface CreateNotificationOptions {
    dedupe?: NotificationDedupeConfig;
}

export async function createNotification(
    env: Env,
    input: NotificationInput,
    options?: CreateNotificationOptions,
) {
    const link = input.link?.trim() || null;
    const metadata = input.metadata ?? null;

    if (options?.dedupe) {
        const { where, params = [] } = options.dedupe;
        const existing = await env.DB.prepare(
            `SELECT id FROM notifications
             WHERE user_id = ? AND type = ? AND (${where})
             LIMIT 1`
        )
            .bind(input.userId, input.type, ...params)
            .first<{ id: string }>();

        if (existing) {
            return { created: false, id: existing.id };
        }
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(
        `INSERT INTO notifications (id, user_id, type, title, message, link, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
        .bind(
            id,
            input.userId,
            input.type,
            input.title.trim(),
            input.message.trim(),
            link,
            metadata ? JSON.stringify(metadata) : null,
        )
        .run();

    return { created: true, id };
}
