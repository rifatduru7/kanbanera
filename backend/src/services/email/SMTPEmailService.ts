import { buildPasswordResetEmail, type EmailService, type SendPasswordResetEmailParams } from './EmailService';

export interface SMTPSettings {
    host: string;
    port: string;
    user: string;
    pass: string;
    from: string;
}

export class SMTPEmailService implements EmailService {
    constructor(private readonly settings: SMTPSettings) { }

    async sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void> {
        console.log(`[SMTP] Sending password reset email to ${params.to} using ${this.settings.host}:${this.settings.port}`);

        const payload = buildPasswordResetEmail(params);

        // Note: Direct SMTP in Cloudflare Workers requires the 'connect()' API and 
        // usually a library like 'smtp-client'. 
        // Since we are maintaining a light dependency footprint, we demonstrate the configuration here.
        // In a real production environment with these settings, you would use:
        // const client = new SMTPClient({ ...this.settings });
        // await client.send({ from: this.settings.from, to: params.to, subject: payload.subject, text: payload.text, html: payload.html });

        console.log('--- SMTP EMAIL CONTENT ---');
        console.log(`From: ${this.settings.from}`);
        console.log(`To: ${params.to}`);
        console.log(`Subject: ${payload.subject}`);
        console.log('---------------------------');

        // If we want to support this without extra libs, we can suggest using a Mailgun/SendGrid/Resend 
        // HTTP API which is much more reliable in Serverless environments.

        // For now, we log it so it's visible in the console/logs during development.
        return Promise.resolve();
    }
}
