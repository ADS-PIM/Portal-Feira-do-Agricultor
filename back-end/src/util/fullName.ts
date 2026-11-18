export const FULL_NAME_MESSAGE = 'Informe o nome completo.';

export function isFullName(value: unknown): boolean {
    if (typeof value !== 'string' || value.length > 255) return false;
    const parts = value.trim().split(/\s+/u);
    return parts.length >= 2 && parts.every(part => /^\p{L}[\p{L}\p{M}'’.-]*$/u.test(part));
}
