export const CONTACT_EMAIL_ERROR = 'Informe um e-mail válido, como nome@exemplo.com.'
export const CONTACT_PHONE_ERROR = 'Informe um telefone com DDD, como (88) 99999-9999.'
export const CONTACT_REVIEW_ERROR = 'Revise os campos indicados.'

export const CONTACT_VALIDATION_MESSAGES = {
  CONTACT_EMAIL_INVALID: CONTACT_EMAIL_ERROR,
  CONTACT_EMAIL_REQUIRED: 'Preencha este campo.',
  CONTACT_EMAIL_TOO_LONG: 'Use no máximo 254 caracteres no e-mail.',
  CONTACT_EMAIL_SPACES: 'Remova os espaços do e-mail.',
  CONTACT_EMAIL_MISSING_AT: 'Inclua o @ no e-mail, como nome@exemplo.com.',
  CONTACT_EMAIL_MULTIPLE_AT: 'Use apenas um @ no e-mail.',
  CONTACT_EMAIL_MISSING_NAME: 'Informe o nome antes do @.',
  CONTACT_EMAIL_NAME_TOO_LONG: 'Use no máximo 64 caracteres antes do @.',
  CONTACT_EMAIL_MISSING_DOMAIN: 'Informe o domínio após o @, como exemplo.com.',
  CONTACT_EMAIL_INCOMPLETE_DOMAIN: 'Complete o domínio do e-mail, como exemplo.com.',
  CONTACT_EMAIL_ACCENTS: 'Use letras sem acentos no e-mail.',
  CONTACT_EMAIL_START_DOT: 'O nome antes do @ não pode começar com ponto.',
  CONTACT_EMAIL_END_DOT: 'O nome antes do @ não pode terminar com ponto.',
  CONTACT_EMAIL_REPEATED_DOTS: 'Remova os pontos seguidos do e-mail.',
  CONTACT_EMAIL_DOMAIN: 'Confira o domínio após o @, como exemplo.com.',
  CONTACT_PHONE_INVALID: CONTACT_PHONE_ERROR,
  CONTACT_PHONE_CHARACTERS: 'Remova as letras e símbolos do telefone.',
  CONTACT_PHONE_COUNTRY: 'Use o código do Brasil (+55) ou informe apenas DDD e número.',
  CONTACT_PHONE_INCOMPLETE: 'Inclua o DDD e complete o telefone, como (88) 99999-9999.',
  CONTACT_PHONE_TOO_LONG: 'Use 10 ou 11 dígitos no telefone, incluindo o DDD.',
  CONTACT_PHONE_DDD: 'Informe um DDD válido, com dois dígitos.',
  CONTACT_PHONE_MOBILE: 'O celular deve começar com 9 após o DDD.',
  CONTACT_PHONE_LOCAL: 'Confira o número após o DDD. Para celular, inclua o 9 inicial.',
} as const

const error = (code: keyof typeof CONTACT_VALIDATION_MESSAGES) => ({ code, message: CONTACT_VALIDATION_MESSAGES[code] })
const emailPattern = /^[a-z\d!#$%&'*+/=?^_{|}~\x60-]+(?:\.[a-z\d!#$%&'*+/=?^_{|}~\x60-]+)*@(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i
const phonePattern = /^(?:\+?55 ?)?(?:\([1-9]\d\)|[1-9]\d) ?(?:[2-5]\d{3}|9\d{4})-?\d{4}$/

// Keep one applicable error per field; subsequent rules appear after correction.
export function getContactEmailValidation(value: unknown) {
  if (typeof value !== 'string') return error('CONTACT_EMAIL_INVALID')
  const email = value.trim()
  if (!email) return error('CONTACT_EMAIL_REQUIRED')
  if (email.length > 254) return error('CONTACT_EMAIL_TOO_LONG')
  if (/\s/.test(email)) return error('CONTACT_EMAIL_SPACES')
  const parts = email.split('@')
  if (parts.length === 1) return error('CONTACT_EMAIL_MISSING_AT')
  if (parts.length > 2) return error('CONTACT_EMAIL_MULTIPLE_AT')
  const [name, domain] = parts
  if (!name) return error('CONTACT_EMAIL_MISSING_NAME')
  if (name.length > 64) return error('CONTACT_EMAIL_NAME_TOO_LONG')
  if (!domain) return error('CONTACT_EMAIL_MISSING_DOMAIN')
  if (!domain.includes('.')) return error('CONTACT_EMAIL_INCOMPLETE_DOMAIN')
  if (/\p{M}/u.test(email.normalize('NFD'))) return error('CONTACT_EMAIL_ACCENTS')
  if (name.startsWith('.')) return error('CONTACT_EMAIL_START_DOT')
  if (name.endsWith('.')) return error('CONTACT_EMAIL_END_DOT')
  if (email.includes('..')) return error('CONTACT_EMAIL_REPEATED_DOTS')
  if (!/^(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i.test(domain)) return error('CONTACT_EMAIL_DOMAIN')
  return emailPattern.test(email) ? null : error('CONTACT_EMAIL_INVALID')
}

// Only strip a bare country code when its length or separator makes it explicit.
export function stripPhoneCountryCode(value: string): string {
  const phone = value.trim()
  if (phone.startsWith('+55')) return phone.replace(/^\+55\s*/, '')
  const digits = phone.replace(/\D/g, '')
  if ((digits.length === 12 || digits.length === 13) && phone.startsWith('55')) {
    return phone.replace(/^55\s*/, '')
  }
  return phone
}

export function getContactPhoneValidation(value: unknown) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') return error('CONTACT_PHONE_INVALID')
  const phone = value.trim()
  if (!phone) return null
  if (/[^0-9()+\s-]/.test(phone)) return error('CONTACT_PHONE_CHARACTERS')
  if (phone.includes('+') && !/^\+55(?:[ (]|\d)/.test(phone)) return error('CONTACT_PHONE_COUNTRY')
  const digits = stripPhoneCountryCode(phone).replace(/\D/g, '')
  if (digits.length < 10) return error('CONTACT_PHONE_INCOMPLETE')
  if (digits.length > 11 || phone.length > 20) return error('CONTACT_PHONE_TOO_LONG')
  if (digits.startsWith('0')) return error('CONTACT_PHONE_DDD')
  if (digits.length === 11 && digits[2] !== '9') return error('CONTACT_PHONE_MOBILE')
  if (digits.length === 10 && !/[2-5]/.test(digits[2])) return error('CONTACT_PHONE_LOCAL')
  return phonePattern.test(phone) ? null : error('CONTACT_PHONE_INVALID')
}

export function getContactEmailError(value: string): string {
  return getContactEmailValidation(value)?.message ?? ''
}

export function getContactPhoneError(value: string): string {
  return getContactPhoneValidation(value)?.message ?? ''
}
