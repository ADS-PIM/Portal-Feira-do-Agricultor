import { businessDescriptionTooLong } from '../utils/businessDescription'
import { BUSINESS_EMAIL_ERROR, BUSINESS_WHATSAPP_ERROR } from '../utils/businessContacts'
import { INSTAGRAM_ERROR_MESSAGES } from '../utils/instagramAccount'
import { CONTACT_VALIDATION_MESSAGES } from '../utils/contactValidation'
import { EVENT_IMAGE_MAX_MB, EVENT_IMAGE_TOO_LARGE } from '../utils/eventImageUpload'

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
    const adminAccountEndpoint = /^admin\/[^/?]+\/?(?:\?|$)/.test(endpoint)
        && !/^admin\/(?:login|refresh|logout|forgot-password|reset-password)(?:\/|$|\?)/.test(endpoint)
    if (adminAccountEndpoint) {
        if (status === 409 && code === 'ADMIN_EMAIL_IN_USE') return 'Este e-mail já está cadastrado em outra conta.'
        if (status === 400) {
            if (code === 'ADMIN_NAME_INVALID') return 'Informe um nome válido com até 255 caracteres.'
            if (code === 'ADMIN_EMAIL_INVALID') return 'Informe um e-mail válido.'
            if (code === 'ADMIN_ROLE_INVALID') return 'Selecione um perfil de acesso válido.'
            if (code === 'ADMIN_INVALID_DATA') return 'Revise os dados do administrador e tente novamente.'
        }
    }
    if (/^event(?:\/|$|\?)/.test(endpoint)) {
        if (status === 400 && code === 'EVENT_INVALID_DATA') return 'Revise os dados do evento: título e endereço de até 255 caracteres, descrição de até 1000, data e horários válidos.'
        if (status === 400 && code === 'INVALID_EVENT_TIME_RANGE') return 'O horário de término deve ser posterior ao horário de início.'
        if (status === 404 && code === 'EVENT_NOT_FOUND') return 'Evento não encontrado. Ele pode ter sido excluído por outro administrador. Atualize a lista e tente novamente.'
    }
    if (/^business-info(?:\/|$|\?)/.test(endpoint)) {
        if (status === 409 && code === 'BUSINESS_INFO_EXISTS') return 'As informações da feira já foram cadastradas. Atualize a página para editar os dados existentes.'
        if (status === 404 && code === 'BUSINESS_INFO_NOT_FOUND') return 'As informações da feira não foram encontradas. Atualize a página antes de continuar.'
    }
    if (status === 400 && /^(?:message\/create|business-info)(?:\/|$|\?)/.test(endpoint)) {
        const contactMessage = Object.entries(CONTACT_VALIDATION_MESSAGES).find(([errorCode]) => errorCode === code)?.[1]
        if (contactMessage) return contactMessage
    }
    if (status === 400 && /^business-info(?:\/|$|\?)/.test(endpoint)) {
        if (code === 'BUSINESS_WHATSAPP_INVALID') return BUSINESS_WHATSAPP_ERROR
        const instagramMessage = Object.entries(INSTAGRAM_ERROR_MESSAGES).find(([errorCode]) => errorCode === code)?.[1]
        if (instagramMessage) return instagramMessage
        if (code === 'BUSINESS_EMAIL_INVALID') return BUSINESS_EMAIL_ERROR
    }
    if (status === 403 && code === 'ADMIN_DISABLED') return 'O acesso desta conta administrativa foi desativado.'
    if (status === 403 && code === 'ADMIN_ACCESS_REVOKED') return 'Você não tem mais permissões administrativas. Seu acesso ao portal foi removido.'
    if (/^event\/image\/upload(?:\/|$|\?)/.test(endpoint)) {
        if (status === 413) return EVENT_IMAGE_TOO_LARGE
        if (status === 400) return `Não foi possível validar a foto. Selecione novamente uma imagem JPG ou PNG de até ${EVENT_IMAGE_MAX_MB} MB.`
    }
    if (/^admin\/[^/?]+\/?(?:\?|$)/.test(endpoint)) {
        if (status === 404 && code === 'ADMIN_NOT_FOUND') return 'Administrador não encontrado. Atualize a lista e tente novamente.'
        if (status === 403 && code === 'ADMIN_DELETE_FORBIDDEN') return 'Apenas um Super Admin pode excluir contas de administradores.'
        if (status === 403 && code === 'SUPER_ADMIN_DELETE_FORBIDDEN') return 'Você não pode excluir outro Super Admin. Cada Super Admin deve excluir a própria conta.'
        if (status === 403 && code === 'SUPER_ADMIN_UPDATE_FORBIDDEN') return 'Você só pode reativar outro Super Admin. As demais alterações devem ser feitas pelo próprio usuário.'
        if (status === 409 && code === 'LAST_SUPER_ADMIN') return 'Você é o único Super Admin ativo. Promova um administrador ativo ou reative outro Super Admin antes de excluir, desativar ou rebaixar sua conta.'
        if (status === 400 && code === 'CURRENT_PASSWORD_REQUIRED') return 'Informe sua senha atual para excluir a conta.'
        if (status === 403 && code === 'INVALID_CURRENT_PASSWORD') return 'Senha atual incorreta. Confira sua senha e tente novamente.'
        if (status === 409 && code === 'ADMIN_ACTIVE') return 'Desative o administrador antes de excluir a conta.'
        if (status === 409 && code === 'ADMIN_HAS_EVENTS') return 'Não é possível excluir esta conta sem um Super Admin ativo para assumir os eventos vinculados.'
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
    if (status === 409) return 'Os dados foram alterados ou já estão cadastrados. Atualize a página e tente novamente.'
    if (status === 404) return 'O conteúdo solicitado não está disponível.'
    if (status === 429) return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
    if (status >= 500) return 'O serviço está temporariamente indisponível. Tente novamente mais tarde.'

    return 'Não foi possível concluir a solicitação. Verifique os dados e tente novamente.'
}

export function isAdminDisabledError(error: unknown): boolean {
    return error instanceof ApiRequestError && error.status === 403 && error.code === 'ADMIN_DISABLED'
}

export function getUserFacingError(error: unknown, fallback: string): string {
    return error instanceof ApiRequestError ? error.message : fallback
}
