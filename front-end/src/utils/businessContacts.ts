import { CONTACT_EMAIL_ERROR, getContactEmailError, getContactPhoneError } from './contactValidation'
import { getInstagramAccountError } from './instagramAccount'

export const BUSINESS_WHATSAPP_ERROR = 'Informe um telefone com DDD, como (88) 99999-9999.'
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
    // Public contact links also accept the Brazilian country code without '+'.
    if (whatsapp && (whatsapp.length > 20 || getContactPhoneError(whatsapp.replace(/^55(?=[ (]|\d{10,11}$)/, '+55')))) {
        errors.whatsappNumber = BUSINESS_WHATSAPP_ERROR
    }
    if (email && getContactEmailError(email)) errors.businessEmail = BUSINESS_EMAIL_ERROR
    return errors
}
