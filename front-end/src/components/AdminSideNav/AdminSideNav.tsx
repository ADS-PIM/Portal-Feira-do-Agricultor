import './AdminSideNav.css'
import Icon, { type IconName } from '../Icon'

const navigationItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: 'dashboard' },
    { id: 'eventos', label: 'Eventos', icon: 'calendar' },
    { id: 'informacoes', label: 'Informações da Feira', icon: 'information' },
    { id: 'administradores', label: 'Administradores', icon: 'userShield' },
    { id: 'mensagens', label: 'Mensagens de usuários', icon: 'comments' },
] as const satisfies readonly { id: string; label: string; icon: IconName }[]

export type AdminSection = (typeof navigationItems)[number]['id']

const AdminSideNav = ({
    activeItem,
    onSelect,
}: {
    activeItem: AdminSection
    onSelect: (section: AdminSection) => void
}) => (
        <aside className="admin-side-nav" aria-label="Navegação administrativa">
            <nav>
                <ul className="admin-side-nav-list">
                    {navigationItems.map((item) => (
                        <li key={item.id}>
                            <button
                                className={`admin-side-nav-item${activeItem === item.id ? ' is-active' : ''}`}
                                type="button"
                                aria-pressed={activeItem === item.id}
                                onClick={() => onSelect(item.id)}
                            >
                                <Icon className="admin-side-nav-icon" name={item.icon} />
                                <span>{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    )

export default AdminSideNav
