export type RecoveryEmailConfig = { apiKey: string; from: string; frontendUrl: string };

export function readRecoveryEmailConfig(env: NodeJS.ProcessEnv = process.env): RecoveryEmailConfig {
    const apiKey = env.RESEND_API_KEY?.trim();
    const from = env.EMAIL_FROM?.trim() || 'Brotando Feiras <onboarding@resend.dev>';
    // A dedicated canonical URL avoids trusting Host/Origin or a comma-separated CORS list.
    const frontendUrl = env.PASSWORD_RESET_FRONTEND_URL?.trim();
    if (!apiKey || !frontendUrl) throw new Error('PASSWORD_RECOVERY_NOT_CONFIGURED');
    const url = new URL(frontendUrl);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
        || url.username || url.password || url.search || url.hash) {
        throw new Error('PASSWORD_RECOVERY_INVALID_URL');
    }
    return { apiKey, from, frontendUrl: url.href };
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export function passwordResetEmail(resetUrl: string) {
    const link = escapeHtml(resetUrl);
    return {
        subject: 'Redefina sua senha | Brotando Feiras',
        text: `Brotando Feiras\n\nRecebemos uma solicitação para redefinir a senha da sua conta.\n\nAcesse: ${resetUrl}\n\nEste link é válido por 15 minutos e pode ser usado apenas uma vez. Se você não solicitou esta alteração, ignore este e-mail. Sua senha continuará a mesma.`,
        html: `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#edf6ee;font-family:Arial,Helvetica,sans-serif;color:#24352b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e1e9df;border-radius:16px">
<tr><td style="padding:32px 24px">
<p style="margin:0 0 28px;color:#147437;font-size:22px;font-weight:bold">Brotando Feiras</p>
<h1 style="margin:0 0 16px;font-size:24px">Redefina sua senha</h1>
<p style="font-size:16px;line-height:1.6">Recebemos uma solicitação para redefinir a senha da sua conta.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td bgcolor="#147437" style="border-radius:8px;text-align:center">
<a href="${link}" style="display:inline-block;padding:16px 24px;color:#fff;text-decoration:none;font-weight:bold;font-size:16px">Redefinir minha senha</a>
</td></tr></table>
<p style="font-size:14px;line-height:1.6">Este link é válido por <strong>15 minutos</strong> e pode ser usado apenas uma vez.</p>
<p style="font-size:14px;line-height:1.6;color:#5b665e">Se você não solicitou esta alteração, ignore este e-mail. Sua senha continuará a mesma.</p>
<hr style="border:0;border-top:1px solid #e1e9df;margin:24px 0">
<p style="font-size:12px;line-height:1.6;color:#5b665e">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
<p style="font-size:12px;line-height:1.6;word-break:break-all"><a href="${link}" style="color:#147437">${link}</a></p>
</td></tr></table></td></tr></table></body></html>`,
    };
}

export async function sendPasswordResetEmail(config: RecoveryEmailConfig, email: string, resetUrl: string): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: config.from, to: [email], ...passwordResetEmail(resetUrl) }),
        signal: AbortSignal.timeout(10_000),
    });
    // Provider bodies may contain personal data. Never log them or the request/link.
    if (!response.ok) throw new Error(`RESEND_SEND_FAILED_${response.status}`);
    await response.arrayBuffer();
}
