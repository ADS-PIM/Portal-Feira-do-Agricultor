import { getContactPhoneError, stripPhoneCountryCode } from './contactValidation'

export const PHONE_PATTERN = String.raw`\([0-9]{2}\) [0-9]{4,5}\-[0-9]{4}`

export function formatPhoneInput(value: string): string | null {
  // Normalize pasted Brazilian country codes before applying the national mask.
  value = stripPhoneCountryCode(value)
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

export function applyPhoneInputMask(input: HTMLInputElement, previousValue: string, inputType?: string): string | null {
  const cursor = input.selectionStart ?? input.value.length
  let value = input.value
  let digitsBeforeCursor = value.slice(0, cursor).replace(/\D/g, '').length
  const previousDigits = previousValue.replace(/\D/g, '')

  // Deleting a mask separator also deletes the adjacent digit.
  if (inputType?.startsWith('delete') && value !== previousValue
    && value.replace(/\D/g, '') === previousDigits) {
    const index = inputType === 'deleteContentBackward' ? digitsBeforeCursor - 1 : digitsBeforeCursor
    if (index >= 0) {
      value = previousDigits.slice(0, index) + previousDigits.slice(index + 1)
      digitsBeforeCursor = index
    }
  }

  const formatted = formatPhoneInput(value)
  if (formatted === null) {
    input.value = previousValue
    return null
  }

  let position = 0
  let count = 0
  while (position < formatted.length && count < digitsBeforeCursor) {
    if (/\d/.test(formatted[position])) count += 1
    position += 1
  }
  requestAnimationFrame(() => input.setSelectionRange(position, position))
  return formatted
}
