import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import { getBusinessInfo, type BusinessInfo } from '../../services/businessInfoService'
import { getUserFacingError } from '../../services/errors'
import { createMessage, type MessageSubject } from '../../services/messageService'
import './ContactUs.css'

type ContactFormState = {
  name: string
  email: string
  phone: string
  subject: MessageSubject | ''
  message: string
}

const initialFormState: ContactFormState = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
}

const subjectLabelMap: Record<MessageSubject, string> = {
  DOUBT: 'Dúvida',
  SUGGESTION: 'Sugestão',
  COMPLAINT: 'Reclamação',
  PARTNERSHIP: 'Parceria',
  OTHER: 'Outros',
}

function ContactIcon({ type }: { type: 'whatsapp' | 'email' | 'instagram' }) {
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

  if (type === 'email') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

const ContactUsPage = () => {
  const [formData, setFormData] = useState<ContactFormState>(initialFormState)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'idle' | 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadBusinessInfo = async () => {
      try {
        setBusinessInfo(await getBusinessInfo(controller.signal))
      } catch (error) {
        if (!controller.signal.aborted) {
          setSubmitFeedback({
            type: 'error',
            message: getUserFacingError(error, 'Não foi possível carregar os contatos no momento.'),
          })
        }
      }
    }

    void loadBusinessInfo()
    return () => controller.abort()
  }, [])

  const contactLinks = [
    {
      label: 'Conversar no WhatsApp',
      value: businessInfo?.whatsappNumber || '(88) 99923-4567',
      href: businessInfo?.whatsappNumber ? `https://wa.me/${businessInfo.whatsappNumber.replace(/\D/g, '')}` : 'https://wa.me/5588999234567',
      icon: 'whatsapp' as const,
    },
    {
      label: 'Enviar um E-mail',
      value: businessInfo?.businessEmail || 'contato@brotandofeiras.org',
      href: businessInfo?.businessEmail ? `mailto:${businessInfo.businessEmail}` : 'mailto:contato@brotandofeiras.org',
      icon: 'email' as const,
    },
    {
      label: 'Siga-nos no Instagram',
      value: businessInfo?.instagramAccount || '@brotandofeiras',
      href: businessInfo?.instagramAccount
        ? /^https?:\/\//i.test(businessInfo.instagramAccount)
          ? businessInfo.instagramAccount
          : `https://www.instagram.com/${businessInfo.instagramAccount.replace(/^@/, '')}`
        : 'https://www.instagram.com/brotandofeiras',
      icon: 'instagram' as const,
    },
  ]

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
    if (submitFeedback) {
      setSubmitFeedback(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = formData.name.trim()
    const trimmedEmail = formData.email.trim()
    const trimmedPhone = formData.phone.trim()
    const trimmedMessage = formData.message.trim()
    const selectedSubject = formData.subject

    if (!trimmedName || !trimmedEmail || !selectedSubject || !trimmedMessage) {
      setSubmitFeedback({
        type: 'error',
        message: 'Preencha seu nome, e-mail, assunto e mensagem antes de enviar.',
      })
      return
    }

    setIsLoading(true)
    setSubmitFeedback(null)

    try {
      await createMessage({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        subject: selectedSubject,
        message: trimmedMessage,
        title: `Contato - ${subjectLabelMap[selectedSubject]}`,
      })

      setFormData(initialFormState)
      setSubmitFeedback({
        type: 'success',
        message: 'Mensagem enviada com sucesso! Nossa equipe entrará em contato em breve.',
      })
    } catch (error) {
      setSubmitFeedback({
        type: 'error',
        message: getUserFacingError(error, 'Não foi possível enviar sua mensagem. Tente novamente mais tarde.'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header initialActiveLink="#contato" />

      <main className="contact-page">
        <div className="contact-page-shell">
          <header className="contact-page-header">
            <h1>Fale Conosco</h1>
            <p>
              Ficou com alguma dúvida, quer saber como expor seus produtos orgânicos ou apoiar a
              agricultura familiar local? Entre em contato com a equipe organizadora.
            </p>
          </header>

          <div className="contact-page-content">
            <section className="contact-form-panel" aria-labelledby="contact-page-form-title">
              <h2 id="contact-page-form-title">Envie uma Mensagem</h2>

              <form className="contact-form" onSubmit={handleSubmit}>
                <label className="contact-field">
                  <span>Nome Completo</span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Digite seu nome..."
                    required
                  />
                </label>

                <div className="contact-row">
                  <label className="contact-field">
                    <span>E-mail</span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="seu-email@exemplo.com"
                      required
                    />
                  </label>

                  <label className="contact-field">
                    <span>Telefone</span>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(88) 99999-9999"
                    />
                  </label>
                </div>

                <label className="contact-field">
                  <span>Assunto</span>
                  <select name="subject" value={formData.subject} onChange={handleChange} required>
                    <option value="">Selecione uma opção...</option>
                    <option value="DOUBT">Dúvida</option>
                    <option value="SUGGESTION">Sugestão</option>
                    <option value="PARTNERSHIP">Parceria</option>
                    <option value="COMPLAINT">Reclamação</option>
                    <option value="OTHER">Outros</option>
                  </select>
                </label>

                <label className="contact-field">
                  <span>Sua Mensagem</span>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Escreva como podemos ajudar ou qual a sua dúvida..."
                    rows={6}
                    required
                  />
                </label>

                {submitFeedback && (
                  <p className={`contact-form-feedback ${submitFeedback.type}`} role="status" aria-live="polite">
                    {submitFeedback.message}
                  </p>
                )}

                <button type="submit" className="contact-submit-button" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </form>
            </section>

            <aside className="contact-side-panel" aria-label="Contatos e redes sociais">
              {contactLinks.map(({ label, value, href, icon }) => (
                <a key={label} className="contact-side-item" href={href} target="_blank" rel="noreferrer">
                  <span className="contact-side-icon" aria-hidden="true">
                    <ContactIcon type={icon} />
                  </span>
                  <span className="contact-side-text">
                    <strong>{label}</strong>
                    <small>{value}</small>
                  </span>
                </a>
              ))}
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}

export default ContactUsPage
