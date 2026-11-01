import { Transform } from 'class-transformer'
import {IsNotEmpty, IsString, IsEmail, IsOptional, MaxLength, Matches, ValidateBy} from 'class-validator'
import { getInstagramAccountError, INSTAGRAM_ERROR_MESSAGES, normalizeInstagramAccount } from '../util/instagramAccount'

export const BUSINESS_DESCRIPTION_MAX_LENGTH = 2000
export const BUSINESS_DESCRIPTION_TOO_LONG = 'O campo Sobre a feira ultrapassa o limite de 2.000 caracteres.'
export const BUSINESS_INSTAGRAM_ERROR = INSTAGRAM_ERROR_MESSAGES.BUSINESS_INSTAGRAM_INVALID
export const BUSINESS_WHATSAPP_ERROR = 'Informe um telefone com DDD, como (88) 99999-9999.'
export const BUSINESS_EMAIL_ERROR = 'Informe um e-mail válido, como nome@exemplo.com.'
const businessPhonePattern = /^(?:\+?55 ?)?(?:\([1-9]\d\)|[1-9]\d) ?(?:[2-5]\d{3}|9\d{4})-?\d{4}$/
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
    @MaxLength(20, { message: BUSINESS_WHATSAPP_ERROR })
    @Matches(businessPhonePattern, { message: BUSINESS_WHATSAPP_ERROR })
    whatsappNumber: string | null

    @Transform(optionalContact)
    @IsOptional()
    @IsNotEmpty()
    @IsEmail({}, { message: BUSINESS_EMAIL_ERROR })
    @MaxLength(254, { message: BUSINESS_EMAIL_ERROR })
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
    @MaxLength(20, { message: BUSINESS_WHATSAPP_ERROR })
    @Matches(businessPhonePattern, { message: BUSINESS_WHATSAPP_ERROR })
    whatsappNumber?: string | null

    @Transform(optionalContact)
    @IsOptional()
    @IsEmail({}, { message: BUSINESS_EMAIL_ERROR })
    @MaxLength(254, { message: BUSINESS_EMAIL_ERROR })
    businessEmail?: string | null

    @IsOptional()
    @IsString()
    businessHours?: string

    @IsOptional()
    @IsString()
    @MaxLength(BUSINESS_DESCRIPTION_MAX_LENGTH, { message: BUSINESS_DESCRIPTION_TOO_LONG })
    description?: string
}
