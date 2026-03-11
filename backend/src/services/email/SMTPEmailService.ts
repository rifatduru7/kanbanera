import { connect } from 'cloudflare:sockets';
import {
    buildPasswordResetEmail,
    buildTwoFactorCodeEmail,
    type EmailService,
    type SendPasswordResetEmailParams,
    type SendTwoFactorCodeEmailParams,
} from './EmailService';

export interface SMTPSettings {
    host: string;
    port: string;
    user: string;
    pass: string;
    from: string;
}

interface OutgoingEmail {
    to: string;
    subject: string;
    text: string;
    html: string;
}

interface SmtpResponse {
    code: number;
    lines: string[];
    message: string;
}

const SMTP_READ_TIMEOUT_MS = 10_000;
const SMTP_WRITE_TIMEOUT_MS = 10_000;
const SMTP_COMMAND_TIMEOUT_MS = 15_000;
const SMTP_TRANSACTION_TIMEOUT_MS = 20_000;

class SmtpCommandError extends Error {
    constructor(
        message: string,
        public readonly response: SmtpResponse
    ) {
        super(message);
    }
}

class SmtpConnection {
    private readonly decoder = new TextDecoder();
    private readonly encoder = new TextEncoder();
    private reader: ReadableStreamDefaultReader;
    private writer: WritableStreamDefaultWriter;
    private buffer = '';

    constructor(private socket: Socket) {
        this.reader = socket.readable.getReader();
        this.writer = socket.writable.getWriter();
    }

    static async open(host: string, port: number): Promise<SmtpConnection> {
        const secureTransport = port === 465 ? 'on' : 'starttls';
        const socket = connect(
            { hostname: host, port },
            { secureTransport, allowHalfOpen: false }
        );
        return new SmtpConnection(socket);
    }

    async startTls(expectedServerHostname: string): Promise<void> {
        const upgraded = this.socket.startTls({ expectedServerHostname });
        this.socket = upgraded;
        this.reader = upgraded.readable.getReader();
        this.writer = upgraded.writable.getWriter();
        this.buffer = '';
    }

    async close(): Promise<void> {
        try {
            await this.sendCommand('QUIT', [221], { throwOnUnexpected: false });
        } catch {
            // Ignore graceful close failures
        }
        try {
            await this.socket.close();
        } catch {
            // Ignore close failures
        }
    }

    async readResponse(): Promise<SmtpResponse> {
        const lines: string[] = [];
        let code: number | null = null;

        while (true) {
            const line = await this.readLine();
            lines.push(line);

            const parsed = line.match(/^(\d{3})([ -])(.*)$/);
            if (!parsed) {
                continue;
            }

            const parsedCode = Number(parsed[1]);
            const separator = parsed[2];
            const message = parsed[3];

            if (code === null) {
                code = parsedCode;
            }

            if (separator === ' ') {
                return {
                    code: parsedCode,
                    lines,
                    message,
                };
            }
        }
    }

    async sendCommand(
        command: string,
        expectedCodes: number[],
        options?: { throwOnUnexpected?: boolean }
    ): Promise<SmtpResponse> {
        await this.writeRaw(`${command}\r\n`);
        const response = await withTimeout(
            this.readResponse(),
            SMTP_COMMAND_TIMEOUT_MS,
            `SMTP response timed out for command "${command}"`
        );

        if (expectedCodes.includes(response.code)) {
            return response;
        }

        if (options?.throwOnUnexpected === false) {
            return response;
        }

        throw new SmtpCommandError(
            `SMTP command failed (${response.code}) for "${command}"`,
            response
        );
    }

    async writeRaw(value: string): Promise<void> {
        await withTimeout(
            this.writer.write(this.encoder.encode(value)),
            SMTP_WRITE_TIMEOUT_MS,
            'SMTP write timed out'
        );
    }

    private async readLine(): Promise<string> {
        while (true) {
            const newlineIndex = this.buffer.indexOf('\n');
            if (newlineIndex >= 0) {
                const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, '');
                this.buffer = this.buffer.slice(newlineIndex + 1);
                return line;
            }

            const { value, done } = await withTimeout(
                this.reader.read(),
                SMTP_READ_TIMEOUT_MS,
                'SMTP read timed out'
            );
            if (done) {
                if (this.buffer.length) {
                    const line = this.buffer.replace(/\r$/, '');
                    this.buffer = '';
                    return line;
                }
                throw new Error('SMTP socket closed unexpectedly while reading response');
            }

            this.buffer += this.decoder.decode(value, { stream: true });
        }
    }
}

function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
    onTimeout?: () => void
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(() => {
            if (onTimeout) {
                try {
                    onTimeout();
                } catch {
                    // Ignore timeout hook failures
                }
            }
            reject(new Error(timeoutMessage));
        }, timeoutMs);

        promise
            .then((value) => {
                clearTimeout(timeout);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timeout);
                reject(error);
            });
    });
}

