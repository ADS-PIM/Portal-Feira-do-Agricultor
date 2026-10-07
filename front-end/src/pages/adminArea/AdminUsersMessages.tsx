import { useEffect, useMemo, useState } from 'react'
import Icon from '../../components/Icon'
import {
    deleteUserMessage,
    getUserMessages,
    markUserMessageAsRead,
    type UserMessage,
} from '../../services/messageService'
import { getUserFacingError } from '../../services/errors'
import './AdminUsersMessages.css'

type MessageFilter = 'all' | 'unread' | 'read'

const SUBJECT_LABELS: Record<string, string> = {
    DOUBT: 'Dúvida',
    SUGGESTION: 'Sugestão',
    COMPLAINT: 'Reclamação',
    PARTNERSHIP: 'Parceria',
    OTHER: 'Outros',
}

function displayValue(value: string | null | undefined): string {
    return value?.trim() || 'Vazio'
}

function formatSubject(value: string | null | undefined): string {
    if (!value?.trim()) return 'Vazio'
    return SUBJECT_LABELS[value.trim().toUpperCase()] ?? value
}

function formatSubmittedAt(value: string | null | undefined): string {
    if (!value?.trim()) return 'Vazio'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Vazio'

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date).replace(',', ' ·')
}

function formatSubmittedDate(value: string | null | undefined): string {
    if (!value?.trim()) return 'Vazio'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Vazio'

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date)
}

