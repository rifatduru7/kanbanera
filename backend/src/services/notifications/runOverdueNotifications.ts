import type { Env } from '../../types';
import { createNotification } from './createNotification';

interface OverdueTaskRow {
    id: string;
    project_id: string;
    title: string;
    due_date: string;
    assignee_id: string | null;
    created_by: string;
}

export async function runOverdueNotifications(env: Env) {
    const notificationDay = new Date().toISOString().slice(0, 10);

    const { results } = await env.DB.prepare(
        `SELECT t.id, t.project_id, t.title, t.due_date, t.assignee_id, t.created_by
         FROM tasks t
         LEFT JOIN columns c ON c.id = t.column_id
         WHERE (t.is_archived = 0 OR t.is_archived IS NULL)
           AND t.due_date IS NOT NULL
           AND date(t.due_date) < date('now')
           AND (c.name IS NULL OR lower(c.name) NOT LIKE '%done%')`
    ).all<OverdueTaskRow>();

    for (const task of results || []) {
        const recipientId = task.assignee_id || task.created_by;
        if (!recipientId) continue;

        await createNotification(
            env,
            {
                userId: recipientId,
                type: 'task_overdue',
                title: 'Task overdue',
                message: `"${task.title}" is overdue since ${task.due_date}.`,
                link: `/board?project=${task.project_id}&task=${task.id}`,
                metadata: {
                    task_id: task.id,
                    project_id: task.project_id,
                    due_date: task.due_date,
                    notification_day: notificationDay,
                },
            },
            {
                dedupe: {
                    where: `
                        json_extract(metadata, '$.task_id') = ?
                        AND json_extract(metadata, '$.notification_day') = ?
                    `,
                    params: [task.id, notificationDay],
                },
            },
        );
    }
}
