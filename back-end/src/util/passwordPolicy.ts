export const PASSWORD_REQUIREMENTS_MESSAGE = 'Siga os requisitos de senha.';

export function isValidPassword(value: unknown): boolean {
    return typeof value === 'string' && Array.from(value).length >= 6
        && /\p{Lu}/u.test(value) && /\p{Ll}/u.test(value) && /[0-9]/.test(value)
        && /[^\p{L}\p{N}\s]/u.test(value) && Buffer.byteLength(value, 'utf8') <= 72;
}
