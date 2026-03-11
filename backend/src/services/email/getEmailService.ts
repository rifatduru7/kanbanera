import type { Env } from '../../types';
import type { EmailService } from './EmailService';
import { LogEmailService } from './LogEmailService';
import { ResendEmailService } from './ResendEmailService';
import { SMTPEmailService, type SMTPSettings } from './SMTPEmailService';

export type EmailProvider = 'smtp' | 'resend' | 'log';

export interface EmailProviderStatus {
    configuredProvider: 'smtp' | 'resend';
    activeProvider: EmailProvider;
    reason?: string;
    smtpSettings?: SMTPSettings;
}

interface EmailSettingRow {
    key: string;
    value: string;
}

function resolveConfiguredProvider(value?: string): 'smtp' | 'resend' {
    return value === 'resend' ? 'resend' : 'smtp';
}

function hasSmtpSettings(settings: Record<string, string>): boolean {
    return Boolean(
        settings.smtp_host &&
        settings.smtp_port &&
        settings.smtp_user &&
        settings.smtp_pass &&
        settings.smtp_from
    );
}

async function readEmailSettings(env: Env): Promise<Record<string, string>> {
    const { results } = await env.DB.prepare(
        'SELECT key, value FROM system_settings WHERE key = "email_provider" OR key LIKE "smtp_%"'
    ).all<EmailSettingRow>();

    return (results || []).reduce<Record<string, string>>((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});
}

export async function getEmailProviderStatus(env: Env): Promise<EmailProviderStatus> {
    try {
        const settings = await readEmailSettings(env);
        const configuredProvider = resolveConfiguredProvider(settings.email_provider);

        if (configuredProvider === 'resend') {
            if (env.RESEND_API_KEY && env.EMAIL_FROM) {
                return { configuredProvider, activeProvider: 'resend' };
            }
            return {
                configuredProvider,
                activeProvider: 'log',
                reason: 'email_provider is set to resend but RESEND_API_KEY or EMAIL_FROM is missing.',
            };
        }

        if (hasSmtpSettings(settings)) {
            return {
                configuredProvider,
                activeProvider: 'smtp',
                smtpSettings: {
                    host: settings.smtp_host,
                    port: settings.smtp_port,
                    user: settings.smtp_user,
                    pass: settings.smtp_pass,
                    from: settings.smtp_from,
                },
            };
        }

        return {
            configuredProvider,
            activeProvider: 'log',
            reason: 'email_provider is set to smtp but SMTP settings are incomplete.',
        };
    } catch (err) {
        console.error('Failed to resolve email provider status:', err);
        return {
            configuredProvider: 'smtp',
            activeProvider: 'log',
            reason: 'Failed to load email settings from DB.',
        };
    }
}

export async function getEmailService(env: Env): Promise<EmailService> {
    const status = await getEmailProviderStatus(env);

    if (status.activeProvider === 'resend') {
        return new ResendEmailService(env);
    }

    if (status.activeProvider === 'smtp' && status.smtpSettings) {
        return new SMTPEmailService(status.smtpSettings);
    }

    if (status.reason) {
        console.warn(status.reason);
    }
    return new LogEmailService(env);
}
