import { Hono } from 'hono';
import type { Env, Attachment } from '../types';
import { authMiddleware } from '../middleware/auth';

const attachments = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
attachments.use('*', authMiddleware);

// Helper to generate request for Backblaze B2
async function signRequest(
    _method: string,
    path: string,
    env: Env,
    contentType?: string,
    contentLength?: number
): Promise<{ url: string; headers: Record<string, string> }> {
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');

    const url = `${env.B2_ENDPOINT}/${env.B2_BUCKET_NAME}${path}`;

    // For simplicity, use basic auth with B2 (works for most operations)
    const authString = btoa(`${env.B2_KEY_ID}:${env.B2_APP_KEY}`);

    const headers: Record<string, string> = {
        'Authorization': `Basic ${authString}`,
        'x-amz-date': date,
    };

    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    if (contentLength !== undefined) {
        headers['Content-Length'] = contentLength.toString();
    }

    return { url, headers };
}

// GET /api/attachments/task/:taskId - Get all attachments for a task
attachments.get('/task/:taskId', async (c) => {
    const { taskId } = c.req.param();
    const env = c.env;

    try {
        const attachmentsList = await env.DB.prepare(`
            SELECT a.*, u.full_name as uploader_name
            FROM attachments a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.task_id = ?
            ORDER BY a.created_at DESC
        `).bind(taskId).all<Attachment & { uploader_name: string }>();

        // Generate download URLs
        const attachmentsWithUrls = attachmentsList.results.map((att) => ({
            ...att,
            download_url: `${env.B2_ENDPOINT}/${env.B2_BUCKET_NAME}/${att.r2_key}`,
        }));

        return c.json({
            success: true,
            data: { attachments: attachmentsWithUrls },
        });
    } catch (error) {
        console.error('Get attachments error:', error);
        return c.json({ success: false, error: 'Failed to fetch attachments' }, 500);
    }
});

// POST /api/attachments/task/:taskId - Upload a new attachment
attachments.post('/task/:taskId', async (c) => {
    const { taskId } = c.req.param();
    const env = c.env;
    const userId = c.get('userId');

    try {
        // Check if task exists
        const task = await env.DB.prepare(
            'SELECT id, project_id FROM tasks WHERE id = ?'
        ).bind(taskId).first();

        if (!task) {
            return c.json({ success: false, error: 'Task not found' }, 404);
        }

        // Parse multipart form data
        const formData = await c.req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return c.json({ success: false, error: 'No file provided' }, 400);
        }

        // Generate unique key for the file
        const fileId = crypto.randomUUID();
        const fileExt = file.name.split('.').pop() || '';
        const r2Key = `attachments/${taskId}/${fileId}.${fileExt}`;

        // Upload to Backblaze B2
        const fileBuffer = await file.arrayBuffer();
        const { url, headers } = await signRequest(
            'PUT',
            `/${r2Key}`,
            env,
            file.type,
            fileBuffer.byteLength
        );

        const uploadResponse = await fetch(url, {
            method: 'PUT',
            headers,
            body: fileBuffer,
        });

        if (!uploadResponse.ok) {
            console.error('B2 upload failed:', await uploadResponse.text());
            return c.json({ success: false, error: 'Failed to upload file to storage' }, 500);
        }

        // Save to database
        const attachmentId = crypto.randomUUID();
        await env.DB.prepare(`
            INSERT INTO attachments (id, task_id, user_id, file_name, r2_key, file_size, mime_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            attachmentId,
            taskId,
            userId,
            file.name,
            r2Key,
            file.size,
            file.type
        ).run();

        // Get the created attachment
        const attachment = await env.DB.prepare(
            'SELECT * FROM attachments WHERE id = ?'
        ).bind(attachmentId).first<Attachment>();

        // Log activity
        await env.DB.prepare(`
            INSERT INTO activity_log (id, project_id, task_id, user_id, action, details)
            VALUES (?, ?, ?, ?, 'attachment_added', ?)
        `).bind(
            crypto.randomUUID(),
            task.project_id as string,
            taskId,
            userId,
            JSON.stringify({ file_name: file.name })
        ).run();

        return c.json({
            success: true,
            data: {
                attachment: {
                    ...attachment,
                    download_url: `${env.B2_ENDPOINT}/${env.B2_BUCKET_NAME}/${r2Key}`,
                },
            },
            message: 'File uploaded successfully',
        }, 201);
    } catch (error) {
        console.error('Upload error:', error);
        return c.json({ success: false, error: 'Failed to upload file' }, 500);
    }
});

// GET /api/attachments/:id/download - Get download URL for attachment
attachments.get('/:id/download', async (c) => {
    const { id } = c.req.param();
    const env = c.env;

    try {
        const attachment = await env.DB.prepare(
            'SELECT * FROM attachments WHERE id = ?'
        ).bind(id).first<Attachment>();

        if (!attachment) {
            return c.json({ success: false, error: 'Attachment not found' }, 404);
        }

        // For public bucket, return direct URL
        // For private bucket, you would generate a signed URL here
        const downloadUrl = `${env.B2_ENDPOINT}/${env.B2_BUCKET_NAME}/${attachment.r2_key}`;

        return c.json({
            success: true,
            data: { download_url: downloadUrl },
        });
    } catch (error) {
        console.error('Download URL error:', error);
        return c.json({ success: false, error: 'Failed to generate download URL' }, 500);
    }
});

// DELETE /api/attachments/:id - Delete an attachment
attachments.delete('/:id', async (c) => {
    const { id } = c.req.param();
    const env = c.env;
    const userId = c.get('userId');

    try {
        const attachment = await env.DB.prepare(
            'SELECT * FROM attachments WHERE id = ?'
        ).bind(id).first<Attachment>();

        if (!attachment) {
            return c.json({ success: false, error: 'Attachment not found' }, 404);
        }

        // Check permission (owner or admin)
        if (attachment.user_id !== userId) {
            return c.json({ success: false, error: 'Not authorized to delete this attachment' }, 403);
        }

        // Delete from B2
        const { url, headers } = await signRequest('DELETE', `/${attachment.r2_key}`, env);
        await fetch(url, { method: 'DELETE', headers });

        // Delete from database
        await env.DB.prepare('DELETE FROM attachments WHERE id = ?').bind(id).run();

        return c.json({
            success: true,
            message: 'Attachment deleted successfully',
        });
    } catch (error) {
        console.error('Delete attachment error:', error);
        return c.json({ success: false, error: 'Failed to delete attachment' }, 500);
    }
});

export default attachments;
