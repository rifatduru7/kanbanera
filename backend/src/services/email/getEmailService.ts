import type { Env } from '../../types';
import type { EmailService } from './EmailService';
import { LogEmailService } from './LogEmailService';
import { ResendEmailService } from './ResendEmailService';

export async function getEmailService(env: Env): Promise<EmailService> {
    if (env.RESEND_API_KEY && env.EMAIL_FROM) {
        return new ResendEmailService(env);
    }

    try {
        // Try fetch SMTP settings from DB
        const { results } = await env.DB.prepare('SELECT key, value FROM system_settings WHERE key LIKE "smtp_%"').all();
        const settings = (results || []).reduce<Record<string, string>>((acc, curr) => {
            const setting = curr as { key: string; value: string };
            acc[setting.key] = setting.value;
            return acc;
        }, {});

        if (settings.smtp_host && settings.smtp_port && settings.smtp_user && settings.smtp_pass && settings.smtp_from) {
            console.warn(
                'SMTP settings are configured but SMTP transport is not enabled in this runtime. Falling back to log email service. Configure RESEND_API_KEY + EMAIL_FROM for production email delivery.'
            );
        }
    } catch (err) {
        console.error('Failed to fetch SMTP settings from DB:', err);
    }

    return new LogEmailService(env);
}
