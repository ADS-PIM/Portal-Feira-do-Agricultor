import {IsNotEmpty, IsString, IsEmail, IsOptional, MaxLength} from 'class-validator'

export const BUSINESS_DESCRIPTION_MAX_LENGTH = 2000
export const BUSINESS_DESCRIPTION_TOO_LONG = 'O campo Sobre a feira ultrapassa o limite de 2.000 caracteres.'

export class BusinessInfoCreateDTO {
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    instagramAccount: string | null

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    whatsappNumber: string | null

    @IsOptional()
    @IsNotEmpty()
    @IsEmail()
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
    @IsOptional()
    @IsString()
    instagramAccount?: string | null

    @IsOptional()
    @IsString()
    whatsappNumber?: string | null

    @IsOptional()
    @IsEmail()
    businessEmail?: string | null

    @IsOptional()
    @IsString()
    businessHours?: string

    @IsOptional()
    @IsString()
    @MaxLength(BUSINESS_DESCRIPTION_MAX_LENGTH, { message: BUSINESS_DESCRIPTION_TOO_LONG })
    description?: string
}
