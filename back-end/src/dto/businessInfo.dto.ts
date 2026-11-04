import { Transform } from 'class-transformer'
import {IsNotEmpty, IsString, IsOptional, MaxLength, ValidateBy} from 'class-validator'
import { getInstagramAccountError, INSTAGRAM_ERROR_MESSAGES, normalizeInstagramAccount } from '../util/instagramAccount'
import { CONTACT_EMAIL_ERROR, CONTACT_PHONE_ERROR } from '../util/contactValidation'
import { IsContact } from './contact.validator'

export const BUSINESS_DESCRIPTION_MAX_LENGTH = 2000
export const BUSINESS_DESCRIPTION_TOO_LONG = 'O campo Sobre a feira ultrapassa o limite de 2.000 caracteres.'
export const BUSINESS_INSTAGRAM_ERROR = INSTAGRAM_ERROR_MESSAGES.BUSINESS_INSTAGRAM_INVALID
export const BUSINESS_WHATSAPP_ERROR = CONTACT_PHONE_ERROR
export const BUSINESS_EMAIL_ERROR = CONTACT_EMAIL_ERROR
const optionalContact = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() || null : value
const optionalInstagram = ({ value }: { value: unknown }) => typeof value === 'string' ? normalizeInstagramAccount(value) || null : value
const IsInstagramAccount = () => ValidateBy({
    name: 'isInstagramAccount',
    validator: {
        validate: (value: unknown) => getInstagramAccountError(value) === null,
        defaultMessage: args => getInstagramAccountError(args?.value)?.message ?? BUSINESS_INSTAGRAM_ERROR,
    },
})

export class BusinessInfoCreateDTO {
    @Transform(optionalInstagram)
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @IsInstagramAccount()
    instagramAccount: string | null

    @Transform(optionalContact)
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @IsContact('phone')
    whatsappNumber: string | null

    @Transform(optionalContact)
    @IsOptional()
    @IsNotEmpty()
    @IsContact('email')
    businessEmail: string | null

    @IsNotEmpty()
    @IsString()
    businessHours: string

    @IsOptional()
    @IsString()
    @MaxLength(BUSINESS_DESCRIPTION_MAX_LENGTH, { message: BUSINESS_DESCRIPTION_TOO_LONG })
    description?: string
}

export class BusinessInfoUpdateDTO {
    @Transform(optionalInstagram)
    @IsOptional()
    @IsString()
    @IsInstagramAccount()
    instagramAccount?: string | null

    @Transform(optionalContact)
    @IsOptional()
    @IsString()
    @IsContact('phone')
    whatsappNumber?: string | null

    @Transform(optionalContact)
    @IsOptional()
    @IsContact('email')
    businessEmail?: string | null

    @IsOptional()
    @IsString()
    businessHours?: string

    @IsOptional()
    @IsString()
    @MaxLength(BUSINESS_DESCRIPTION_MAX_LENGTH, { message: BUSINESS_DESCRIPTION_TOO_LONG })
    description?: string
}
