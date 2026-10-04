import { useEffect, useState } from 'react'
import { getBusinessInfo, type BusinessInfo } from '../../services/businessInfoService'
import { getUserFacingError } from '../../services/errors'
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
    if (type === 'whatsapp') {
        return (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                    fill="currentColor"
                    stroke="none"
                    d="M20.52 3.48A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.9 11.9 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.43-8.43ZM12.06 21.8a9.88 9.88 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.27c0-5.45 4.43-9.88 9.88-9.88a9.82 9.82 0 0 1 6.99 2.9 9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.43 9.89-9.88 9.89Zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.18.2-.35.23-.65.08-.3-.15-1.25-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z"
                />
            </svg>
        )
    }

    if (type === 'instagram') {
        return (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
            </svg>
        )
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m4 7 8 6 8-6" />
        </svg>
    )
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
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const controller = new AbortController()

        const loadBusinessInfo = async () => {
            try {
                setBusinessInfo(await getBusinessInfo(controller.signal))
            } catch (requestError) {
                if (!controller.signal.aborted) {
                    setError(getUserFacingError(requestError, 'Não foi possível carregar os contatos. Tente novamente mais tarde.'))
                }
            }
        }

        void loadBusinessInfo()
        return () => controller.abort()
    }, [])

    const whatsappNumber = businessInfo?.whatsappNumber ?? null
    const instagramAccount = businessInfo?.instagramAccount ?? null
    const businessEmail = businessInfo?.businessEmail ?? null

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

            {error && <p className="contact-section-error" role="alert">Erro ao carregar os contatos: {error}</p>}

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
            <div className="contact-section-action">
                <button type="button" onClick={() => { window.location.hash = '#/contato' }}>
                    Enviar mensagem
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                </button>
            </div>
        </section>
    )
}

export default ContactSection
