import type { Env } from '../../types';
import {
    buildPasswordResetEmail,
    buildTwoFactorCodeEmail,
    type EmailService,
    type SendPasswordResetEmailParams,
    type SendTwoFactorCodeEmailParams,
} from './EmailService';

export class ResendEmailService implements EmailService {
    constructor(private readonly env: Env) {}

    async sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void> {
        if (!this.env.RESEND_API_KEY || !this.env.EMAIL_FROM) {
            throw new Error('RESEND_API_KEY and EMAIL_FROM are required for ResendEmailService');
        }

        const payload = buildPasswordResetEmail(params);
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: this.env.EMAIL_FROM,
                to: [params.to],
                subject: payload.subject,
                html: payload.html,
                text: payload.text,
            }),
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Resend send failed (${response.status}): ${body}`);
        }
    }

    async sendTwoFactorCodeEmail(params: SendTwoFactorCodeEmailParams): Promise<void> {
        if (!this.env.RESEND_API_KEY || !this.env.EMAIL_FROM) {
            throw new Error('RESEND_API_KEY and EMAIL_FROM are required for ResendEmailService');
        }

        const payload = buildTwoFactorCodeEmail(params);
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: this.env.EMAIL_FROM,
                to: [params.to],
                subject: payload.subject,
                html: payload.html,
                text: payload.text,
            }),
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Resend send failed (${response.status}): ${body}`);
        }
    }
}
