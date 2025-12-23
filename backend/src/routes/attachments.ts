import { Hono } from 'hono';
import type { Env, Task, Attachment } from '../types';
import { authMiddleware } from '../middleware/auth';

export const attachmentRoutes = new Hono<{ Bindings: Env }>();

// All routes require authentication
attachmentRoutes.use('*', authMiddleware);

// POST /api/attachments/presign - Get presigned URL for upload
attachmentRoutes.post('/presign', async (c) => {
    const userId = c.get('userId');

    try {
        const body = await c.req.json();
        const { task_id, file_name, content_type } = body;

        if (!task_id || !file_name) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'task_id and file_name are required' },
                400
            );
        }

        // Check task access
        const task = await c.env.DB.prepare(
            `SELECT t.* FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE t.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(task_id, userId, userId)
            .first<Task>();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or access denied' },
                404
            );
        }

        // Generate unique R2 key
        const attachmentId = crypto.randomUUID();
        const ext = file_name.split('.').pop() || '';
        const r2Key = `attachments/${task.project_id}/${task_id}/${attachmentId}${ext ? '.' + ext : ''}`;

        // For R2, we need to create a presigned URL
        // Note: In a real implementation, you'd use the S3-compatible API
        // For now, we'll return the key for direct upload via Worker

        return c.json({
            success: true,
            data: {
                attachment_id: attachmentId,
                r2_key: r2Key,
                upload_url: `/api/attachments/upload`,
                file_name,
                content_type: content_type || 'application/octet-stream',
            },
        });
    } catch (error) {
        console.error('Presign error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to generate upload URL' },
            500
        );
    }
});

// POST /api/attachments/upload - Upload file (alternative to presigned URL)
attachmentRoutes.post('/upload', async (c) => {
    const userId = c.get('userId');

    try {
        const formData = await c.req.formData();
        const file = formData.get('file') as File | null;
        const taskId = formData.get('task_id') as string | null;

        if (!file || !taskId) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'file and task_id are required' },
                400
            );
        }

        // Check task access
        const task = await c.env.DB.prepare(
            `SELECT t.* FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE t.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(taskId, userId, userId)
            .first<Task>();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or access denied' },
                404
            );
        }

        // Generate R2 key
        const attachmentId = crypto.randomUUID();
        const ext = file.name.split('.').pop() || '';
        const r2Key = `attachments/${task.project_id}/${taskId}/${attachmentId}${ext ? '.' + ext : ''}`;

        // Upload to R2
        await c.env.STORAGE.put(r2Key, await file.arrayBuffer(), {
            httpMetadata: {
                contentType: file.type || 'application/octet-stream',
            },
        });

        // Save metadata to D1
        await c.env.DB.prepare(
            `INSERT INTO attachments (id, task_id, user_id, file_name, r2_key, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
            .bind(attachmentId, taskId, userId, file.name, r2Key, file.size, file.type || null)
            .run();

        // Log activity
        await c.env.DB.prepare(
            `INSERT INTO activity_log (id, project_id, task_id, user_id, action, details)
       VALUES (?, ?, ?, ?, 'attachment_added', ?)`
        )
            .bind(crypto.randomUUID(), task.project_id, taskId, userId, JSON.stringify({ file_name: file.name }))
            .run();

        const attachment = await c.env.DB.prepare('SELECT * FROM attachments WHERE id = ?')
            .bind(attachmentId)
            .first<Attachment>();

        return c.json({
            success: true,
            data: { attachment },
        }, 201);
    } catch (error) {
        console.error('Upload error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to upload file' },
            500
        );
    }
});

// POST /api/attachments/confirm - Confirm upload (for presigned URL flow)
attachmentRoutes.post('/confirm', async (c) => {
    const userId = c.get('userId');

    try {
        const body = await c.req.json();
        const { task_id, attachment_id, r2_key, file_name, file_size, mime_type } = body;

        if (!task_id || !attachment_id || !r2_key || !file_name) {
            return c.json(
                { success: false, error: 'Validation Error', message: 'Missing required fields' },
                400
            );
        }

        // Check task access
        const task = await c.env.DB.prepare(
            `SELECT t.* FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE t.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(task_id, userId, userId)
            .first<Task>();

        if (!task) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Task not found or access denied' },
                404
            );
        }

        // Verify file exists in R2
        const object = await c.env.STORAGE.head(r2_key);
        if (!object) {
            return c.json(
                { success: false, error: 'Not Found', message: 'File not found in storage' },
                404
            );
        }

        // Save metadata to D1
        await c.env.DB.prepare(
            `INSERT INTO attachments (id, task_id, user_id, file_name, r2_key, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
            .bind(attachment_id, task_id, userId, file_name, r2_key, file_size || object.size, mime_type || null)
            .run();

        // Log activity
        await c.env.DB.prepare(
            `INSERT INTO activity_log (id, project_id, task_id, user_id, action, details)
       VALUES (?, ?, ?, ?, 'attachment_added', ?)`
        )
            .bind(crypto.randomUUID(), task.project_id, task_id, userId, JSON.stringify({ file_name }))
            .run();

        const attachment = await c.env.DB.prepare('SELECT * FROM attachments WHERE id = ?')
            .bind(attachment_id)
            .first<Attachment>();

        return c.json({
            success: true,
            data: { attachment },
        }, 201);
    } catch (error) {
        console.error('Confirm upload error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to confirm upload' },
            500
        );
    }
});

// GET /api/attachments/:id/download - Get download URL
attachmentRoutes.get('/:id/download', async (c) => {
    const userId = c.get('userId');
    const attachmentId = c.req.param('id');

    try {
        // Get attachment with access check
        const attachment = await c.env.DB.prepare(
            `SELECT a.* FROM attachments a
       JOIN tasks t ON a.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE a.id = ? AND (p.owner_id = ? OR pm.user_id = ?)`
        )
            .bind(attachmentId, userId, userId)
            .first<Attachment>();

        if (!attachment) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Attachment not found or access denied' },
                404
            );
        }

        // Get file from R2
        const object = await c.env.STORAGE.get(attachment.r2_key);

        if (!object) {
            return c.json(
                { success: false, error: 'Not Found', message: 'File not found in storage' },
                404
            );
        }

        // Return file
        const headers = new Headers();
        headers.set('Content-Type', attachment.mime_type || 'application/octet-stream');
        headers.set('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
        if (attachment.file_size) {
            headers.set('Content-Length', attachment.file_size.toString());
        }

        return new Response(object.body as ReadableStream, { headers });
    } catch (error) {
        console.error('Download error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to download file' },
            500
        );
    }
});

// DELETE /api/attachments/:id - Delete attachment
attachmentRoutes.delete('/:id', async (c) => {
    const userId = c.get('userId');
    const attachmentId = c.req.param('id');

    try {
        // Get attachment (only uploader can delete)
        const attachment = await c.env.DB.prepare(
            'SELECT * FROM attachments WHERE id = ? AND user_id = ?'
        )
            .bind(attachmentId, userId)
            .first<Attachment>();

        if (!attachment) {
            return c.json(
                { success: false, error: 'Not Found', message: 'Attachment not found or not owner' },
                404
            );
        }

        // Delete from R2
        await c.env.STORAGE.delete(attachment.r2_key);

        // Delete from D1
        await c.env.DB.prepare('DELETE FROM attachments WHERE id = ?')
            .bind(attachmentId)
            .run();

        return c.json({
            success: true,
            message: 'Attachment deleted successfully',
        });
    } catch (error) {
        console.error('Delete attachment error:', error);
        return c.json(
            { success: false, error: 'Server Error', message: 'Failed to delete attachment' },
            500
        );
    }
});
