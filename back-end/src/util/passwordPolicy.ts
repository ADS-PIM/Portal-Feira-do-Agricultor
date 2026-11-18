export const PASSWORD_REQUIREMENTS_MESSAGE = 'Use no mínimo 6 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial.';

export function isValidPassword(value: unknown): boolean {
    return typeof value === 'string' && Array.from(value).length >= 6
        && /\p{Lu}/u.test(value) && /\p{Ll}/u.test(value) && /[0-9]/.test(value)
        && /[^\p{L}\p{N}\s]/u.test(value) && Buffer.byteLength(value, 'utf8') <= 72;
}
