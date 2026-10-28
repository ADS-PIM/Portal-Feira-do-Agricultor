export const CONTACT_EMAIL_ERROR = 'Informe um e-mail válido, como nome@exemplo.com.'
export const CONTACT_PHONE_ERROR = 'Informe um telefone com DDD, como (88) 99999-9999 ou (88) 3333-4444.'

const emailPattern = /^[a-z\d!#$%&'*+/=?^_{|}~\x60-]+(?:\.[a-z\d!#$%&'*+/=?^_{|}~\x60-]+)*@(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i
// Accept landlines and mobile numbers, with optional formatting and country code.
const phonePattern = /^(?:\+55 ?)?(?:\([1-9]\d\)|[1-9]\d) ?(?:[2-5]\d{3}|9\d{4})-?\d{4}$/

export function getContactEmailError(value: string): string {
  const email = value.trim()
  return email.length <= 254 && email.split('@')[0].length <= 64 && emailPattern.test(email)
    ? ''
    : CONTACT_EMAIL_ERROR
}

export function getContactPhoneError(value: string): string {
  const phone = value.trim()
  return !phone || phonePattern.test(phone) ? '' : CONTACT_PHONE_ERROR
}
