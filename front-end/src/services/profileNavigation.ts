import { adminSectionReturnLabels, getAdminHref, getAdminSection } from './adminNavigation'
import { normalizePortalPath } from './navigation'

export type AccountReturnTarget = { href: string; label: string }

const fallback: AccountReturnTarget = { href: '/admin', label: 'Voltar ao painel' }
const returnLabels: Record<string, string> = {
    '/': 'Voltar ao início',
    '/sobre': 'Voltar ao início',
    '/calendario': 'Voltar ao calendário',
    '/produtores': 'Voltar aos produtores',
    '/contato': 'Voltar ao contato',
    '/calculadora': 'Voltar à calculadora',
    '/admin/login': 'Voltar ao login',
    '/admin/esqueci-minha-senha': 'Voltar à recuperação de senha',
}

export function getAccountReturnTarget(source: string | null): AccountReturnTarget {
    if (!source) return fallback
    const path = normalizePortalPath(source)
    if (Object.hasOwn(returnLabels, path)) return { href: path, label: returnLabels[path] }
    if (/^\/admin(?:\/(?:dashboard|eventos|informacoes|administradores|mensagens))?$/.test(path.split('?')[0])) {
        const section = getAdminSection(path)
        return { href: getAdminHref(section), label: adminSectionReturnLabels[section] }
    }
    const detailRoute = /^\/(evento|produtor)\/([^/?#\\]+)$/.exec(path)
    if (detailRoute) {
        try {
            decodeURIComponent(detailRoute[2])
            return { href: path, label: detailRoute[1] === 'evento' ? 'Voltar ao evento' : 'Voltar ao produtor' }
        } catch { return fallback }
    }
    return fallback
}

export function getProfileHref(sourcePath: string): string {
    const path = normalizePortalPath(sourcePath)
    if (path.split('?')[0] === '/minha-conta') return path
    const source = getAccountReturnTarget(path)
    return `/minha-conta?origem=${encodeURIComponent(source.href)}`
}
