export class ApiRequestError extends Error {
    constructor(status: number, endpoint: string) {
        super(getApiErrorMessage(status, endpoint))
        this.name = 'ApiRequestError'
    }
}

function getApiErrorMessage(status: number, endpoint: string): string {
    if (status === 401 && /^admin\/login(?:\/|$|\?)/.test(endpoint)) {
        return 'Não foi possível entrar. Confira seu e-mail e sua senha.'
    }

    if (status === 401) return 'Sua sessão expirou. Entre novamente.'
    if (status === 403) return 'Você não tem autorização para realizar esta ação.'
    if (status === 404) return 'O conteúdo solicitado não está disponível.'
    if (status === 429) return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
    if (status >= 500) return 'O serviço está temporariamente indisponível. Tente novamente mais tarde.'

    return 'Não foi possível concluir a solicitação. Verifique os dados e tente novamente.'
}

export function getUserFacingError(error: unknown, fallback: string): string {
    return error instanceof ApiRequestError ? error.message : fallback
}
