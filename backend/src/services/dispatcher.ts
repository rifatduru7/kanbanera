import type { Env } from '../types';

export type WebhookEvent = 'task_created' | 'task_moved' | 'comment_added';

interface DispatchPayload {
    event: WebhookEvent;
    project_id: string;
    task: { title: string; url?: string; assignee?: string };
    user: { name: string };
    details?: { from_column?: string; to_column?: string; comment?: string };
}

/**
 * Dispatches an event to all integrated webhooks for a project.
 * Uses `c.executionCtx.waitUntil` to send in the background without blocking the response.
 */
export async function dispatchOutgoingWebhooks(env: Env, payload: DispatchPayload, ctx: ExecutionContext) {
    ctx.waitUntil(
        (async () => {
            try {
                // Fetch active integrations for the project
                const { results } = await env.DB.prepare(
                    `SELECT provider, webhook_url FROM integrations WHERE project_id = ? AND is_active = 1`
                )
                    .bind(payload.project_id)
                    .all<{ provider: string; webhook_url: string }>();

                if (!results || results.length === 0) return;

                const promises = results.map(integration => {
                    if (!integration.webhook_url) return Promise.resolve();

                    const fetchPayload = formatPayload(integration.provider, payload);
                    if (!fetchPayload) return Promise.resolve();

                    return fetch(integration.webhook_url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(fetchPayload)
                    }).catch(err => {
                        console.error(`Failed to send webhook to ${integration.provider}:`, err);
                    });
                });

                await Promise.allSettled(promises);
            } catch (err) {
                console.error('Error dispatching webhooks:', err);
            }
        })()
    );
}

function formatPayload(provider: string, payload: DispatchPayload) {
    const text = getEventText(payload);

    switch (provider) {
        case 'slack':
            return {
                text: text,
                blocks: [
                    {
                        type: 'section',
                        text: { type: 'mrkdwn', text: `*ERA KANBAN Update*\n${text}` }
                    }
                ]
            };
        case 'teams':
            return {
                '@type': 'MessageCard',
                '@context': 'http://schema.org/extensions',
                themeColor: '0076D7',
                summary: 'ERA KANBAN Update',
                sections: [{ activityTitle: 'ERA KANBAN Update', activitySubtitle: text }]
            };
        case 'telegram':
            // Telegram usually expects `chat_id` and `text` in standard bot API calls.
            // But if users paste a formatted webhook URL (e.g., Make.com/Zapier), just sending standard JSON is safer.
            // If they are pasting the direct Telegram Bot API url, it typically ends with /sendMessage?chat_id=...
            return { text: text };
        case 'webhook':
        default:
            return {
                event: payload.event,
                message: text,
                data: payload
            };
    }
}

function getEventText(payload: DispatchPayload) {
    const { event, task, user, details } = payload;

    switch (event) {
        case 'task_created':
            return `${user.name} created a new task: "${task.title}".`;
        case 'task_moved':
            return `${user.name} moved task "${task.title}" from [${details?.from_column || 'unknown'}] to [${details?.to_column || 'unknown'}].`;
        case 'comment_added':
            return `${user.name} commented on "${task.title}": "${details?.comment}"`;
        default:
            return `A project update occurred regarding task "${task.title}".`;
    }
}
