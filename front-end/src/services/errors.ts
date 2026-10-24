import { businessDescriptionTooLong } from '../utils/businessDescription'

export class ApiRequestError extends Error {
    readonly status: number
    readonly code?: string
    constructor(status: number, endpoint: string, code?: string) {
        super(status === 400 && /^business-info(?:\/|$|\?)/.test(endpoint) && code === 'BUSINESS_DESCRIPTION_TOO_LONG'
            ? businessDescriptionTooLong
            : getApiErrorMessage(status, endpoint, code))
        this.name = 'ApiRequestError'
        this.status = status
        this.code = code
    }
}

function getApiErrorMessage(status: number, endpoint: string, code?: string): string {
    if (/^admin\/[^/?]+\/?(?:\?|$)/.test(endpoint)) {
        if (status === 404 && code === 'ADMIN_NOT_FOUND') return 'Administrador não encontrado. Atualize a lista e tente novamente.'
        if (status === 403 && code === 'SUPER_ADMIN_DELETE_FORBIDDEN') return 'Não é possível excluir o administrador principal.'
        if (status === 409 && code === 'ADMIN_HAS_EVENTS') return 'Este administrador possui eventos vinculados. Desative o acesso para manter o histórico.'
    }
    if (status === 400 && /^admin\/(?:forgot-password|reset-password)(?:\/|$|\?)/.test(endpoint)) {
        if (code === 'INVALID_EMAIL') return 'Informe um e-mail válido.'
        if (code === 'INVALID_PASSWORD') return 'Use pelo menos 8 caracteres. Se a senha for muito longa, reduza a quantidade de caracteres ou símbolos.'
        if (code === 'INVALID_RESET_TOKEN') return 'Este link é inválido ou expirou. Solicite um novo link para redefinir sua senha.'
    }
    if (status === 401 && /^admin\/login(?:\/|$|\?)/.test(endpoint)) {
        return 'Não foi possível entrar. Confira seu e-mail e sua senha.'
    }

    if (status === 401) return 'Sua sessão expirou. Entre novamente.'
    if (status === 403) return 'Você não tem autorização para realizar esta ação.'
    if (status === 409 && /^admin\//.test(endpoint)) return 'Este e-mail já está cadastrado em outra conta.'
    if (status === 404) return 'O conteúdo solicitado não está disponível.'
    if (status === 429) return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
    if (status >= 500) return 'O serviço está temporariamente indisponível. Tente novamente mais tarde.'

    return 'Não foi possível concluir a solicitação. Verifique os dados e tente novamente.'
}

export function getUserFacingError(error: unknown, fallback: string): string {
    return error instanceof ApiRequestError ? error.message : fallback
}
