import { getContactPhoneError } from './contactValidation'

export const PHONE_PATTERN = String.raw`\([0-9]{2}\) [0-9]{4,5}\-[0-9]{4}`

export function formatPhoneInput(value: string): string | null {
  // Normalize pasted Brazilian country codes before applying the national mask.
  value = value.trim().replace(/^\+55\s*/, '')
  if (/[^0-9()\s-]/.test(value)) return null

  const digits = value.replace(/\D/g, '')
  if (digits.length > 11) return null
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`

  const local = digits.slice(2)
  const prefixLength = local.length > 8 ? 5 : 4
  const formattedLocal = local.length > prefixLength
    ? `${local.slice(0, prefixLength)}-${local.slice(prefixLength)}`
    : local

  return `(${digits.slice(0, 2)}) ${formattedLocal}`
}

export function isValidPhone(value: string): boolean {
  return getContactPhoneError(value) === ''
}
