import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import Icon from '../../components/Icon'
import { createAdmin, deleteAdmin, getAdmins, updateAdmin, type AdminRecord } from '../../services/adminService'
import { AUTH_STATE_CHANGE_EVENT, getAdminId, getAdminProfile } from '../../services/authToken'
import './AdminAdministrators.css'

type AdminFormState = {
    name: string
    email: string
    password: string
    role: 'ADMIN' | 'SUPER_ADMIN'
}

const emptyForm: AdminFormState = {
    name: '',
    email: '',
    password: '',
    role: 'ADMIN',
}

const formatDate = (value?: string | null) => {
    if (!value) return 'Ainda não foi salvo'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return 'Ainda não foi salvo'

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(parsed).replace('.', '')
}

const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'A'
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'A'
    return `${parts[0][0]?.toUpperCase() ?? ''}${parts[1][0]?.toUpperCase() ?? ''}`
}

const getRoleLabel = (role: string) => (
    role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'
)

function EditIcon() {
    return <Icon name="edit" />
}

function DeleteIcon() {
    return <Icon name="trash" />
}

const AdminAdministrators = () => {
    const [currentProfile, setCurrentProfile] = useState(getAdminProfile)
    const canManageAdmins = currentProfile?.role === 'SUPER_ADMIN' && Boolean(currentProfile.active)

    useEffect(() => {
        const syncProfile = () => setCurrentProfile(getAdminProfile())
        window.addEventListener(AUTH_STATE_CHANGE_EVENT, syncProfile)
        return () => window.removeEventListener(AUTH_STATE_CHANGE_EVENT, syncProfile)
    }, [])

    const [admins, setAdmins] = useState<AdminRecord[]>([])
    const [form, setForm] = useState<AdminFormState>(emptyForm)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingAdminId, setEditingAdminId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const loadAdmins = async () => {
        try {
            setIsLoading(true)
            const data = await getAdmins()
            setAdmins(data)
        } catch (loadingError) {
            setError('Não foi possível carregar os administradores.')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        void loadAdmins()
    }, [])

    const activeAdmins = admins.filter(admin => admin.active).length
    const latestAdmin = [...admins].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0]

    const handleFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target
        setForm(current => ({ ...current, [name]: value }))
        if (error) setError(null)
        if (success) setSuccess(null)
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!canManageAdmins) return

        if (!form.name.trim() || !form.email.trim()) {
            setError('Preencha nome e e-mail para continuar.')
            return
        }

        try {
            setIsSubmitting(true)
            setError(null)
            setSuccess(null)

            if (editingAdminId) {
                const payload: Partial<AdminRecord> = {
                    name: form.name.trim(),
                    email: form.email.trim(),
                    role: form.role,
                }

                if (form.password.trim()) {
                    payload.password = form.password
                }

                await updateAdmin(editingAdminId, payload)
                setSuccess('Administrador atualizado com sucesso.')
            } else {
                if (!form.password.trim()) {
                    setError('Informe a senha para cadastrar um novo administrador.')
                    return
                }

                await createAdmin({
                    name: form.name.trim(),
                    email: form.email.trim(),
                    password: form.password,
                    role: form.role,
                })
                setSuccess('Administrador cadastrado com sucesso.')
            }

            setForm(emptyForm)
            setEditingAdminId(null)
            await loadAdmins()
        } catch (submissionError) {
            const message = submissionError instanceof Error ? submissionError.message : 'Não foi possível salvar o administrador.'
            setError(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleToggleStatus = async (admin: AdminRecord) => {
        if (!canManageAdmins) return
        const currentUserId = getAdminId()
        if (admin.id === currentUserId) {
            setError('Você não pode desativar o seu próprio acesso administrativo.')
            return
        }

        try {
            await updateAdmin(admin.id, { active: !admin.active })
            setSuccess(admin.active ? 'Administrador desativado com sucesso.' : 'Administrador ativado com sucesso.')
            await loadAdmins()
        } catch (toggleError) {
            const message = toggleError instanceof Error ? toggleError.message : 'Não foi possível atualizar o status do administrador.'
            setError(message)
        }
    }

    const handleDelete = async (admin: AdminRecord) => {
        if (!canManageAdmins) return
        const currentUserId = getAdminId()
        if (admin.id === currentUserId) {
            setError('Você não pode excluir sua própria conta administrativa.')
            return
        }

        const confirmed = window.confirm(`Deseja remover ${admin.name} da lista de administradores?`)
        if (!confirmed) return

        try {
            await deleteAdmin(admin.id)
            setSuccess('Administrador removido com sucesso.')
            await loadAdmins()
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : 'Não foi possível remover o administrador.'
            setError(message)
        }
    }

    return (
        <section className="admin-managers-page" aria-label="Gerenciamento de administradores">
            <header className="admin-managers-header">
                <h1>Gerenciamento de Administradores</h1>
                <p>Controle as permissões de acesso ao painel da associação</p>
            </header>

            <div className={`admin-managers-workspace${canManageAdmins ? '' : ' is-read-only'}`}>
                <div className="admin-managers-summary">
                    <div className="admin-managers-stat-card">
                        <span className="admin-managers-stat-label">Administradores Ativos</span>
                        <strong>{activeAdmins}</strong>
                        <small>Todos online hoje</small>
                    </div>

                    <div className="admin-managers-stat-card is-compact">
                        <span className="admin-managers-stat-label">Último cadastro administrativo</span>
                        <strong>{latestAdmin ? latestAdmin.name : 'Nenhum registro'}</strong>
                        <small>
                            {latestAdmin ? `Registrado em ${formatDate(latestAdmin.createdAt ?? null)}` : 'Ainda não há registros'}
                        </small>
                    </div>
                </div>

                <div className={`admin-managers-main-content${canManageAdmins ? '' : ' is-read-only'}`}>
                    <div className="admin-managers-list-panel">
                        <h2>Admins com Acesso ao Sistema</h2>

                        {error && <p className="admin-managers-alert is-error" role="alert">{error}</p>}
                        {success && <p className="admin-managers-alert is-success" role="status">{success}</p>}

                        {isLoading ? (
                            <p className="admin-managers-empty">Carregando administradores...</p>
                        ) : admins.length === 0 ? (
                            <p className="admin-managers-empty">Nenhum administrador cadastrado.</p>
                        ) : (
                            <div className="admin-managers-table" role="table" aria-label="Lista de administradores">
                                <div className="admin-managers-table-head" role="row">
                                    <span>Nome</span>
                                    <span>E-mail</span>
                                    <span>Cargo</span>
                                    <span>Status</span>
                                    {canManageAdmins && <span>Ações</span>}
                                </div>

                                {admins.map(admin => (
                                    <div className="admin-managers-table-row" key={admin.id} role="row">
                                        <div className="admin-managers-person" role="cell">
                                            <span className="admin-managers-avatar">{getInitials(admin.name)}</span>
                                            <span className="admin-managers-name">{admin.name}</span>
                                        </div>

                                        <span className="admin-managers-email" role="cell">{admin.email}</span>
                                        <span className="admin-managers-role" role="cell">{getRoleLabel(admin.role)}</span>

                                        <span className="admin-managers-status" role="cell">
                                            <span className={`admin-managers-status-badge ${admin.active ? 'is-active' : 'is-inactive'}`}>
                                                {admin.active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </span>

                                        {canManageAdmins && <div className="admin-managers-actions" role="cell">
                                            <button
                                                type="button"
                                                className="admin-managers-action-button is-toggle"
                                                onClick={() => handleToggleStatus(admin)}
                                                aria-label={admin.active ? 'Desativar administrador' : 'Ativar administrador'}
                                                title={admin.active ? 'Desativar' : 'Ativar'}
                                            >
                                                {admin.active ? 'Desativar' : 'Ativar'}
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-managers-action-button is-edit"
                                                onClick={() => {
                                                    setEditingAdminId(admin.id)
                                                    setForm({
                                                        name: admin.name,
                                                        email: admin.email,
                                                        password: '',
                                                        role: admin.role,
                                                    })
                                                    setError(null)
                                                    setSuccess(null)
                                                }}
                                                aria-label={`Editar ${admin.name}`}
                                                title="Editar"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-managers-action-button is-delete"
                                                onClick={() => handleDelete(admin)}
                                                aria-label={`Excluir ${admin.name}`}
                                                title="Excluir"
                                            >
                                                <DeleteIcon />
                                            </button>
                                        </div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {canManageAdmins && <aside className="admin-managers-form-panel">
                        <h2>Cadastrar Novo Admin</h2>

                        <form className="admin-managers-form" onSubmit={handleSubmit}>
                            <label>
                                <span>Nome Completo</span>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleFieldChange}
                                    placeholder="Nome do Administrador"
                                />
                            </label>

                            <label>
                                <span>E-mail</span>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleFieldChange}
                                    placeholder="exemplo@brotandofeiras..."
                                />
                            </label>

                            <label>
                                <span>Cargo / Função</span>
                                <select name="role" value={form.role} onChange={handleFieldChange}>
                                    <option value="ADMIN">Administrador</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
                            </label>

                            <label>
                                <span>Senha</span>
                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleFieldChange}
                                    placeholder="Digite uma senha"
                                />
                            </label>

                            <button type="submit" className="admin-managers-submit-button" disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : editingAdminId ? 'Salvar Alterações' : 'Salvar e Enviar Convite'}
                            </button>

                            {editingAdminId && (
                                <button
                                    type="button"
                                    className="admin-managers-cancel-button"
                                    onClick={() => {
                                        setEditingAdminId(null)
                                        setForm(emptyForm)
                                        setError(null)
                                        setSuccess(null)
                                    }}
                                >
                                    Cancelar edição
                                </button>
                            )}
                        </form>
                    </aside>}
                </div>
            </div>
        </section>
    )
}

export default AdminAdministrators
