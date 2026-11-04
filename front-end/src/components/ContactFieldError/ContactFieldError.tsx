import './ContactFieldError.css'

type ContactFieldErrorProps = {
  id: string
  message?: string
  className?: string
}

export default function ContactFieldError({ id, message, className }: ContactFieldErrorProps) {
  if (!message) return null
  return (
    <p id={id} className={['contact-validation-error', className].filter(Boolean).join(' ')} role="alert">
      {message}
    </p>
  )
}