function formatSubmittedTime(value: string | null | undefined): string {
    if (!value?.trim()) return 'Vazio'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Vazio'

    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

function getWhatsAppUrl(phone: string | null | undefined, message: UserMessage): string | null {
    const phoneDigits = phone?.replace(/\D/g, '') ?? ''
    if (!phoneDigits) return null
    const internationalDigits = phoneDigits.length === 10 || phoneDigits.length === 11
        ? `55${phoneDigits}`
        : phoneDigits
    const text = `Olá, ${displayValue(message.name)}. Estou respondendo sua mensagem sobre "${displayValue(message.title)}".`
    return `https://wa.me/${internationalDigits}?text=${encodeURIComponent(text)}`
}

function UserMessageDetails({
    message,
    error,
    onBack,
    onDelete,
}: {
    message: UserMessage
    error: string | null
    onBack: () => void
    onDelete: () => void
}) {
    const email = message.email?.trim()
    const whatsappUrl = getWhatsAppUrl(message.phone, message)

    return (
        <section className="admin-user-message-detail" aria-labelledby="admin-user-message-detail-title">
            <div className="admin-user-message-detail-toolbar">
                <button type="button" className="admin-user-message-back-button" onClick={onBack}>
                    <Icon name="arrowLeft" />
                    Voltar para mensagens
                </button>
                <div className="admin-user-message-detail-actions">
                    {email && (
                        <a
                            className="admin-user-message-reply-button"
                            href={`mailto:${email}?subject=${encodeURIComponent(`Re: ${displayValue(message.title)}`)}`}
                        >
                            <Icon name="email" />
                            Responder por e-mail
                        </a>
                    )}
                    {whatsappUrl && (
                        <a className="admin-user-message-reply-button is-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">
                            <Icon name="whatsapp" />
                            Responder pelo WhatsApp
                        </a>
                    )}
                    <button type="button" className="admin-user-message-delete-button" onClick={onDelete}>
                        <Icon name="trash" />
                        Excluir mensagem
                    </button>
                </div>
            </div>

            {error && <p className="admin-user-messages-alert" role="alert">{error}</p>}

            <article className="admin-user-message-detail-card">
                <header className="admin-user-message-detail-header">
                    <h2 id="admin-user-message-detail-title">Detalhes da mensagem</h2>
                    <div className="admin-user-message-read-status">
                        <span>Status de leitura</span>
                        <strong className={!message.isRead ? 'is-unread' : ''}>
                            {message.isRead ? 'Aberta' : 'Não lida'}
                        </strong>
                    </div>
                </header>

                <dl className="admin-user-message-detail-metadata">
                    <div><dt>Nome completo</dt><dd>{displayValue(message.name)}</dd></div>
                    <div><dt>Título</dt><dd>{displayValue(message.title)}</dd></div>
                    <div><dt>E-mail</dt><dd>{displayValue(message.email)}</dd></div>
                    <div><dt>Telefone</dt><dd>{displayValue(message.phone)}</dd></div>
                    <div><dt>Assunto</dt><dd>{formatSubject(message.subject)}</dd></div>
                    <div><dt>Data de envio</dt><dd>{formatSubmittedDate(message.submitDate)}</dd></div>
                    <div><dt>Horário de envio</dt><dd>{formatSubmittedTime(message.submitDate)}</dd></div>
                </dl>

                <section className="admin-user-message-detail-body">
                    <h3>Mensagem</h3>
                    <p>{displayValue(message.message)}</p>
                </section>
            </article>
        </section>
    )
}

function AdminUsersMessages() {
    const [messages, setMessages] = useState<UserMessage[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [filter, setFilter] = useState<MessageFilter>('all')
    const [selectedMessage, setSelectedMessage] = useState<UserMessage | null>(null)
    const [pendingDeletion, setPendingDeletion] = useState<UserMessage | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        const controller = new AbortController()

        const loadMessages = async () => {
            try {
                const result = await getUserMessages(controller.signal)
                if (!controller.signal.aborted) setMessages(result ?? [])
            } catch (error) {
                if (!controller.signal.aborted) {
                    setLoadError(getUserFacingError(
                        error,
                        'Não foi possível carregar as mensagens. Verifique sua conexão e tente novamente.',
                    ))
                }
            } finally {
                if (!controller.signal.aborted) setIsLoading(false)
            }
        }

        void loadMessages()
        return () => controller.abort()
    }, [reloadKey])

    const unreadCount = messages.filter(message => !message.isRead).length
    const readCount = messages.filter(message => message.isRead).length
    const filteredMessages = useMemo(
        () => messages.filter(message => {
            if (filter === 'unread') return !message.isRead
            if (filter === 'read') return message.isRead
            return true
        }),
        [filter, messages],
    )

    const openMessage = async (message: UserMessage) => {
        setSelectedMessage(message)
        setActionError(null)
        if (message.isRead) return

        try {
            await markUserMessageAsRead(message.id)
            setMessages(current => current.map(item => item.id === message.id ? { ...item, isRead: true } : item))
            setSelectedMessage(current => current?.id === message.id ? { ...current, isRead: true } : current)
        } catch (error) {
            setActionError(getUserFacingError(error, 'Não foi possível atualizar o status da mensagem.'))
        }
    }

    const removeMessage = async () => {
        if (!pendingDeletion || isDeleting) return
        setIsDeleting(true)
        setActionError(null)
        try {
            await deleteUserMessage(pendingDeletion.id)
            setMessages(current => current.filter(message => message.id !== pendingDeletion.id))
            if (selectedMessage?.id === pendingDeletion.id) setSelectedMessage(null)
            setPendingDeletion(null)
        } catch (error) {
            setActionError(getUserFacingError(error, 'Não foi possível excluir esta mensagem. Tente novamente.'))
            setPendingDeletion(null)
        } finally {
            setIsDeleting(false)
        }
    }

    const retryLoading = () => {
        setMessages([])
        setIsLoading(true)
        setLoadError(null)
        setReloadKey(key => key + 1)
    }

    return (
        <div className="admin-user-messages">
            <header className="admin-user-messages-heading">
                <h1>{selectedMessage ? 'Mensagem aberta' : 'Mensagem de Usuários'}</h1>
                <p>
                    {selectedMessage
                        ? 'Confira as informações e a mensagem enviada pelo usuário.'
                        : 'Visualize e responda às mensagens dos usuários do site por e-mail ou WhatsApp/telefone.'}
                </p>
            </header>

            <div className="admin-user-messages-workspace">
                {selectedMessage ? (
                    <UserMessageDetails
                        message={selectedMessage}
                        error={actionError}
                        onBack={() => {
                            setSelectedMessage(null)
                            setActionError(null)
                        }}
                        onDelete={() => {
                            setActionError(null)
                            setPendingDeletion(selectedMessage)
                        }}
                    />
                ) : (
                    <>
                {actionError && !selectedMessage && (
                    <p className="admin-user-messages-alert" role="alert">{actionError}</p>
                )}

                {!loadError && (
                    <section className="admin-user-message-stats" aria-label="Resumo das mensagens">
                        <article>
                            <h2>Total de mensagens</h2>
                            <strong>{isLoading ? '—' : messages.length}</strong>
                            <p>Mensagens registradas no período</p>
                        </article>
                        <article>
                            <h2>Não lidas</h2>
                            <strong className="is-green">{isLoading ? '—' : unreadCount}</strong>
                            <p>Aguardando atenção da equipe</p>
                        </article>
                        <article>
                            <h2>Abertas</h2>
                            <strong>{isLoading ? '—' : readCount}</strong>
                            <p>Já visualizadas pela equipe</p>
                        </article>
                    </section>
                )}

                {isLoading && (
                    <section className="admin-user-messages-state" role="status">
                        <span className="admin-user-messages-state-icon" aria-hidden="true">
                            <Icon name="email" />
                        </span>
                        <h2>Carregando mensagens...</h2>
                        <p>Aguarde enquanto buscamos as mensagens recebidas.</p>
                    </section>
                )}

                {!isLoading && loadError && (
                    <section className="admin-user-messages-state is-error" role="alert">
                        <span className="admin-user-messages-state-icon" aria-hidden="true">!</span>
                        <h2>Não foi possível carregar as mensagens</h2>
                        <p>{loadError}</p>
                        <button type="button" onClick={retryLoading}>Tentar novamente</button>
                    </section>
                )}

                {!isLoading && !loadError && (
                    <section className="admin-user-messages-list" aria-labelledby="admin-user-messages-list-title">
                        <div className="admin-user-messages-list-header">
                            <div>
                                <h2 id="admin-user-messages-list-title">Listagem de mensagens</h2>
                                <p>{unreadCount} não lidas · {readCount} abertas</p>
                            </div>
                            <div className="admin-user-messages-filters" role="group" aria-label="Filtrar mensagens">
                                <button
                                    type="button"
                                    className={filter === 'all' ? 'is-active' : ''}
                                    aria-pressed={filter === 'all'}
                                    onClick={() => setFilter('all')}
                                >
                                    Todas
                                </button>
                                <button
                                    type="button"
                                    className={filter === 'unread' ? 'is-active' : ''}
                                    aria-pressed={filter === 'unread'}
                                    onClick={() => setFilter('unread')}
                                >
                                    Não lidas
                                </button>
                                <button
                                    type="button"
                                    className={filter === 'read' ? 'is-active' : ''}
                                    aria-pressed={filter === 'read'}
                                    onClick={() => setFilter('read')}
                                >
                                    Abertas
                                </button>
                            </div>
                        </div>

                        {messages.length === 0 ? (
                            <p className="admin-user-messages-empty">Ainda não há mensagens recebidas.</p>
                        ) : filteredMessages.length === 0 ? (
                            <p className="admin-user-messages-empty">Não há mensagens nesta categoria.</p>
                        ) : (
                            <div className="admin-user-messages-table-wrap">
                                <table className="admin-user-messages-table">
                                    <thead>
                                        <tr>
                                            <th scope="col">Nome</th>
                                            <th scope="col">Título</th>
                                            <th scope="col">Assunto</th>
                                            <th scope="col">E-mail</th>
                                            <th scope="col">Enviado em</th>
                                            <th scope="col">Status</th>
                                            <th scope="col">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMessages.map(message => (
                                            <tr key={message.id}>
                                                <td>
                                                    <strong>{displayValue(message.name)}</strong>
                                                    {message.phone?.trim() && <span>{message.phone}</span>}
                                                </td>
                                                <td>{displayValue(message.title)}</td>
                                                <td>{formatSubject(message.subject)}</td>
                                                <td>{displayValue(message.email)}</td>
                                                <td>{formatSubmittedAt(message.submitDate)}</td>
                                                <td>
                                                    <span className={`admin-user-message-status${!message.isRead ? ' is-unread' : ''}`}>
                                                        {message.isRead ? 'Aberta' : 'Não lida'}
                                                    </span>
                                                </td>
                                                <td className="admin-user-message-actions-cell">
                                                    <div className="admin-user-message-row-actions">
                                                        <button type="button" className="is-primary" onClick={() => void openMessage(message)}>
                                                            Abrir mensagem
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="is-secondary"
                                                            onClick={() => {
                                                                setActionError(null)
                                                                setPendingDeletion(message)
                                                            }}
                                                        >
                                                            Excluir
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}
                    </>
                )}
            </div>

            {pendingDeletion && (
                <div
                    className="admin-user-message-backdrop"
                    role="presentation"
                    onMouseDown={event => {
                        if (event.target === event.currentTarget && !isDeleting) setPendingDeletion(null)
                    }}
                >
                    <section
                        className="admin-user-message-confirm"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="admin-user-message-delete-title"
                        aria-describedby="admin-user-message-delete-description"
                    >
                        <span className="admin-user-message-confirm-icon" aria-hidden="true">!</span>
                        <h2 id="admin-user-message-delete-title">Excluir mensagem?</h2>
                        <p id="admin-user-message-delete-description">
                            A mensagem de {displayValue(pendingDeletion.name)} será removida permanentemente.
                        </p>
                        {actionError && <p className="admin-user-messages-alert" role="alert">{actionError}</p>}
                        <div className="admin-user-message-confirm-actions">
                            <button type="button" className="is-secondary" onClick={() => setPendingDeletion(null)} disabled={isDeleting}>
                                Cancelar
                            </button>
                            <button type="button" className="is-danger" onClick={() => void removeMessage()} disabled={isDeleting}>
                                {isDeleting ? 'Excluindo...' : 'Excluir mensagem'}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}

export default AdminUsersMessages
