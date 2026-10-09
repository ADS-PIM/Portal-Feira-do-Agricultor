import { useEffect, useState } from 'react'
import instituteLogo from '../../assets/instituto_brotar_logo_1.png'
import Icon from '../Icon'
import { getBusinessInfo, type BusinessInfo } from '../../services/businessInfoService'
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

const Footer = () => {
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

    const whatsappNumber = businessInfo?.whatsappNumber?.trim()
    const instagramAccount = businessInfo?.instagramAccount?.trim()
    const businessEmail = businessInfo?.businessEmail?.trim()
    const whatsappUrl = whatsappNumber ? getWhatsAppUrl(whatsappNumber) : null

    return (
        <footer className="site-footer">
            <div className="site-footer-main">
                <div className="site-footer-brand">
                    <a className="site-footer-brand-heading" href="#inicio">
                        <img src={instituteLogo} alt="Instituto Brotar" />
                    </a>
                    <p>
                        Fortalecendo o agricultor familiar de Tabuleiro do Norte - CE e levando
                        sustentabilidade para as mesas cearenses.
                    </p>
                    <nav className="site-footer-socials" aria-label="Redes sociais e contato">
                        {whatsappUrl && (
                            <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                                <SocialIcon name="whatsapp" />
                            </a>
                        )}
                        {instagramAccount && (
                            <a href={getInstagramUrl(instagramAccount)} target="_blank" rel="noreferrer" aria-label="Instagram">
                                <SocialIcon name="instagram" />
                            </a>
                        )}
                        {businessEmail && (
                            <a href={`mailto:${businessEmail}`} aria-label="E-mail">
                                <SocialIcon name="email" />
                            </a>
                        )}
                    </nav>
                    {error && <p className="site-footer-error" role="alert">Erro ao carregar contatos: {error}</p>}
                </div>

                <nav className="site-footer-links" aria-label="Links do rodapé">
                    <div>
                        <h2>Menu Rápido</h2>
                        <a href="#sobre">Sobre Nós</a>
                        <a href="#sobre">Nossos Agricultores</a>
                        <a href="#/calendario">Calendário de Eventos</a>
                    </div>
                    <div>
                        <h2>Serviços &amp; Links</h2>
                        <a href="#calculadora">Calculadora de Preço</a>
                        <span>Documentação</span>
                    </div>
                </nav>
            </div>

            <div className="site-footer-bottom">
                <p>Desenvolvido pela equipe Brotando Feiras — {new Date().getFullYear()}. Todos os direitos reservados.</p>
                <nav aria-label="Informações legais">
                    <span>Políticas de Privacidade</span>
                    <span>Termos de Uso</span>
                </nav>
            </div>
        </footer>
    )
}

export default Footer
