import {IsNotEmpty, IsString, IsEmail, IsOptional} from 'class-validator'

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
    description?: string
}