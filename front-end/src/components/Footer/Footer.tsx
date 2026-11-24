import { useEffect, useState } from 'react'
import instituteLogo from '../../assets/instituto_brotar_logo_footer.svg'
import Icon from '../Icon'
import { getBusinessInfo, subscribeBusinessInfoChanges, type BusinessInfo } from '../../services/businessInfoService'
import { getUserFacingError } from '../../services/errors'
import './Footer.css'

function getInstagramUrl(account: string): string {
    const normalizedAccount = account.trim()
    if (/^https?:\/\//i.test(normalizedAccount)) {
        return normalizedAccount
    }

    return `https://www.instagram.com/${normalizedAccount.replace(/^@/, '')}`
}

function getWhatsAppUrl(phoneNumber: string): string | null {
    const digits = phoneNumber.replace(/\D/g, '')
    const internationalDigits = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
    return internationalDigits ? `https://wa.me/${internationalDigits}` : null
}

function SocialIcon({ name }: { name: 'whatsapp' | 'instagram' | 'email' }) {
    return <Icon name={name} />
}

function ContactButton({ name, label, href }: { name: 'whatsapp' | 'instagram' | 'email'; label: string; href: string | null }) {
    const content = <SocialIcon name={name} />
    const className = `site-footer-contact-button home-page-action-button is-${name}`
    return href ? (
        <a className={className} href={href} aria-label={label} title={label}
            target={name === 'email' ? undefined : '_blank'} rel={name === 'email' ? undefined : 'noopener noreferrer'}>
            {content}
        </a>
    ) : <button className={className} type="button" disabled aria-label={label} title={`${label}: contato não cadastrado`}>{content}</button>
}

const Footer = () => {
    const [businessInfo, setBusinessInfo] = useState<Pick<BusinessInfo, 'whatsappNumber' | 'instagramAccount' | 'businessEmail'> | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const controller = new AbortController()

        const loadBusinessInfo = async () => {
            try {
                const info = await getBusinessInfo(controller.signal)
                if (!controller.signal.aborted) setBusinessInfo(info)
            } catch (requestError) {
                if (!controller.signal.aborted) {
                    setError(getUserFacingError(requestError, 'Não foi possível carregar os contatos. Tente novamente mais tarde.'))
                }
            }
        }

        const unsubscribe = subscribeBusinessInfoChanges(payload => {
            // A late initial read must not restore contacts removed by a successful save.
            controller.abort()
            setBusinessInfo(payload)
            setError(null)
        })
        void loadBusinessInfo()
        return () => { controller.abort(); unsubscribe() }
    }, [])

    const whatsappNumber = businessInfo?.whatsappNumber?.trim()
    const instagramAccount = businessInfo?.instagramAccount?.trim()
    const businessEmail = businessInfo?.businessEmail?.trim()
    const whatsappUrl = whatsappNumber ? getWhatsAppUrl(whatsappNumber) : null

    return (
        <footer className="site-footer">
            <div className="site-footer-main">
                <div className="site-footer-brand">
                    <a className="site-footer-brand-heading" href="/">
                        <img src={instituteLogo} alt="Instituto Brotar" width={1131} height={487} />
                    </a>
                    <p>
                        Fortalecendo o agricultor familiar de Tabuleiro do Norte - CE e levando
                        sustentabilidade para as mesas cearenses.
                    </p>
                </div>

                <div className="site-footer-navigation">
                    <nav className="site-footer-links" aria-label="Links do rodapé">
                        <div>
                            <h2>Menu Rápido</h2>
                            <a href="/sobre">Sobre Nós</a>
                            <a href="/produtores">Nossos Agricultores</a>
                            <a href="/calendario">Calendário de Eventos</a>
                            <a href="/calculadora">Calculadora de Preço</a>
                        </div>
                    </nav>
                    <section className="site-footer-contact" aria-labelledby="footer-social-title">
                        <h2 id="footer-social-title">Contato</h2>
                        <nav className="site-footer-socials" aria-label="Canais de contato">
                            <ContactButton name="whatsapp" label="WhatsApp" href={whatsappUrl} />
                            <ContactButton name="instagram" label="Instagram" href={instagramAccount ? getInstagramUrl(instagramAccount) : null} />
                            <ContactButton name="email" label="E-mail" href={businessEmail ? `mailto:${businessEmail}` : null} />
                        </nav>
                        {error && <p className="site-footer-error" role="status">Contatos indisponíveis no momento.</p>}
                    </section>
                </div>
            </div>

            <div className="site-footer-bottom">
                <p>Desenvolvido pela equipe Brotando Feiras — {new Date().getFullYear()}. Todos os direitos reservados.</p>
                <nav aria-label="Informações legais">
                    <a href="/politica-de-privacidade">Política de Privacidade</a>
                    <a href="/termos-de-uso">Termos de Uso</a>
                </nav>
            </div>
        </footer>
    )
}

export default Footer
