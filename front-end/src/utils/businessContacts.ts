import { CONTACT_EMAIL_ERROR, CONTACT_PHONE_ERROR, getContactEmailError, getContactPhoneError } from './contactValidation'
import { getInstagramAccountError } from './instagramAccount'

export const BUSINESS_WHATSAPP_ERROR = CONTACT_PHONE_ERROR
export const BUSINESS_EMAIL_ERROR = CONTACT_EMAIL_ERROR

export type BusinessContactField = 'instagramAccount' | 'whatsappNumber' | 'businessEmail'
export type BusinessContactErrors = Partial<Record<BusinessContactField, string>>

export function getBusinessContactErrors(values: Record<BusinessContactField, string | null>): BusinessContactErrors {
    const errors: BusinessContactErrors = {}
    const instagram = values.instagramAccount?.trim()
    const whatsapp = values.whatsappNumber?.trim()
    const email = values.businessEmail?.trim()

    const instagramError = instagram ? getInstagramAccountError(instagram) : null
    if (instagramError) errors.instagramAccount = instagramError.message
    const phoneError = whatsapp ? getContactPhoneError(whatsapp) : ''
    const emailError = email ? getContactEmailError(email) : ''
    if (phoneError) errors.whatsappNumber = phoneError
    if (emailError) errors.businessEmail = emailError
    return errors
}
