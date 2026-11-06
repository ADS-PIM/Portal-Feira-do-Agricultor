import type { AdminSection } from '../components/AdminSideNav/AdminSideNav'

export const adminSectionReturnLabels: Record<AdminSection, string> = {
    dashboard: 'Voltar ao painel',
    eventos: 'Voltar aos eventos',
    informacoes: 'Voltar às informações da feira',
    administradores: 'Voltar aos administradores',
    mensagens: 'Voltar às mensagens',
}

export function getAdminSection(hash: string): AdminSection {
    const section = new URLSearchParams(hash.slice(hash.indexOf('?') + 1)).get('secao')
    return section && Object.hasOwn(adminSectionReturnLabels, section) ? section as AdminSection : 'dashboard'
}

export function getAdminHref(section: AdminSection): string {
    return section === 'dashboard' ? '#/admin' : `#/admin?secao=${section}`
}
