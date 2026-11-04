import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import Icon from '../../components/Icon'
import ContactFieldError from '../../components/ContactFieldError/ContactFieldError'
import { getBusinessInfo, type BusinessInfo } from '../../services/businessInfoService'
import { ApiRequestError, getUserFacingError } from '../../services/errors'
import { createMessage, type MessageSubject } from '../../services/messageService'
import { getBusinessHoursLines } from '../../utils/businessHours'
import { CONTACT_EMAIL_ERROR, CONTACT_REVIEW_ERROR, getContactEmailError, getContactPhoneError } from '../../utils/contactValidation'
import './ContactUs.css'
import { PHONE_PATTERN } from '../../utils/phone';

type ContactFormState = {
  name: string
  email: string
  phone: string
  subject: MessageSubject | ''
  title: string
  message: string
}

const initialFormState: ContactFormState = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  title: '',
  message: '',
}

function ContactIcon({ type }: { type: 'whatsapp' | 'email' | 'instagram' }) {
  return <Icon name={type} />
}

const ContactUsPage = () => {
  const [formData, setFormData] = useState<ContactFormState>(initialFormState)
  const [touchedContacts, setTouchedContacts] = useState({ email: false, phone: false })
  const [serverContactErrors, setServerContactErrors] = useState<Partial<Record<'email' | 'phone', string>>>({})
  const emailError = touchedContacts.email ? getContactEmailError(formData.email) || serverContactErrors.email : ''
  const phoneError = touchedContacts.phone ? getContactPhoneError(formData.phone) || serverContactErrors.phone : ''
  const touchContact = (field: 'email' | 'phone') => setTouchedContacts(previous => ({ ...previous, [field]: true }))
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [hasContactError, setHasContactError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'idle' | 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadBusinessInfo = async () => {
      try {
        setBusinessInfo(await getBusinessInfo(controller.signal))
      } catch {
        if (!controller.signal.aborted) {
          setHasContactError(true)
        }
      }
    }

    void loadBusinessInfo()
    return () => controller.abort()
  }, [])

  const whatsappNumber = businessInfo?.whatsappNumber?.trim() || null
  const businessEmail = businessInfo?.businessEmail?.trim() || null
  const instagramAccount = businessInfo?.instagramAccount?.trim() || null
  const businessHours = getBusinessHoursLines(businessInfo?.businessHours)
  const unavailableMessage = 'Não disponível no momento'
  const contactLinks = [
    {
      label: 'Conversar no WhatsApp',
      value: whatsappNumber || unavailableMessage,
      href: whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}` : null,
      icon: 'whatsapp' as const,
    },
    {
      label: 'Enviar um E-mail',
      value: businessEmail || unavailableMessage,
      href: businessEmail ? `mailto:${businessEmail}` : null,
      icon: 'email' as const,
    },
    {
      label: 'Siga-nos no Instagram',
      value: instagramAccount || unavailableMessage,
      href: instagramAccount
        ? /^https?:\/\//i.test(instagramAccount)
          ? instagramAccount
          : `https://www.instagram.com/${instagramAccount.replace(/^@/, '')}`
        : null,
      icon: 'instagram' as const,
    },
  ]

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    if (name === 'email' || name === 'phone') {
      touchContact(name)
      setServerContactErrors(previous => ({ ...previous, [name]: undefined }))
    }
    setFormData((previous) => ({ ...previous, [name]: value }))
    if (submitFeedback) {
      setSubmitFeedback(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    setServerContactErrors({})
    setTouchedContacts({ email: true, phone: true })

    const trimmedName = formData.name.trim()
    const trimmedEmail = formData.email.trim()
    const trimmedPhone = formData.phone.trim()
    const trimmedTitle = formData.title.trim()
    const trimmedMessage = formData.message.trim()
    const selectedSubject = formData.subject

    const contactErrors = [
      { field: 'email', message: getContactEmailError(trimmedEmail) },
      { field: 'phone', message: getContactPhoneError(trimmedPhone) },
    ]
    for (const { field, message } of contactErrors) {
      const input = form.elements.namedItem(field) as HTMLInputElement
      if (message) {
        setSubmitFeedback({ type: 'error', message: CONTACT_REVIEW_ERROR })
        input.focus()
        return
      }
    }

    if (!trimmedName || !selectedSubject || !trimmedTitle || !trimmedMessage) {
      setSubmitFeedback({
        type: 'error',
        message: 'Preencha seu nome, assunto, título e mensagem antes de enviar.',
      })
      return
    }

    setIsLoading(true)
    setSubmitFeedback(null)

    try {
      await createMessage({
        name: trimmedName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        subject: selectedSubject,
        message: trimmedMessage,
        title: trimmedTitle,
      })

      setFormData(initialFormState)
      setTouchedContacts({ email: false, phone: false })
      setServerContactErrors({})
      setSubmitFeedback({
        type: 'success',
        message: 'Mensagem enviada com sucesso! Nossa equipe entrará em contato em breve.',
      })
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 400) {
        const field = error.code?.startsWith('CONTACT_EMAIL_') ? 'email'
          : error.code?.startsWith('CONTACT_PHONE_') ? 'phone' : null
        if (field) {
          setServerContactErrors({ [field]: error.message })
          setSubmitFeedback({ type: 'error', message: CONTACT_REVIEW_ERROR })
          const input = form.elements.namedItem(field)
          if (input instanceof HTMLElement) input.focus()
          return
        }
      }
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

              <form className="contact-form" onSubmit={handleSubmit} noValidate>
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
                  <div className="contact-field">
                    <label htmlFor="contact-email">E-mail</label>
                    <input
                      id="contact-email"
                      type="text"
                      inputMode="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onInvalid={(event) => event.currentTarget.setCustomValidity(CONTACT_EMAIL_ERROR)}
                      placeholder="seu-email@exemplo.com (Opicional)"
                      autoComplete="email"
                      maxLength={254}
                    />
                    <ContactFieldError id="contact-email-error" className="contact-field-error" message={emailError} />
                  </div>

                  <div className="contact-field">
                    <label htmlFor="contact-phone">Telefone</label>
                    <input
                      id="contact-phone"
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={() => touchContact('phone')}
                      aria-invalid={Boolean(phoneError)}
                      aria-describedby={phoneError ? 'contact-phone-error' : undefined}
                      autoComplete="tel-national"
                      pattern={PHONE_PATTERN}
                      title="Informe um telefone com DDD: (88) 3333-4444 ou (88) 99999-9999, sem letras."
                      placeholder="(88) 99999-9999 (Opicional)"
                    />
                    <ContactFieldError id="contact-phone-error" className="contact-field-error" message={phoneError} />
                  </div>
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
                  <span>Título</span>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Resuma o motivo do contato..."
                    maxLength={255}
                    required
                  />
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
              {hasContactError ? (
                <p className="contact-side-error" role="alert">Erro ao carregar contato</p>
              ) : (
                contactLinks.map(({ label, value, href, icon }) => {
                  const content = (
                    <>
                      <span className="contact-side-icon" aria-hidden="true">
                        <ContactIcon type={icon} />
                      </span>
                      <span className="contact-side-text">
                        <strong>{label}</strong>
                        <small>{value}</small>
                      </span>
                    </>
                  )

                  return href ? (
                    <a key={label} className="contact-side-item" href={href} target="_blank" rel="noreferrer">
                      {content}
                    </a>
                  ) : (
                    <div key={label} className="contact-side-item">
                      {content}
                    </div>
                  )
                })
              )}
              <section className="contact-side-hours" aria-labelledby="contact-side-hours-title">
                <h2 id="contact-side-hours-title">Horário de atendimento</h2>
                {businessHours.length ? (
                  <ul>
                    {businessHours.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                ) : (
                  <p>Horários não informados.</p>
                )}
              </section>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}

export default ContactUsPage
