import { adminSectionReturnLabels, getAdminHref, getAdminSection } from './adminNavigation'

export type AccountReturnTarget = { href: string; label: string }

const fallback: AccountReturnTarget = { href: '#/admin', label: 'Voltar ao painel' }
const returnLabels: Record<string, string> = {
    '#inicio': 'Voltar ao início',
    '#sobre': 'Voltar ao início',
    '#/calendario': 'Voltar ao calendário',
    '#/produtores': 'Voltar aos produtores',
    '#contato': 'Voltar ao contato',
    '#/contato': 'Voltar ao contato',
    '#calculadora': 'Voltar à calculadora',
    '#/calculadora': 'Voltar à calculadora',
    '#/admin/login': 'Voltar ao login',
    '#/admin/esqueci-minha-senha': 'Voltar à recuperação de senha',
}

export function getAccountReturnTarget(source: string | null): AccountReturnTarget {
    if (!source) return fallback
    const hash = source.replace(/\/+$/, '')
    if (Object.hasOwn(returnLabels, hash)) return { href: hash, label: returnLabels[hash] }
    if (hash.split('?')[0] === '#/admin') {
        const section = getAdminSection(hash)
        return { href: getAdminHref(section), label: adminSectionReturnLabels[section] }
    }
    const detailRoute = /^#\/(evento|produtor)\/([^/?#]+)$/.exec(hash)
    if (detailRoute) {
        try {
            decodeURIComponent(detailRoute[2])
            return { href: hash, label: detailRoute[1] === 'evento' ? 'Voltar ao evento' : 'Voltar ao produtor' }
        } catch { return fallback }
    }
    return fallback
}

export function getProfileHref(sourceHash: string): string {
    if (sourceHash.split('?')[0] === '#/minha-conta') return sourceHash
    const source = getAccountReturnTarget(sourceHash || '#inicio')
    return `#/minha-conta?origem=${encodeURIComponent(source.href)}`
}
