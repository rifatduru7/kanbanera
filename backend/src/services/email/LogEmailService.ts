import type { Env } from '../../types';
import {
    buildPasswordResetEmail,
    buildTwoFactorCodeEmail,
    type EmailService,
    type SendPasswordResetEmailParams,
    type SendTwoFactorCodeEmailParams,
} from './EmailService';

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

    async sendTwoFactorCodeEmail(params: SendTwoFactorCodeEmailParams): Promise<void> {
        const payload = buildTwoFactorCodeEmail(params);
        console.log('[LogEmailService] Two-factor code email', {
            from: this.env.EMAIL_FROM || 'no-reply@example.local',
            to: params.to,
            subject: payload.subject,
            text: payload.text,
            code: params.code,
        });
    }
}
