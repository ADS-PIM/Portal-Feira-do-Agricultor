import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import Icon from '../../components/Icon'
import { getBusinessInfo, type BusinessInfo, upsertBusinessInfo } from '../../services/businessInfoService'
import { getUserFacingError } from '../../services/errors'
import { defaultBusinessDescription } from '../../utils/businessDescription'
import {
    createEmptyWeeklyBusinessHours,
    formatWeeklyBusinessHours,
    parseWeeklyBusinessHours,
    validateWeeklyBusinessHours,
    weekdays,
    type DayBusinessHours,
    type WeekdayId,
} from '../../utils/businessHours'
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
    return <Icon name={type} />
}

const AdminBusinessInfo = () => {
    const [values, setValues] = useState<BusinessInfoFormValues>(emptyValues)
    const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [weeklyHours, setWeeklyHours] = useState(createEmptyWeeklyBusinessHours)
    const [legacyHours, setLegacyHours] = useState<string | null>(null)
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
                const parsedHours = parseWeeklyBusinessHours(info?.businessHours)
                setWeeklyHours(parsedHours ?? createEmptyWeeklyBusinessHours())
                setLegacyHours(info?.businessHours?.trim() && !parsedHours ? info.businessHours : null)
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

    const handleDayHoursChange = (day: WeekdayId, field: 'opensAt' | 'closesAt', value: string) => {
        setWeeklyHours((current) => ({
            ...current,
            [day]: { ...current[day], [field]: value },
        }))
        setError(null)
        setStatusMessage(null)
    }

    const handleDayClosedChange = (day: WeekdayId, closed: boolean) => {
        setWeeklyHours((current) => ({
            ...current,
            [day]: closed
                ? { closed, opensAt: '', closesAt: '' }
                : { ...current[day], closed },
        }))
        setError(null)
        setStatusMessage(null)
    }

    const handleEditLegacyHours = () => {
        setLegacyHours(null)
        setWeeklyHours(createEmptyWeeklyBusinessHours())
    }

    const handleReset = () => {
        setValues(toValues(businessInfo))
        const parsedHours = parseWeeklyBusinessHours(businessInfo?.businessHours)
        setWeeklyHours(parsedHours ?? createEmptyWeeklyBusinessHours())
        setLegacyHours(businessInfo?.businessHours?.trim() && !parsedHours ? businessInfo.businessHours : null)
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

        if (!legacyHours) {
            const hoursError = validateWeeklyBusinessHours(weeklyHours)
            if (hoursError) {
                setError(hoursError)
                setStatusMessage(null)
                return
            }
        }

        const payload = {
            instagramAccount: fieldToggles.instagram ? values.instagramAccount.trim() : null,
            whatsappNumber: fieldToggles.whatsapp ? values.whatsappNumber.trim() : null,
            businessEmail: fieldToggles.email ? values.businessEmail.trim() : null,
            businessHours: legacyHours ?? formatWeeklyBusinessHours(weeklyHours),
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
            const parsedHours = parseWeeklyBusinessHours(refreshed?.businessHours)
            setWeeklyHours(parsedHours ?? createEmptyWeeklyBusinessHours())
            setLegacyHours(refreshed?.businessHours?.trim() && !parsedHours ? refreshed.businessHours : null)
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
                                    placeholder={defaultBusinessDescription}
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

                            <section className="admin-business-hours" aria-labelledby="business-hours-title">
                                <div>
                                    <h2 id="business-hours-title">Horário de atendimento</h2>
                                    <p>Defina os horários de início e término para cada dia da semana.</p>
                                </div>
                                {legacyHours && (
                                    <div className="admin-business-hours-legacy">
                                        <p>
                                            O horário salvo anteriormente não está no formato semanal. Ele será mantido até você
                                            escolher editar os horários por dia.
                                        </p>
                                        <p className="admin-business-hours-legacy-value">{legacyHours}</p>
                                        <button type="button" onClick={handleEditLegacyHours}>
                                            Editar horários por dia
                                        </button>
                                    </div>
                                )}
                                {!legacyHours && (
                                    <div className="admin-business-hours-list">
                                        {weekdays.map(({ id, label }) => {
                                            const schedule: DayBusinessHours = weeklyHours[id]
                                            return (
                                                <div className="admin-business-hours-day" key={id}>
                                                    <div className="admin-business-hours-dayHeader">
                                                        <strong>{label}</strong>
                                                        <label className="admin-business-hours-closed">
                                                            <input
                                                                type="checkbox"
                                                                checked={schedule.closed}
                                                                onChange={(event) => handleDayClosedChange(id, event.target.checked)}
                                                            />
                                                            <span>Não atendemos</span>
                                                        </label>
                                                    </div>
                                                    <label className="admin-business-hours-time">
                                                        <span>Início</span>
                                                        <input
                                                            type="time"
                                                            value={schedule.opensAt}
                                                            onChange={(event) => handleDayHoursChange(id, 'opensAt', event.target.value)}
                                                            disabled={schedule.closed}
                                                            aria-label={`Horário de início de ${label}`}
                                                        />
                                                    </label>
                                                    <label className="admin-business-hours-time">
                                                        <span>Término</span>
                                                        <input
                                                            type="time"
                                                            value={schedule.closesAt}
                                                            onChange={(event) => handleDayHoursChange(id, 'closesAt', event.target.value)}
                                                            disabled={schedule.closed}
                                                            aria-label={`Horário de término de ${label}`}
                                                        />
                                                    </label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </section>

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
