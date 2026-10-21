import type { Request, Response } from 'express';
import { isEmail } from 'class-validator';
import { PasswordResetService } from '../service/passwordReset.service';

export const recoveryMessage = 'Se este e-mail estiver associado a uma conta ativa, você receberá um link para redefinir sua senha. Confira também a pasta de spam.';

export class PasswordResetController {
    constructor(private service = new PasswordResetService()) {}

    async request(req: Request, res: Response) {
        res.setHeader('Cache-Control', 'no-store');
        const email = req.body?.email;
        if (typeof email !== 'string' || email.length > 320 || !isEmail(email.trim())) {
            return res.status(400).json({ code: 'INVALID_EMAIL', error: 'Informe um e-mail válido.' });
        }
        try {
            await this.service.request(email);
            return res.status(202).json({ message: recoveryMessage });
        } catch {
            console.error('Password recovery unavailable. Check database and email configuration.');
            return res.status(503).json({ error: 'Não foi possível solicitar a recuperação. Tente novamente mais tarde.' });
        }
    }

    async reset(req: Request, res: Response) {
        res.setHeader('Cache-Control', 'no-store');
        const { token, password } = req.body ?? {};
        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
            return this.invalidLink(res);
        }
        // bcrypt accepts at most 72 bytes; reject truncation, including multi-byte passwords.
        if (typeof password !== 'string' || password.length < 8 || !password.trim() || Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({ code: 'INVALID_PASSWORD', error: 'Use pelo menos 8 caracteres e no máximo 72 bytes na senha.' });
        }
        try {
            if (!await this.service.reset(token, password)) return this.invalidLink(res);
            const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
            res.clearCookie('refreshToken', { httpOnly: true, secure, sameSite: secure ? 'none' : 'lax', path: '/admin' });
            return res.status(200).json({ message: 'Senha alterada com sucesso. Entre com sua nova senha.' });
        } catch {
            console.error('Password reset failed. Check database availability.');
            return res.status(503).json({ error: 'Não foi possível alterar a senha. Tente novamente mais tarde.' });
        }
    }

    private invalidLink(res: Response) {
        return res.status(400).json({ code: 'INVALID_RESET_TOKEN', error: 'Este link é inválido ou expirou. Solicite um novo link.' });
    }
}
