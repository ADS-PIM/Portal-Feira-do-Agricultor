import {IsNotEmpty, IsString, IsEmail, IsOptional} from 'class-validator'

export class BusinessInfoCreateDTO {
    @IsNotEmpty()
    @IsString()
    instagramAccount: string

    @IsNotEmpty()
    @IsString()
    whatsappNumber: string

    @IsNotEmpty()
    @IsEmail()
    businessEmail: string

    @IsNotEmpty()
    @IsString()
    businessHours: string
}

export class BusinessInfoUpdateDTO {
    @IsOptional()
    @IsString()
    instagramAccount?: string

    @IsOptional()
    @IsString()
    whatsappNumber?: string

    @IsOptional()
    @IsEmail()
    businessEmail?: string

    @IsOptional()
    @IsString()
    businessHours?: string

}