function toBase64(value: string): string {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

function normalizeBody(value: string): string {
    const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return normalized
        .split('\n')
        .map((line) => (line.startsWith('.') ? `.${line}` : line))
        .join('\r\n');
}

function normalizeSmtpPassword(host: string, password: string): string {
    const trimmed = password.trim();

    // Gmail App Passwords are shown in 4-char groups with spaces.
    // Normalize to the underlying 16-char token automatically.
    if (host.toLowerCase().includes('gmail.com')) {
        return trimmed.replace(/\s+/g, '');
    }

    return trimmed;
}

function buildMimeMessage(email: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
}): string {
    const boundary = `----=_EraKanban_${crypto.randomUUID().replace(/-/g, '')}`;
    const text = normalizeBody(email.text);
    const html = normalizeBody(email.html);

    return [
        `From: ${email.from}`,
        `To: ${email.to}`,
        `Subject: ${email.subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        text,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        html,
        '',
        `--${boundary}--`,
        '',
        '.',
    ].join('\r\n');
}

async function sendSmtpEmail(settings: SMTPSettings, email: OutgoingEmail): Promise<void> {
    const host = settings.host.trim();
    const port = Number(settings.port);
    const user = settings.user.trim();
    const pass = normalizeSmtpPassword(host, settings.pass);
    const from = settings.from.trim();
    const to = email.to.trim();

    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('Invalid SMTP host or port');
    }
    if (!user || !pass || !from || !to) {
        throw new Error('SMTP credentials or recipient are missing');
    }

    const isGmailHost = host.toLowerCase().includes('gmail.com');
    const portsToTry = isGmailHost && port === 587 ? [587, 465] : [port];
    let lastError: unknown = null;

    for (const candidatePort of portsToTry) {
        try {
            await sendSmtpEmailWithPort({
                host,
                port: candidatePort,
                user,
                pass,
                from,
                to,
                subject: email.subject,
                text: email.text,
                html: email.html,
            });
            return;
        } catch (error) {
            lastError = error;
            if (candidatePort !== portsToTry[portsToTry.length - 1]) {
                console.warn(`SMTP send attempt failed on port ${candidatePort}, retrying fallback port`, error);
            }
        }
    }

    if (lastError instanceof Error) {
        throw lastError;
    }

    throw new Error('SMTP send failed for unknown reason');
}

async function sendSmtpEmailWithPort(params: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
}): Promise<void> {
    const {
        host,
        port,
        user,
        pass,
        from,
        to,
        subject,
        text,
        html,
    } = params;

    const clientName = 'era-kanban.local';
    const connection = await SmtpConnection.open(host, port);

    try {
        await withTimeout(
            (async () => {
                const greeting = await connection.readResponse(); // 220
                if (greeting.code !== 220) {
                    throw new SmtpCommandError('SMTP server did not accept connection', greeting);
                }

                await connection.sendCommand(`EHLO ${clientName}`, [250]);

                if (port !== 465) {
                    await connection.sendCommand('STARTTLS', [220]);
                    await connection.startTls(host);
                    await connection.sendCommand(`EHLO ${clientName}`, [250]);
                }

                await connection.sendCommand('AUTH LOGIN', [334]);
                await connection.sendCommand(toBase64(user), [334]);
                await connection.sendCommand(toBase64(pass), [235]);

                await connection.sendCommand(`MAIL FROM:<${from}>`, [250]);
                await connection.sendCommand(`RCPT TO:<${to}>`, [250, 251]);
                await connection.sendCommand('DATA', [354]);

                const mime = buildMimeMessage({
                    from,
                    to,
                    subject,
                    text,
                    html,
                });
                await connection.writeRaw(`${mime}\r\n`);
                const dataAccepted = await connection.readResponse(); // 250
                if (dataAccepted.code !== 250) {
                    throw new SmtpCommandError('SMTP DATA was not accepted', dataAccepted);
                }
            })(),
            SMTP_TRANSACTION_TIMEOUT_MS,
            'SMTP transaction timed out',
            () => {
                void connection.close();
            }
        );
    } catch (error) {
        if (error instanceof SmtpCommandError) {
            const detail = error.response.lines.join(' | ');
            throw new Error(`${error.message}: ${detail}`, { cause: error });
        }
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`SMTP send failed: ${reason}`, { cause: error });
    } finally {
        await connection.close();
    }
}

export class SMTPEmailService implements EmailService {
    constructor(private readonly settings: SMTPSettings) {}

    async sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void> {
        const payload = buildPasswordResetEmail(params);
        await sendSmtpEmail(this.settings, {
            to: params.to,
            subject: payload.subject,
            text: payload.text,
            html: payload.html,
        });
    }

    async sendTwoFactorCodeEmail(params: SendTwoFactorCodeEmailParams): Promise<void> {
        const payload = buildTwoFactorCodeEmail(params);
        await sendSmtpEmail(this.settings, {
            to: params.to,
            subject: payload.subject,
            text: payload.text,
            html: payload.html,
        });
    }
}
