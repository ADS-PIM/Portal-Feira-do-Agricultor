import { createHash, randomBytes } from 'node:crypto';
import { PasswordResetDAO } from '../dao/passwordReset.dao';
import { PasswordCrypto } from './passwordCrypto';
import { readRecoveryEmailConfig, sendPasswordResetEmail } from './passwordResetEmail';

export const hashResetToken = (token: string) => createHash('sha256').update(token).digest('hex');

export class PasswordResetService {
    constructor(
        private dao: Pick<PasswordResetDAO, 'issue' | 'consume' | 'discard'> = new PasswordResetDAO(),
        private sendEmail = sendPasswordResetEmail,
        private readConfig = readRecoveryEmailConfig,
    ) {}

    async request(email: string): Promise<void> {
        const config = this.readConfig();
        const token = randomBytes(32).toString('hex');
        const tokenHash = hashResetToken(token);
        const admin = await this.dao.issue(email.trim().toLowerCase(), tokenHash);
        if (!admin) return;
        const link = new URL(config.frontendUrl);
        link.hash = `/admin/redefinir-senha?token=${token}`;
        try {
            await this.sendEmail(config, admin.email, link.href);
        } catch {
            // Same public response for unknown accounts and provider rejection (including sandbox recipients).
            console.error('Password recovery email could not be sent. Check Resend delivery logs and configuration.');
            await this.dao.discard(tokenHash);
        }
    }

    async reset(token: string, password: string): Promise<boolean> {
        const passwordHash = await PasswordCrypto.hashPassword(password);
        return this.dao.consume(hashResetToken(token), passwordHash);
    }
}
