import { Hono } from 'hono';
import type { Env, Attachment } from '../types';
import { authMiddleware } from '../middleware/auth';
import { AwsClient } from 'aws4fetch';

const attachments = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
attachments.use('*', authMiddleware);

// Helper to get S3 client for B2
function getS3Client(env: Env) {
    return new AwsClient({
        accessKeyId: env.B2_KEY_ID,
        secretAccessKey: env.B2_APP_KEY,
        region: 'us-west-004', // B2 region from endpoint
        service: 's3',
    });
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

        // Upload to Backblaze B2 using aws4fetch
        const fileBuffer = await file.arrayBuffer();
        const s3Client = getS3Client(env);
        const uploadUrl = `${env.B2_ENDPOINT}/${env.B2_BUCKET_NAME}/${r2Key}`;

        const uploadResponse = await s3Client.fetch(uploadUrl, {
            method: 'PUT',
            body: fileBuffer,
            headers: {
                'Content-Type': file.type || 'application/octet-stream',
                'Content-Length': fileBuffer.byteLength.toString(),
            },
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('B2 upload failed:', uploadResponse.status, errorText);
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
        console.error('Error name:', (error as Error).name);
        console.error('Error message:', (error as Error).message);
        console.error('Error stack:', (error as Error).stack);
        return c.json({ success: false, error: 'Failed to upload file', details: (error as Error).message }, 500);
    }
});

// GET /api/attachments/:id/download - Get download URL for attachment
// GET /api/attachments/:id/download - Get/Proxy attachment content
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

        // Proxy file from B2
        const s3Client = getS3Client(env);
        const fileUrl = `${env.B2_ENDPOINT}/${env.B2_BUCKET_NAME}/${attachment.r2_key}`;

        const fileResponse = await s3Client.fetch(fileUrl, {
            method: 'GET'
        });

        if (!fileResponse.ok) {
            console.error('B2 download failed:', fileResponse.status);
            return c.json({ success: false, error: 'Failed to fetch file from storage' }, 500);
        }

        // Return file directly
        const headers = new Headers(fileResponse.headers);
        headers.set('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
        // Ensure Content-Type is correct
        if (attachment.mime_type) {
            headers.set('Content-Type', attachment.mime_type);
        }

        return new Response(fileResponse.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('Download error:', error);
        return c.json({ success: false, error: 'Failed to download file' }, 500);
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
        const s3Client = getS3Client(env);
        const deleteUrl = `${env.B2_ENDPOINT}/${env.B2_BUCKET_NAME}/${attachment.r2_key}`;
        await s3Client.fetch(deleteUrl, { method: 'DELETE' });

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
