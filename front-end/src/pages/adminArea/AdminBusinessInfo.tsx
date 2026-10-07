import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { getBusinessInfo, type BusinessInfo, upsertBusinessInfo } from '../../services/businessInfoService'
import { getUserFacingError } from '../../services/errors'
import './AdminBusinessInfo.css'

type BusinessInfoFormValues = {
    instagramAccount: string
    whatsappNumber: string
    businessEmail: string
    description: string
}

const emptyValues: BusinessInfoFormValues = {
    instagramAccount: '',
    whatsappNumber: '',
    businessEmail: '',
    description: '',
}

const toValues = (businessInfo: BusinessInfo | null): BusinessInfoFormValues => ({
    instagramAccount: businessInfo?.instagramAccount?.trim() ?? '',
    whatsappNumber: businessInfo?.whatsappNumber?.trim() ?? '',
    businessEmail: businessInfo?.businessEmail?.trim() ?? '',
    description: businessInfo?.description?.trim() ?? '',
})

function formatLastUpdated(value: string | null | undefined): string {
    if (!value) return 'Ainda não foi salvo'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return 'Ainda não foi salvo'
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(parsed).replace('.', '')
}


function BusinessInfoFieldIcon({ type }: { type: 'whatsapp' | 'instagram' | 'email' }) {
    if (type === 'whatsapp') {
        return (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5.5 19.5 6.2 16a7.8 7.8 0 1 1 11.6 0l.7 3.5-3.3-1.2a9.7 9.7 0 0 0-6.4 0l-3.3 1.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.5 9.8c.3-.5 1-.8 1.3-.8.3 0 .6.2.8.6.2.4.5 1.3.1 1.7-.4.3-1 .6-1.4 1-.3.3-.7 1-.2 1.7.5 1 2.4 1.8 3.8 1.5.9-.2 1.2-.9 1.3-1.4.1-.6.4-.9.8-1.1.3-.1.8-.2.8-.8 0-.6-.5-1.4-1.3-2.1-.8-.7-1.7-1.4-2.2-1.7-.8-.5-1.8-.6-2.5-.2-.7.4-1.3.9-1.5 1.5-.2.6-.1 1.2.1 1.9Z" fill="currentColor" stroke="none" />
            </svg>
        )
    }

    if (type === 'instagram') {
        return (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" stroke="none" />
            </svg>
        )
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

const AdminBusinessInfo = () => {
    const [values, setValues] = useState<BusinessInfoFormValues>(emptyValues)
    const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [fieldToggles, setFieldToggles] = useState({
        whatsapp: true,
        instagram: true,
        email: true,
    })

    useEffect(() => {
        const controller = new AbortController()

        const loadBusinessInfo = async () => {
            try {
                setIsLoading(true)
                const info = await getBusinessInfo(controller.signal)
                setBusinessInfo(info)
                setValues(toValues(info))
                setFieldToggles({
                    whatsapp: Boolean(info?.whatsappNumber?.trim()),
                    instagram: Boolean(info?.instagramAccount?.trim()),
                    email: Boolean(info?.businessEmail?.trim()),
                })
            } catch (loadingError) {
                if (!controller.signal.aborted) {
                    setError(getUserFacingError(loadingError, 'Não foi possível carregar as informações da feira.'))
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false)
                }
            }
        }

        void loadBusinessInfo()
        return () => controller.abort()
    }, [])

    const handleFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target
        setValues((current) => ({ ...current, [name]: value }))
        if (statusMessage) setStatusMessage(null)
        if (error) setError(null)
    }

    const handleToggle = (field: keyof typeof fieldToggles) => {
        setFieldToggles((current) => ({ ...current, [field]: !current[field] }))
    }

    const handleReset = () => {
        setValues(toValues(businessInfo))
        setFieldToggles({
            whatsapp: Boolean(businessInfo?.whatsappNumber?.trim()),
            instagram: Boolean(businessInfo?.instagramAccount?.trim()),
            email: Boolean(businessInfo?.businessEmail?.trim()),
        })
        setError(null)
        setStatusMessage(null)
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const payload = {
            instagramAccount: fieldToggles.instagram ? values.instagramAccount.trim() : '',
            whatsappNumber: fieldToggles.whatsapp ? values.whatsappNumber.trim() : '',
            businessEmail: fieldToggles.email ? values.businessEmail.trim() : '',
            businessHours: businessInfo?.businessHours?.trim() ?? '',
            description: values.description.trim(),
        }

        setIsSaving(true)
        setError(null)
        setStatusMessage(null)

        try {
            await upsertBusinessInfo(payload, businessInfo?.id)
            const refreshed = await getBusinessInfo()
            setBusinessInfo(refreshed)
            setValues(toValues(refreshed))
            setStatusMessage('Informações salvas com sucesso.')
        } catch (submissionError) {
            setError(getUserFacingError(submissionError, 'Não foi possível salvar as informações da feira.'))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <section className="admin-business-info-page" aria-label="Informações da Feira">
            <header className="admin-business-info-header">
                <h1>Informações da Feira</h1>
                <p>Gerencie as informações públicas exibidas no portal do consumidor</p>
            </header>

            <div className="admin-business-info-workspace">
                <div className="admin-business-info-card">
                    {isLoading ? (
                        <div className="admin-business-info-loading" role="status">
                            Carregando informações...
                        </div>
                    ) : (
                        <form className="admin-business-info-form" onSubmit={handleSubmit}>
                            {error && <p className="admin-business-info-alert is-error" role="alert">{error}</p>}
                            {statusMessage && <p className="admin-business-info-alert is-success" role="status">{statusMessage}</p>}

                            <div className="admin-business-info-sectionTitle">Dados Institucionais e Contatos</div>

                            <label className="admin-business-info-field" htmlFor="businessInfo-name">
                                <span>Sobre a Feira (Descrição Pública)</span>
                                <textarea
                                    id="businessInfo-name"
                                    name="description"
                                    rows={3}
                                    value={values.description}
                                    onChange={handleFieldChange}
                                />
                            </label>

                            <div className="admin-business-info-subtitle">Canais de Atendimento &amp; Status</div>

                            <div className="admin-business-info-grid">
                                <div className="admin-business-info-row">
                                    <div className="admin-business-info-iconWrap" aria-hidden="true">
                                        <BusinessInfoFieldIcon type="whatsapp" />
                                    </div>
                                    <input
                                        type="text"
                                        name="whatsappNumber"
                                        value={values.whatsappNumber}
                                        onChange={handleFieldChange}
                                        placeholder="(88) 99876-5432"
                                    />
                                    <button
                                        type="button"
                                        className={`admin-business-info-toggle ${fieldToggles.whatsapp ? 'is-enabled' : ''}`}
                                        aria-label={fieldToggles.whatsapp ? 'Desativar WhatsApp' : 'Ativar WhatsApp'}
                                        onClick={() => handleToggle('whatsapp')}
                                    >
                                        <span />
                                    </button>
                                </div>

                                <div className="admin-business-info-row">
                                    <div className="admin-business-info-iconWrap" aria-hidden="true">
                                        <BusinessInfoFieldIcon type="instagram" />
                                    </div>
                                    <input
                                        type="text"
                                        name="instagramAccount"
                                        value={values.instagramAccount}
                                        onChange={handleFieldChange}
                                        placeholder="@brotando.feiras"
                                    />
                                    <button
                                        type="button"
                                        className={`admin-business-info-toggle ${fieldToggles.instagram ? 'is-enabled' : ''}`}
                                        aria-label={fieldToggles.instagram ? 'Desativar Instagram' : 'Ativar Instagram'}
                                        onClick={() => handleToggle('instagram')}
                                    >
                                        <span />
                                    </button>
                                </div>

                                <div className="admin-business-info-row">
                                    <div className="admin-business-info-iconWrap" aria-hidden="true">
                                        <BusinessInfoFieldIcon type="email" />
                                    </div>
                                    <input
                                        type="email"
                                        name="businessEmail"
                                        value={values.businessEmail}
                                        onChange={handleFieldChange}
                                        placeholder="contato@brotandofeiras.com"
                                    />
                                    <button
                                        type="button"
                                        className={`admin-business-info-toggle ${fieldToggles.email ? 'is-enabled' : ''}`}
                                        aria-label={fieldToggles.email ? 'Desativar e-mail' : 'Ativar e-mail'}
                                        onClick={() => handleToggle('email')}
                                    >
                                        <span />
                                    </button>
                                </div>
                            </div>

                            <div className="admin-business-info-actions">
                                <span className="admin-business-info-updateStamp">
                                    Última atualização em: {formatLastUpdated(businessInfo?.updatedAt ?? null)}
                                </span>
                                <div className="admin-business-info-buttons">
                                    <button type="button" className="admin-business-info-button is-secondary" onClick={handleReset}>
                                        Descartar
                                    </button>
                                    <button type="submit" className="admin-business-info-button is-primary" disabled={isSaving}>
                                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </section>
    )
}

export default AdminBusinessInfo
