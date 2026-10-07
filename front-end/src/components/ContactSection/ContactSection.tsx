import { useEffect, useState } from 'react'
import Icon from '../Icon'
import { getBusinessInfo, type BusinessInfo } from '../../services/businessInfoService'
import { getBusinessHoursLines } from '../../utils/businessHours'
import './ContactSection.css'

const unavailableMessage = 'Não disponível no momento'

function getInstagramUrl(account: string): string {
    const normalizedAccount = account.trim()
    if (/^https?:\/\//i.test(normalizedAccount)) {
        return normalizedAccount
    }

    return `https://www.instagram.com/${normalizedAccount.replace(/^@/, '')}`
}

function getWhatsAppUrl(phoneNumber: string): string | null {
    const phoneDigits = phoneNumber.replace(/\D/g, '')
    const digits = phoneDigits.length === 10 || phoneDigits.length === 11
        ? `55${phoneDigits}`
        : phoneDigits
    return digits ? `https://wa.me/${digits}` : null
}

function ContactIcon({ type }: { type: 'whatsapp' | 'instagram' | 'email' }) {
    return <Icon name={type} />
}

function ContactCard({
    type,
    title,
    value,
    href,
    action,
}: {
    type: 'whatsapp' | 'instagram' | 'email'
    title: string
    value: string | null
    href: string | null
    action: string
}) {
    const availableValue = value?.trim()

    return (
        <article className="contact-card">
            <span className="contact-card-icon">
                <ContactIcon type={type} />
            </span>
            <h3>{title}</h3>
            <p>{availableValue || unavailableMessage}</p>
            {availableValue && href ? (
                <a href={href} target="_blank" rel="noreferrer">
                    {action}
                </a>
            ) : (
                <span className="contact-card-unavailable">{unavailableMessage}</span>
            )}
        </article>
    )
}

const ContactSection = () => {
    const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        const controller = new AbortController()

        const loadBusinessInfo = async () => {
            try {
                setBusinessInfo(await getBusinessInfo(controller.signal))
            } catch {
                if (!controller.signal.aborted) {
                    setHasError(true)
                }
            }
        }

        void loadBusinessInfo()
        return () => controller.abort()
    }, [])

    const whatsappNumber = businessInfo?.whatsappNumber ?? null
    const instagramAccount = businessInfo?.instagramAccount ?? null
    const businessEmail = businessInfo?.businessEmail ?? null
    const businessHours = getBusinessHoursLines(businessInfo?.businessHours)

    return (
        <section id="contato" className="contact-section" aria-labelledby="contact-section-title">
            <header className="contact-section-header">
                <p className="contact-section-eyebrow">CONTATO</p>
                <h2 id="contact-section-title">Queremos ouvir você!</h2>
                <p>
                    Ficou com alguma dúvida, quer saber como expor seu produto ou apoiar de alguma
                    forma? Fale com nosso comitê organizador.
                </p>
            </header>

            {hasError ? (
                <p className="contact-section-error" role="alert">Erro ao carregar contato</p>
            ) : (
                <div className="contact-cards">
                    <ContactCard
                        type="whatsapp"
                        title="Conversar no WhatsApp"
                        value={whatsappNumber}
                        href={whatsappNumber ? getWhatsAppUrl(whatsappNumber) : null}
                        action="Enviar Mensagem"
                    />
                    <ContactCard
                        type="instagram"
                        title="Instagram Oficial"
                        value={instagramAccount}
                        href={instagramAccount?.trim() ? getInstagramUrl(instagramAccount) : null}
                        action="Seguir Perfil"
                    />
                    <ContactCard
                        type="email"
                        title="Enviar um E-mail"
                        value={businessEmail}
                        href={businessEmail?.trim() ? `mailto:${businessEmail.trim()}` : null}
                        action="Enviar E-mail"
                    />
                </div>
            )}
            <section className="contact-section-hours" aria-labelledby="contact-section-hours-title">
                <h3 id="contact-section-hours-title">Horário de atendimento</h3>
                {businessHours.length ? (
                    <ul>
                        {businessHours.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                ) : (
                    <p>Horários não informados.</p>
                )}
            </section>
            <div className="contact-section-action">
                <button type="button" onClick={() => { window.location.hash = '#/contato' }}>
                    Enviar mensagem
                    <Icon name="arrowRight" />
                </button>
            </div>
        </section>
    )
}

export default ContactSection
