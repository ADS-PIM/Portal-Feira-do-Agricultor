export const PASSWORD_REQUIREMENTS_MESSAGE = 'Siga os requisitos de senha.'

export const passwordRequirements = [
    { label: 'No mínimo 6 caracteres', check: (value: string) => Array.from(value).length >= 6 },
    { label: 'Uma letra maiúscula', check: (value: string) => /\p{Lu}/u.test(value) },
    { label: 'Uma letra minúscula', check: (value: string) => /\p{Ll}/u.test(value) },
    { label: 'Um número', check: (value: string) => /[0-9]/.test(value) },
    { label: 'Um caractere especial (ex.: !, @, #)', check: (value: string) => /[^\p{L}\p{N}\s]/u.test(value) },
]

export function getPasswordError(password: string): string | null {
    if (!passwordRequirements.every(rule => rule.check(password))) return PASSWORD_REQUIREMENTS_MESSAGE
    if (new TextEncoder().encode(password).length > 72) return 'A senha está muito longa. Reduza a quantidade de caracteres ou símbolos.'
    return null
}
