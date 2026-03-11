export interface SendPasswordResetEmailParams {
    to: string;
    name: string;
    resetLink: string;
    expiresInMinutes: number;
}

export interface SendTwoFactorCodeEmailParams {
    to: string;
    name: string;
    code: string;
    expiresInMinutes: number;
}

export interface EmailService {
    sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void>;
    sendTwoFactorCodeEmail(params: SendTwoFactorCodeEmailParams): Promise<void>;
}

export function buildPasswordResetEmail(params: SendPasswordResetEmailParams) {
    const subject = 'Reset your ERA Kanban password';
    const text = [
        `Hi ${params.name},`,
        '',
        'We received a request to reset your password.',
        `Use this link to set a new password: ${params.resetLink}`,
        `This link will expire in ${params.expiresInMinutes} minutes.`,
        '',
        'If you did not request this, you can safely ignore this email.',
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin:0 0 16px;">Reset your password</h2>
        <p>Hi ${escapeHtml(params.name)},</p>
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${escapeHtml(params.resetLink)}" style="display:inline-block;padding:10px 16px;background:#1392ec;color:#ffffff;text-decoration:none;border-radius:8px;">
            Reset password
          </a>
        </p>
        <p>This link will expire in ${params.expiresInMinutes} minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    return { subject, text, html };
}

export function buildTwoFactorCodeEmail(params: SendTwoFactorCodeEmailParams) {
    const subject = 'Your ERA Kanban verification code';
    const text = [
        `Hi ${params.name},`,
        '',
        `Your ERA Kanban verification code is: ${params.code}`,
        `This code will expire in ${params.expiresInMinutes} minutes.`,
        '',
        'If you did not try to sign in, please change your password immediately.',
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin:0 0 16px;">Verification code</h2>
        <p>Hi ${escapeHtml(params.name)},</p>
        <p>Use this code to complete your sign in:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0;">${escapeHtml(params.code)}</p>
        <p>This code will expire in ${params.expiresInMinutes} minutes.</p>
        <p>If you did not try to sign in, please change your password immediately.</p>
      </div>
    `;

    return { subject, text, html };
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
