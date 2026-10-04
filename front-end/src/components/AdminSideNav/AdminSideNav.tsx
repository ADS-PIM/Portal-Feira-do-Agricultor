import './AdminSideNav.css'

const navigationItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: 'dashboard' },
    { id: 'eventos', label: 'Eventos', icon: 'events' },
    { id: 'informacoes', label: 'Informações da Feira', icon: 'information' },
    { id: 'administradores', label: 'Administradores', icon: 'administrators' },
    { id: 'mensagens', label: 'Mensagens de usuários', icon: 'messages' },
] as const

export type AdminSection = (typeof navigationItems)[number]['id']
type NavigationIconName = (typeof navigationItems)[number]['icon']

function NavigationIcon({ name }: { name: NavigationIconName }) {
    switch (name) {
        case 'dashboard':
            return (
                <>
                    <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
                    <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
                    <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
                    <rect x="14.5" y="14.5" width="6" height="6" rx="1" />
                </>
            )
        case 'events':
            return (
                <>
                    <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
                    <path d="M7.5 3v5M16.5 3v5M3.5 10h17" />
                </>
            )
        case 'information':
            return (
                <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5M12 8h.01" />
                </>
            )
        case 'administrators':
            return (
                <>
                    <path d="M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-3Z" />
                    <circle cx="12" cy="10" r="2.5" />
                    <path d="M7.8 16a5.2 5.2 0 0 1 8.4 0" />
                </>
            )
        case 'messages':
            return <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
    }
}

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
                                <svg
                                    className="admin-side-nav-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <NavigationIcon name={item.icon} />
                                </svg>
                                <span>{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    )

export default AdminSideNav
