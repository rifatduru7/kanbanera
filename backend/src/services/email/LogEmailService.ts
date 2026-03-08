import type { Env } from '../../types';
import { buildPasswordResetEmail, type EmailService, type SendPasswordResetEmailParams } from './EmailService';

export class LogEmailService implements EmailService {
    constructor(private readonly env: Env) {}

    async sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void> {
        const payload = buildPasswordResetEmail(params);
        console.log('[LogEmailService] Password reset email', {
            from: this.env.EMAIL_FROM || 'no-reply@example.local',
            to: params.to,
            subject: payload.subject,
            text: payload.text,
            resetLink: params.resetLink,
        });
    }
}
